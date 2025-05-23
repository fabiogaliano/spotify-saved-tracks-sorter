// app/lib/services/queue/SQSService.ts
import {
  SQSClient,
  SendMessageCommand,
  SendMessageCommandInput,
  ReceiveMessageCommand,
  CreateQueueCommand,
  GetQueueAttributesCommand,
  DeleteMessageCommand,
  GetQueueUrlCommand
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
  trackId: string; // Your internal DB track ID
  artist: string;
  title: string;
  userId: number; // User ID to fetch provider preferences
  batchId: string; // Shared ID for all tracks in the same batch analysis
}

class SQSService {
  private queueUrl: string | null = null;

  constructor() {
    // Initialize queues when service is created
    this.setupQueues().catch(error => {
      console.error('Failed to set up queues:', error);
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
      // Get or create DLQ
      const dlqUrl = await this.getOrCreateQueue('MusicAnalysisDLQ.fifo', {
        FifoQueue: 'true',
        ContentBasedDeduplication: 'true'
      });
      if (!dlqUrl) {
        throw new Error('Failed to get/create DLQ');
      }
      this.dlqUrl = dlqUrl;

      // Get DLQ ARN
      const getQueueAttributesCommand = new GetQueueAttributesCommand({
        QueueUrl: this.dlqUrl,
        AttributeNames: ['QueueArn']
      });
      const dlqAttributes = await sqsClient.send(getQueueAttributesCommand);
      const dlqArn = dlqAttributes.Attributes?.QueueArn;

      if (!dlqArn) {
        throw new Error('Failed to get DLQ ARN');
      }

      // Get or create main queue
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

      console.log('Successfully set up queues:', {
        mainQueueUrl: this.queueUrl,
        dlqUrl: this.dlqUrl
      });
    } catch (error) {
      console.error('Error setting up queues:', error);
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

  async enqueueAnalysisJob(payload: AnalysisJobPayload) {
    const queueUrl = await this.getQueueUrl();

    const params: SendMessageCommandInput = {
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify(payload),
    };

    if (queueUrl.endsWith(".fifo")) {
      params.MessageGroupId = "song-analysis-group";
      params.MessageDeduplicationId = crypto
        .createHash('sha256')
        .update(`${payload.trackId}-${payload.artist}-${payload.title}-${Date.now()}`)
        .digest('hex');
    }

    try {
      const command = new SendMessageCommand(params);
      const data = await sqsClient.send(command);
      logger.info('Successfully added message to SQS queue:', {
        messageId: data.MessageId,
        queueUrl,
        payload
      });

      return data;
    } catch (error) {
      console.error("Error sending message to SQS:", error);
      throw error;
    }
  }

  async getDLQMessages() {
    if (!this.dlqUrl) {
      throw new Error('DLQ not initialized');
    }

    const command = new ReceiveMessageCommand({
      QueueUrl: this.dlqUrl,
      MaxNumberOfMessages: 10,
      AttributeNames: ['All'],
      MessageAttributeNames: ['All'],
      VisibilityTimeout: 30 // Hide messages for 30 seconds while we process them
    });

    try {
      const response = await sqsClient.send(command);
      return response.Messages || [];
    } catch (error) {
      console.error('Error getting DLQ messages:', error);
      throw error;
    }
  }

  async reprocessDLQMessage(messageId: string) {
    if (!this.dlqUrl || !this.queueUrl) {
      throw new Error('Queues not initialized');
    }

    // Get the specific message from DLQ
    const command = new ReceiveMessageCommand({
      QueueUrl: this.dlqUrl,
      MaxNumberOfMessages: 1,
      VisibilityTimeout: 30,
      MessageAttributeNames: ['All'],
      AttributeNames: ['All'],
      ReceiveRequestAttemptId: messageId
    });

    try {
      const response = await sqsClient.send(command);
      const message = response.Messages?.[0];

      if (!message) {
        throw new Error('Message not found in DLQ');
      }

      // Send message back to main queue
      await this.enqueueAnalysisJob(JSON.parse(message.Body || '{}'));

      // Delete message from DLQ
      const deleteCommand = new DeleteMessageCommand({
        QueueUrl: this.dlqUrl,
        ReceiptHandle: message.ReceiptHandle!
      });

      await sqsClient.send(deleteCommand);
      console.log('Successfully reprocessed message:', messageId);
    } catch (error) {
      console.error('Error reprocessing DLQ message:', error);
      throw error;
    }
  }

  async isTrackInQueue(trackId: number): Promise<boolean> {
    try {
      const queueUrl = await this.getQueueUrl();

      // Get messages from the queue without removing them
      const command = new ReceiveMessageCommand({
        QueueUrl: queueUrl,
        MaxNumberOfMessages: 10,
        VisibilityTimeout: 0, // Don't hide the messages
        WaitTimeSeconds: 0, // Don't wait for new messages
      });

      const response = await sqsClient.send(command);
      const messages = response.Messages || [];

      // Check if any message contains our trackId
      return messages.some(message => {
        try {
          const payload = JSON.parse(message.Body!) as AnalysisJobPayload;
          return payload.trackId === String(trackId);
        } catch {
          return false;
        }
      });
    } catch (error) {
      console.error(`Error checking queue for track ${trackId}:`, error);
      return false; // Assume not in queue on error
    }
  }
}

export const sqsService = new SQSService();
