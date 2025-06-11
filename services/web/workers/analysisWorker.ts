#!/usr/bin/env bun
// scripts/analysisWorker.ts

import {
  SQSClient,
  ReceiveMessageCommand,
  DeleteMessageCommand,
} from '@aws-sdk/client-sqs';
import { getSupabase } from '~/lib/services/DatabaseService';
import { trackAnalysisRepository } from '~/lib/repositories/TrackAnalysisRepository';
import { TrackAnalysisAttemptsRepository } from '~/lib/repositories/TrackAnalysisAttemptsRepository';
import { providerKeysRepository } from '~/lib/repositories/ProviderKeysRepository';
import { analysisJobRepository } from '~/lib/repositories/AnalysisJobRepository';
import { jobPersistenceService } from '~/lib/services/JobPersistenceService';
import { DefaultSongAnalysisService } from '~/lib/services/analysis/SongAnalysisService';
import { DefaultLyricsService } from '~/lib/services/lyrics/LyricsService';
import { LlmProviderManager, LlmProviderName } from '~/lib/services/llm/LlmProviderManager';
import type { AnalysisJobPayload } from '~/lib/services/queue/SQSService';
import type { TrackAnalysisInsert } from '~/lib/models/TrackAnalysis';
import { logger } from '~/lib/logging/Logger';
import { Json } from '~/types/database.types';
import { fetch } from 'bun';

const AWS_REGION = process.env.AWS_REGION;
const AWS_SQS_QUEUE_URL = process.env.AWS_SQS_QUEUE_URL;
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;

const WEBSOCKET_SERVER_URL = process.env.WEBSOCKET_SERVER_URL || 'http://localhost:3001';

const GENIUS_API_KEY = process.env.GENIUS_CLIENT_TOKEN;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

if (!AWS_REGION || !AWS_SQS_QUEUE_URL || !AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
  logger.error('FATAL: Missing AWS SQS configuration in environment variables. Worker cannot start.');
  process.exit(1);
}

/**
 * Sends a status update to the WebSocket server
 */
async function notifyStatusChange(jobId: string, trackId: number, status: string, progress?: number, error?: string) {
  try {
    const notification = {
      jobId,
      trackId,
      status,
      progress,
      error,
      timestamp: new Date().toISOString()
    };

    logger.debug(`Sending status update to WebSocket server: ${JSON.stringify(notification)}`);

    const response = await fetch(`${WEBSOCKET_SERVER_URL}/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(notification)
    });

    if (!response.ok) {
      logger.warn(`Failed to notify WebSocket server: ${response.status} ${response.statusText}`);
    } else {
      logger.debug('Successfully notified WebSocket server');
    }
  } catch (error) {
    logger.error(`Error notifying WebSocket server: ${error}`);
  }
}

if (!GENIUS_API_KEY) {
  logger.warn('Warning: GENIUS_API_KEY is not set. Lyrics service might fail.');
}
if (!GOOGLE_API_KEY) {
  logger.warn('Warning: GOOGLE_API_KEY is not set. LLM provider might fail.');
}

const sqsClient = new SQSClient({
  region: AWS_REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
  },
});

const main = async () => {
  logger.info('Starting analysis worker...');

  const trackAnalysisAttemptsRepository = new TrackAnalysisAttemptsRepository();
  const lyricsService = new DefaultLyricsService({ accessToken: GENIUS_API_KEY || '' });

  logger.info('Analysis worker configuration:', {
    queueUrl: AWS_SQS_QUEUE_URL,
    region: AWS_REGION
  });

  while (true) {
    try {
      const receiveMessageCommand = new ReceiveMessageCommand({
        QueueUrl: AWS_SQS_QUEUE_URL,
        MaxNumberOfMessages: 1,      // Process one message at a time
        WaitTimeSeconds: 20,          // Long-polling for FIFO queue
        MessageAttributeNames: ['All'],
        VisibilityTimeout: 60,        // Time before message becomes visible again
      });

      logger.debug('Polling for messages...');
      const { Messages } = await sqsClient.send(receiveMessageCommand);

      if (!Messages?.length) {
        logger.debug('No messages received in this polling cycle.');
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }

      const message = Messages[0];
      logger.info(`Received message ID: ${message.MessageId}`);

      if (!message.Body) {
        logger.warn(`Message ${message.MessageId} has no body. Deleting.`);
        await deleteSqsMessage(message.ReceiptHandle);
        continue;
      }

      let jobPayload: AnalysisJobPayload;
      try {
        jobPayload = JSON.parse(message.Body);
      } catch (parseError) {
        logger.error(`Failed to parse message body for ID ${message.MessageId}. Error: ${parseError}. Deleting.`);
        await deleteSqsMessage(message.ReceiptHandle);
        continue;
      }

      const { trackId: jobTrackIdString, artist, title, userId, batchId } = jobPayload;
      const trackId = parseInt(jobTrackIdString, 10);

      if (isNaN(trackId)) {
        logger.error(`Invalid trackId format in SQS message: ${jobTrackIdString}. Deleting message.`);
        await deleteSqsMessage(message.ReceiptHandle);
        continue;
      }

      logger.info(`Processing job for trackId: ${trackId}, Artist: ${artist}, Title: ${title}, UserId: ${userId}`);

      // Notify that analysis is queued
      await notifyStatusChange(batchId || message.MessageId || '', trackId, 'QUEUED');


      try {
        const existingAnalysis = await trackAnalysisRepository.getByTrackId(trackId);
        const existingAttempts = await trackAnalysisAttemptsRepository.getAttemptsByTrackId(trackId);
        if (existingAnalysis || existingAttempts.length > 0) {
          logger.info(`Analysis already exists for trackId ${trackId}. Skipping.`);
          // Send FAILED status for skipped tracks so they count towards failed tracks in UI
          await notifyStatusChange(batchId || message.MessageId || '', trackId, 'FAILED', undefined, 'Analysis already exists - skipped');
          await deleteSqsMessage(message.ReceiptHandle);
          continue;
        }
      } catch (error) {
        logger.error(`Failed to query existing analysis for trackId ${trackId}. Error: ${error}. Proceeding with analysis.`);
      }


      let providerName: LlmProviderName = 'google';
      let apiKey = GOOGLE_API_KEY || '';

      try {
        const userProviderPref = await providerKeysRepository.getUserProviderPreference(userId);

        if (userProviderPref?.active_provider) {
          providerName = userProviderPref.active_provider as LlmProviderName;
          logger.info(`Using user's preferred provider: ${providerName}`);

          const providerKey = await providerKeysRepository.getByUserIdAndProvider(userId, providerName);

          if (providerKey) {
            // In production, decrypt the key here
            logger.info(`Found API key for provider: ${providerName}`);
            if (providerName === 'google') apiKey = GOOGLE_API_KEY || '';
          } else {
            logger.warn(`No API key found for provider: ${providerName}, falling back to default`);
          }
        } else {
          logger.info(`No preferred provider found for user ${userId}, using default: ${providerName}`);
        }
      } catch (error) {
        logger.error(`Error fetching user preferences: ${error}. Using default provider.`);
      }

      const llmProviderManager = new LlmProviderManager(providerName, apiKey);
      const songAnalysisService = new DefaultSongAnalysisService(lyricsService, llmProviderManager);

      try {
        if (!artist || !title) {
          const errorMsg = `Missing artist or title for trackId ${trackId}. Cannot analyze. Artist: [${artist}], Title: [${title}]`;

          try {
            await trackAnalysisAttemptsRepository.createAttempt({
              track_id: trackId,
              job_id: batchId || message.MessageId || '',
              status: 'FAILED',
              error_type: 'MISSING_ARTIST_TITLE',
              error_message: errorMsg,
            });

            await notifyStatusChange(batchId || message.MessageId || '', trackId, 'FAILED', undefined, 'Missing artist or title information');
          } catch (attemptError) {
            logger.warn(`Could not create failure record for trackId ${trackId}, may already exist: ${attemptError}`);
            // Try to update existing attempt instead
            try {
              const existingAttempt = await trackAnalysisAttemptsRepository.getLatestAttemptForTrack(trackId);
              if (existingAttempt) {
                await trackAnalysisAttemptsRepository.markAttemptAsFailed(
                  existingAttempt.id,
                  'MISSING_ARTIST_TITLE',
                  errorMsg
                );
                logger.info(`Updated existing attempt record ID: ${existingAttempt.id} for trackId: ${trackId}`);
              }
            } catch (updateError) {
              logger.error(`Failed to update existing attempt for trackId ${trackId}: ${updateError}`);
            }
          }

          await deleteSqsMessage(message.ReceiptHandle);
          logger.info(`Deleted SQS message for trackId ${trackId} due to missing artist/title.`);
          continue;
        }

        // Check for existing attempt and use it or create a new one
        let attemptRecord;
        try {
          attemptRecord = await trackAnalysisAttemptsRepository.createAttempt({
            track_id: trackId,
            job_id: batchId || message.MessageId || '',
            status: 'IN_PROGRESS',
          });

          // Notify that analysis has started
          await notifyStatusChange(batchId || message.MessageId || '', trackId, 'IN_PROGRESS', 0);
        } catch (createError) {
          // If we can't create a new attempt, try to find and update an existing one
          logger.warn(`Could not create attempt record for trackId ${trackId}, may already exist: ${createError}`);
          const existingAttempt = await trackAnalysisAttemptsRepository.getLatestAttemptForTrack(trackId);
          if (existingAttempt) {
            // Update the existing attempt to IN_PROGRESS
            attemptRecord = await trackAnalysisAttemptsRepository.updateAttempt(
              existingAttempt.id,
              { status: 'IN_PROGRESS', updated_at: new Date().toISOString() }
            );
            logger.info(`Updated existing attempt record ID: ${existingAttempt.id} for trackId: ${trackId}`);
          } else {
            // This shouldn't happen, but just in case
            logger.error(`Cannot find or create attempt record for trackId ${trackId}`);
            await deleteSqsMessage(message.ReceiptHandle);
            continue;
          }
        }

        logger.info(`Created analysis attempt record ID: ${attemptRecord.id} for trackId: ${trackId}`);

        const analysisResultString = await songAnalysisService.analyzeSong(artist, title);
        const { model, analysis } = JSON.parse(analysisResultString) as { model: string, analysis: Json };

        logger.info(`Successfully analyzed trackId: ${trackId}. Model: ${model}`);

        // Store analysis results
        const analysisData: TrackAnalysisInsert = {
          track_id: trackId,
          model_name: model,
          analysis,
          version: 1
        };
        await trackAnalysisRepository.insertAnalysis(analysisData);

        // todo: review this
        // Cleanup: Remove the attempt record after successful analysis
        // At this point, the analysis data is already saved in the analysis table
        try {
          await trackAnalysisAttemptsRepository.deleteAttempt(attemptRecord.id);
          logger.info(`Deleted attempt record ID: ${attemptRecord.id} after successful analysis`);
        } catch (error) {
          logger.warn(`Failed to delete attempt record ID: ${attemptRecord.id}, but analysis was successful`);
        }

        // Notify that analysis completed successfully
        await notifyStatusChange(batchId || message.MessageId || '', trackId, 'COMPLETED', 100);

        // Update job progress in database
        if (batchId) {
          try {
            const job = await analysisJobRepository.getJobByBatchId(batchId);
            if (job) {
              const newProcessedCount = job.tracks_processed + 1;
              const newSucceededCount = job.tracks_succeeded + 1;

              logger.info(`Updating job progress: ${batchId}, processed: ${job.tracks_processed} → ${newProcessedCount}, succeeded: ${job.tracks_succeeded} → ${newSucceededCount}`);

              const updatedJob = await analysisJobRepository.updateJobProgress(
                batchId,
                newProcessedCount,
                newSucceededCount,
                job.tracks_failed
              );

              logger.info(`Job progress updated successfully. New state: processed=${updatedJob.tracks_processed}, succeeded=${updatedJob.tracks_succeeded}, failed=${updatedJob.tracks_failed}`);

              // Check if job is complete
              if (newProcessedCount >= job.track_count) {
                logger.info(`Job ${batchId} is complete: ${newProcessedCount}/${job.track_count} tracks processed`);
                await jobPersistenceService.markJobCompleted(batchId);
                logger.info(`Job marked as completed successfully`);

                // Send job completion notification
                try {
                  const completionNotification = {
                    type: 'job_completed',
                    jobId: batchId,
                    status: 'completed' as const,
                    stats: {
                      totalTracks: job.track_count,
                      tracksProcessed: newProcessedCount,
                      tracksSucceeded: newSucceededCount,
                      tracksFailed: updatedJob.tracks_failed
                    },
                    timestamp: new Date().toISOString()
                  };

                  logger.info(`Sending job completion notification: ${JSON.stringify(completionNotification)}`);

                  const response = await fetch(`${WEBSOCKET_SERVER_URL}/notify`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(completionNotification)
                  });

                  if (!response.ok) {
                    logger.warn(`Failed to send job completion notification: ${response.status} ${response.statusText}`);
                  } else {
                    logger.info('Successfully sent job completion notification');
                  }
                } catch (error) {
                  logger.error(`Error sending job completion notification: ${error}`);
                }
              }
            } else {
              logger.error(`Could not find job with batchId: ${batchId}`);
            }
          } catch (error) {
            logger.error(`Failed to update job progress for successful track ${trackId}:`, error);
          }
        }

        logger.info(`Analysis completed for trackId: ${trackId}`);
        await deleteSqsMessage(message.ReceiptHandle);
        logger.info(`Successfully processed and deleted message for trackId: ${trackId}`);

      } catch (error) {
        logger.error(`Error analyzing trackId ${trackId}: ${error}`);

        try {
          // Try to find an existing attempt first
          const existingAttempt = await trackAnalysisAttemptsRepository.getLatestAttemptForTrack(trackId);

          if (existingAttempt) {
            // Update the existing attempt with failure information
            await trackAnalysisAttemptsRepository.markAttemptAsFailed(
              existingAttempt.id,
              'ANALYSIS_ERROR',
              error instanceof Error ? error.message : String(error)
            );
            logger.info(`Updated existing attempt record ID: ${existingAttempt.id} with failure for trackId: ${trackId}`);
          } else {
            // Create a new attempt record if none exists
            await trackAnalysisAttemptsRepository.createAttempt({
              track_id: trackId,
              job_id: batchId || message.MessageId || '',
              status: 'FAILED',
              error_type: 'ANALYSIS_ERROR',
              error_message: error instanceof Error ? error.message : String(error),
            });
            logger.info(`Created new failure record for trackId: ${trackId}`);
          }
        } catch (attemptError) {
          logger.error(`Failed to record error for trackId ${trackId}: ${attemptError}`);
        }

        // Notify that analysis failed
        await notifyStatusChange(batchId || message.MessageId || '', trackId, 'FAILED', undefined, error instanceof Error ? error.message : String(error));

        // Update job progress in database for failed track
        if (batchId) {
          try {
            const job = await analysisJobRepository.getJobByBatchId(batchId);
            if (job) {
              const newProcessedCount = job.tracks_processed + 1;
              const newFailedCount = job.tracks_failed + 1;

              logger.info(`Updating job progress (FAILED): ${batchId}, processed: ${job.tracks_processed} → ${newProcessedCount}, failed: ${job.tracks_failed} → ${newFailedCount}`);

              const updatedJob = await analysisJobRepository.updateJobProgress(
                batchId,
                newProcessedCount,
                job.tracks_succeeded,
                newFailedCount
              );

              logger.info(`Job progress updated successfully (FAILED). New state: processed=${updatedJob.tracks_processed}, succeeded=${updatedJob.tracks_succeeded}, failed=${updatedJob.tracks_failed}`);

              // Check if job is complete
              if (newProcessedCount >= job.track_count) {
                logger.info(`Job ${batchId} is complete: ${newProcessedCount}/${job.track_count} tracks processed`);
                await jobPersistenceService.markJobCompleted(batchId);
                logger.info(`Job marked as completed successfully`);

                // Send job completion notification
                try {
                  const completionNotification = {
                    type: 'job_completed',
                    jobId: batchId,
                    status: 'completed' as const,
                    stats: {
                      totalTracks: job.track_count,
                      tracksProcessed: newProcessedCount,
                      tracksSucceeded: job.tracks_succeeded,
                      tracksFailed: newFailedCount
                    },
                    timestamp: new Date().toISOString()
                  };

                  logger.info(`Sending job completion notification: ${JSON.stringify(completionNotification)}`);

                  const response = await fetch(`${WEBSOCKET_SERVER_URL}/notify`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(completionNotification)
                  });

                  if (!response.ok) {
                    logger.warn(`Failed to send job completion notification: ${response.status} ${response.statusText}`);
                  } else {
                    logger.info('Successfully sent job completion notification');
                  }
                } catch (error) {
                  logger.error(`Error sending job completion notification: ${error}`);
                }
              }
            } else {
              logger.error(`Could not find job with batchId: ${batchId}`);
            }
          } catch (error) {
            logger.error(`Failed to update job progress for failed track ${trackId}:`, error);
          }
        }

        // Delete the message to prevent infinite retries
        await deleteSqsMessage(message.ReceiptHandle);
        logger.info(`Deleted failed message for trackId ${trackId} to prevent retry loop`);
      }
    } catch (sqsError: any) {
      logger.error(`SQS polling error: ${sqsError.message || sqsError}. Retrying after delay...`);
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5s before retrying
    }
  }
};;

const deleteSqsMessage = async (receiptHandle?: string) => {
  if (!receiptHandle) {
    logger.warn('Attempted to delete SQS message without ReceiptHandle.');
    return;
  }
  try {
    await sqsClient.send(new DeleteMessageCommand({
      QueueUrl: AWS_SQS_QUEUE_URL!, // Already checked for existence
      ReceiptHandle: receiptHandle,
    }));
  } catch (deleteError: any) {
    logger.error(`Failed to delete SQS message (Receipt: ${receiptHandle}): ${deleteError.message || deleteError}`);
  }
};

process.on('SIGINT', () => {
  logger.info('SIGINT received. Shutting down worker...');
  // Perform any cleanup here
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down worker...');
  // Perform any cleanup here
  process.exit(0);
});

main().catch(err => {
  logger.error('Worker script encountered a fatal error and crashed:', err);
  process.exit(1);
});