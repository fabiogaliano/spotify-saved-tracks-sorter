#!/usr/bin/env bun
// scripts/analysisWorkerBatch.ts

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
import { BatchSongAnalysisService, BatchAnalysisResult } from '~/lib/services/analysis/BatchSongAnalysisService';
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

// Batch processing configuration
const BATCH_SIZE = Number(process.env.ANALYSIS_BATCH_SIZE) || 5;
const MAX_MESSAGES_PER_POLL = Math.min(BATCH_SIZE, 10); // SQS max is 10

if (!AWS_REGION || !AWS_SQS_QUEUE_URL || !AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
  logger.error('FATAL: Missing AWS SQS configuration in environment variables. Worker cannot start.');
  process.exit(1);
}

// Validate batch size
if (![1, 5, 10].includes(BATCH_SIZE)) {
  logger.warn(`Invalid ANALYSIS_BATCH_SIZE: ${BATCH_SIZE}. Using default: 5`);
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

    await fetch(`${WEBSOCKET_SERVER_URL}/notify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(notification),
    });
  } catch (error) {
    logger.error(`Failed to send WebSocket notification: ${error}`);
  }
}

/**
 * Sends batch progress update to the WebSocket server
 */
async function notifyBatchProgress(jobId: string, completed: number, total: number) {
  try {
    const notification = {
      jobId,
      type: 'BATCH_PROGRESS',
      completed,
      total,
      timestamp: new Date().toISOString()
    };

    await fetch(`${WEBSOCKET_SERVER_URL}/notify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(notification),
    });
  } catch (error) {
    logger.error(`Failed to send batch progress notification: ${error}`);
  }
}

const sqsClient = new SQSClient({
  region: AWS_REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
  },
});

// Initialize repositories without passing getSupabase()
const trackAnalysisAttemptsRepository = new TrackAnalysisAttemptsRepository();
const lyricsService = new DefaultLyricsService({ accessToken: GENIUS_API_KEY || '' });

async function deleteSqsMessage(receiptHandle: string | undefined) {
  if (!receiptHandle) {
    logger.warn('No receipt handle provided. Cannot delete SQS message.');
    return;
  }

  try {
    await sqsClient.send(
      new DeleteMessageCommand({
        QueueUrl: AWS_SQS_QUEUE_URL,
        ReceiptHandle: receiptHandle,
      })
    );
  } catch (error) {
    logger.error(`Failed to delete SQS message: ${error}`);
  }
}

async function processMessages() {
  while (true) {
    try {
      // Receive multiple messages at once
      const receiveMessageCommand = new ReceiveMessageCommand({
        QueueUrl: AWS_SQS_QUEUE_URL,
        MaxNumberOfMessages: MAX_MESSAGES_PER_POLL,
        WaitTimeSeconds: 20,
        MessageAttributeNames: ['All'],
        VisibilityTimeout: 300, // 5 minutes for batch processing
      });

      logger.debug('Polling for messages...');
      const { Messages } = await sqsClient.send(receiveMessageCommand);

      if (!Messages || Messages.length === 0) {
        logger.debug('No messages received in this polling cycle.');
        continue;
      }

      logger.info(`Received ${Messages.length} messages for batch processing`);

      // Group messages by batch ID
      const messagesByBatch = new Map<string, typeof Messages>();

      for (const message of Messages) {
        if (!message.Body) continue;

        try {
          const payload = JSON.parse(message.Body) as AnalysisJobPayload;
          const batchId = payload.batchId || 'default';

          if (!messagesByBatch.has(batchId)) {
            messagesByBatch.set(batchId, []);
          }
          messagesByBatch.get(batchId)!.push(message);
        } catch (error) {
          logger.error(`Failed to parse message body: ${error}`);
          await deleteSqsMessage(message.ReceiptHandle);
        }
      }

      // Process each batch
      for (const [batchId, batchMessages] of messagesByBatch) {
        await processBatch(batchId, batchMessages);
      }

    } catch (error) {
      logger.error(`Error in message processing loop: ${error}`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

async function processBatch(batchId: string, messages: any[]) {
  logger.info(`Processing batch ${batchId} with ${messages.length} tracks`);

  // Extract track info from messages
  const tracks = [];
  const messageMap = new Map<string, any>();

  for (const message of messages) {
    try {
      const payload = JSON.parse(message.Body) as AnalysisJobPayload;
      const { trackId, artist, title, userId } = payload;

      tracks.push({ trackId: String(trackId), artist, song: title });
      messageMap.set(String(trackId), { message, payload });
    } catch (error) {
      logger.error(`Failed to process message: ${error}`);
      await deleteSqsMessage(message.ReceiptHandle);
    }
  }

  if (tracks.length === 0) return;

  // Get user preferences and batch size from first message
  const firstPayload = messageMap.values().next().value.payload;
  const firstUserId = firstPayload.userId;
  const payloadBatchSize = firstPayload.batchSize;

  // Use batch size from payload if available, otherwise use environment variable
  const effectiveBatchSize = payloadBatchSize || BATCH_SIZE;
  logger.info(`Using batch size: ${effectiveBatchSize} (from ${payloadBatchSize ? 'payload' : 'environment'})`);

  let providerName: LlmProviderName = 'google';
  let apiKey = GOOGLE_API_KEY || '';

  try {
    const userProviderPref = await providerKeysRepository.getUserProviderPreference(firstUserId);
    if (userProviderPref?.active_provider) {
      providerName = userProviderPref.active_provider as LlmProviderName;
      logger.info(`Using user's preferred provider: ${providerName}`);
      // In production, get the actual API key
      if (providerName === 'google') apiKey = GOOGLE_API_KEY || '';
    }
  } catch (error) {
    logger.error(`Error fetching user preferences: ${error}. Using default provider.`);
  }

  const llmProviderManager = new LlmProviderManager(providerName, apiKey);
  const batchAnalysisService = new BatchSongAnalysisService(lyricsService, llmProviderManager);

  // Send batch notification for all tracks at once
  const trackIds = tracks.map(t => Number(t.trackId));
  try {
    await fetch(`${WEBSOCKET_SERVER_URL}/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'batch_tracks_queued',
        jobId: batchId,
        trackIds,
        status: 'QUEUED',
        timestamp: new Date().toISOString()
      })
    });
  } catch (error) {
    logger.error(`Failed to send batch queued notification: ${error}`);
  }

  // Process batch with progress updates
  const results = await batchAnalysisService.analyzeBatchWithRetry(tracks, {
    batchSize: effectiveBatchSize as 1 | 5 | 10,
    maxRetries: 1,
    onProgress: async (completed, total) => {
      await notifyBatchProgress(batchId, completed, total);
    }
  });

  // Process results
  for (const result of results) {
    const { message, payload } = messageMap.get(result.trackId)!;
    const trackId = Number(result.trackId);

    if (result.success && result.analysis) {
      try {
        // Parse analysis
        const analysisData = JSON.parse(result.analysis);
        const currentModel = analysisData.model || llmProviderManager.getCurrentModel();
        const validatedAnalysis = analysisData.analysis;

        // Save to database
        const trackAnalysisData: TrackAnalysisInsert = {
          track_id: trackId,
          model_name: currentModel,
          analysis: validatedAnalysis as Json,
          version: 1,
        };

        await trackAnalysisRepository.insertAnalysis(trackAnalysisData);
        logger.info(`Analysis saved for trackId ${trackId}`);

        // todo: review this
        // Cleanup: Remove the attempt record after successful analysis
        // At this point, the analysis data is already saved in the analysis table
        const attemptRecord = await trackAnalysisAttemptsRepository.getLatestAttemptForTrack(trackId);
        if (attemptRecord) {
          try {
            await trackAnalysisAttemptsRepository.deleteAttempt(attemptRecord.id);
            logger.info(`Deleted attempt record ID: ${attemptRecord.id} after successful analysis`);
          } catch (error) {
            logger.warn(`Failed to delete attempt record ID: ${attemptRecord.id}, but analysis was successful`);
          }
        }

        // Notify success
        await notifyStatusChange(batchId, trackId, 'COMPLETED');

      } catch (error) {
        logger.error(`Failed to save analysis for trackId ${trackId}: ${error}`);
        await notifyStatusChange(batchId, trackId, 'FAILED', undefined, 'Failed to save analysis');
      }
    } else {
      // Handle failure
      const attemptRecord = await trackAnalysisAttemptsRepository.getLatestAttemptForTrack(trackId);
      if (attemptRecord) {
        await trackAnalysisAttemptsRepository.markAttemptAsFailed(
          attemptRecord.id,
          'ANALYSIS_FAILED',
          result.error || 'Unknown error'
        );
      }
      await notifyStatusChange(batchId, trackId, 'FAILED', undefined, result.error);
    }

    // Delete processed message
    await deleteSqsMessage(message.ReceiptHandle);
  }

  // Update job completion stats
  try {
    const job = await analysisJobRepository.getJobByBatchId(batchId);
    if (job) {
      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;

      const newProcessedCount = job.tracks_processed + results.length;
      const newSucceededCount = job.tracks_succeeded + successCount;
      const newFailedCount = job.tracks_failed + failCount;

      logger.info(`Updating job progress: ${batchId}, processed: ${job.tracks_processed} → ${newProcessedCount}, succeeded: ${job.tracks_succeeded} → ${newSucceededCount}, failed: ${job.tracks_failed} → ${newFailedCount}`);

      const updatedJob = await analysisJobRepository.updateJobProgress(
        batchId,
        newProcessedCount,
        newSucceededCount,
        newFailedCount
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
    logger.error(`Failed to update job stats: ${error}`);
  }
}

// Add signal handlers for graceful shutdown
process.on('SIGINT', () => {
  logger.info('SIGINT received. Shutting down batch worker...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down batch worker...');
  process.exit(0);
});

// Start the worker
const main = async () => {
  logger.info('Starting batch analysis worker...');

  // Add warnings for missing API keys
  if (!GENIUS_API_KEY) {
    logger.warn('Warning: GENIUS_API_KEY is not set. Lyrics service might fail.');
  }
  if (!GOOGLE_API_KEY) {
    logger.warn('Warning: GOOGLE_API_KEY is not set. LLM provider might fail.');
  }

  logger.info('Batch analysis worker configuration:', {
    queueUrl: AWS_SQS_QUEUE_URL,
    region: AWS_REGION,
    batchSize: BATCH_SIZE,
    maxMessagesPerPoll: MAX_MESSAGES_PER_POLL
  });

  await processMessages();
};

main().catch((error) => {
  logger.error(`Fatal error in batch analysis worker: ${error}`);
  process.exit(1);
});