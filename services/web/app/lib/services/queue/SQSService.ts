// app/lib/services/queue/SQSService.ts
import {
  SQSClient,
  SendMessageBatchCommand,
  CreateQueueCommand,
  GetQueueAttributesCommand,
  GetQueueUrlCommand,
  SendMessageBatchResultEntry,
  SendMessageBatchRequestEntry
} from "@aws-sdk/client-sqs";
import crypto from "crypto";
import { logger } from '~/lib/logging/Logger';

const sqsClient = new SQSClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export interface AnalysisJobPayload {
  // Common fields
  type: 'track' | 'playlist'; // Type of analysis job
  userId: number; // User ID to fetch provider preferences
  batchId: string; // Shared ID for all items in the same batch analysis
  batchSize?: 1 | 5 | 10; // Batch size for parallel processing

  // Track-specific fields
  spotifyTrackId?: string; // Spotify track ID
  trackId?: string; // Your internal DB track ID
  artist?: string;
  title?: string;

  // Playlist-specific fields
  playlistId?: string; // Your internal DB playlist ID
  playlistName?: string;
  playlistDescription?: string;
}

export interface EnqueueJobResult {
  batchId: string;
  result: SendMessageBatchResultEntry;
}

export interface EnqueueBatchResult {
  batchId: string;
  results: SendMessageBatchResultEntry[];
}

class SQSService {
  private queueUrl: string | null = null;

  constructor() {
    this.setupQueues().catch((error) => {
      logger.warn('Queue setup failed, falling back to AWS_SQS_QUEUE_URL:', error);
    });
  }
  private dlqUrl: string | null = null;
  private readonly MAX_RECEIVE_COUNT = 1; // Message will be moved to DLQ after 1 failure (no retries)

  private async getOrCreateQueue(queueName: string, attributes: Record<string, string> = {}) {
    try {
      // Try to get existing queue URL
      const getQueueUrlCommand = new GetQueueUrlCommand({ QueueName: queueName });
      const { QueueUrl } = await sqsClient.send(getQueueUrlCommand);
      return QueueUrl;
    } catch (error: any) {
      if (error?.__type === 'com.amazonaws.sqs#QueueDoesNotExist') {
        // Queue doesn't exist, create it
        const createQueueCommand = new CreateQueueCommand({
          QueueName: queueName,
          Attributes: attributes
        });
        const result = await sqsClient.send(createQueueCommand);
        return result.QueueUrl;
      }
      throw error;
    }
  }

  async setupQueues() {
    try {
      const dlqUrl = await this.getOrCreateQueue('MusicAnalysisDLQ.fifo', {
        FifoQueue: 'true',
        ContentBasedDeduplication: 'true'
      });
      if (!dlqUrl) {
        throw new Error('Failed to get/create DLQ');
      }
      this.dlqUrl = dlqUrl;

      const getQueueAttributesCommand = new GetQueueAttributesCommand({
        QueueUrl: this.dlqUrl,
        AttributeNames: ['QueueArn']
      });
      const dlqAttributes = await sqsClient.send(getQueueAttributesCommand);
      const dlqArn = dlqAttributes.Attributes?.QueueArn;

      if (!dlqArn) {
        throw new Error('Failed to get DLQ ARN');
      }

      const mainQueueUrl = await this.getOrCreateQueue('MusicAnalysis.fifo', {
        FifoQueue: 'true',
        ContentBasedDeduplication: 'true',
        RedrivePolicy: JSON.stringify({
          deadLetterTargetArn: dlqArn,
          maxReceiveCount: this.MAX_RECEIVE_COUNT
        })
      });
      if (!mainQueueUrl) {
        throw new Error('Failed to get/create main queue');
      }

      this.queueUrl = mainQueueUrl;

      if (!this.queueUrl) {
        throw new Error('Failed to get/create main queue');
      }

    } catch (error) {
      logger.error('Error setting up queues:', error);
      throw error;
    }
  }

  private async getQueueUrl(): Promise<string> {
    if (this.queueUrl) {
      return this.queueUrl;
    }

    const queueUrl = process.env.AWS_SQS_QUEUE_URL;
    if (!queueUrl) {
      throw new Error("AWS_SQS_QUEUE_URL is not defined in environment variables.");
    }
    return queueUrl;
  }

  /**
   * Enqueue a single analysis job. Generates batchId if not provided.
   * Returns the batchId and SQS result for tracking.
   */
  async enqueueAnalysisJob(
    payload: Omit<AnalysisJobPayload, 'batchId'>,
    batchId?: string
  ): Promise<EnqueueJobResult> {
    const { batchId: returnedBatchId, results } = await this.enqueueBatchAnalysisJobs([payload], batchId);
    if (!results[0]) {
      throw new Error('Failed to enqueue analysis job');
    }
    return { batchId: returnedBatchId, result: results[0] };
  }

  /**
   * Enqueue multiple analysis jobs in a batch. All jobs share the same batchId.
   * Generates batchId if not provided. Returns the batchId and SQS results.
   */
  async enqueueBatchAnalysisJobs(
    payloads: Omit<AnalysisJobPayload, 'batchId'>[],
    batchId?: string
  ): Promise<EnqueueBatchResult> {
    // Generate batchId if not provided - this is the single source of truth
    const effectiveBatchId = batchId || crypto.randomUUID();

    if (payloads.length === 0) {
      return { batchId: effectiveBatchId, results: [] };
    }

    const queueUrl = await this.getQueueUrl();
    const results: SendMessageBatchResultEntry[] = [];

    const MAX_BATCH_SIZE = 10;

    for (let i = 0; i < payloads.length; i += MAX_BATCH_SIZE) {
      const batch = payloads.slice(i, i + MAX_BATCH_SIZE);
      const entries = batch.map((payload, index) => {
        // Include batchId in the payload sent to SQS
        const payloadWithBatchId: AnalysisJobPayload = {
          ...payload,
          batchId: effectiveBatchId
        };

        const entry: SendMessageBatchRequestEntry = {
          Id: `${i + index}`,
          MessageBody: JSON.stringify(payloadWithBatchId),
        };

        if (queueUrl.endsWith(".fifo")) {
          entry.MessageGroupId = "song-analysis-group";

          let deduplicationString: string;
          if (payload.type === 'track') {
            deduplicationString = `track-${payload.trackId}-${payload.artist}-${payload.title}-${Date.now()}`;
          } else if (payload.type === 'playlist') {
            deduplicationString = `playlist-${payload.playlistId}-${Date.now()}`;
          } else {
            throw new Error(`Invalid analysis job type: ${payload.type}`);
          }

          entry.MessageDeduplicationId = crypto
            .createHash('sha256')
            .update(deduplicationString)
            .digest('hex');
        }
        return entry;
      });

      try {
        const command = new SendMessageBatchCommand({
          QueueUrl: queueUrl,
          Entries: entries
        });

        const result = await sqsClient.send(command);

        if (result.Successful) {
          results.push(...result.Successful);
        }

        if (result.Failed?.length) {
          logger.error(`Failed to enqueue ${result.Failed.length} tracks`);
        }
      } catch (error) {
        logger.error("Error sending to SQS");
        throw error;
      }
    }

    return { batchId: effectiveBatchId, results };
  }
}

export const sqsService = new SQSService();
