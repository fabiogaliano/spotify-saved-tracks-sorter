import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand, ListQueuesCommand } from "@aws-sdk/client-sqs";
import dotenv from "dotenv";

dotenv.config();

const sqsClient = new SQSClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

async function deleteAllMessages(queueUrl: string, options: { logDetails?: boolean } = {}) {
  console.log(`Processing messages from ${queueUrl}...`);
  let messagesDeleted = 0;
  let failingMessagesDeleted = 0;
  let failedSongs = new Set<string>();

  while (true) {
    // Receive up to 10 messages
    const receiveCommand = new ReceiveMessageCommand({
      QueueUrl: queueUrl,
      MaxNumberOfMessages: 10,
      WaitTimeSeconds: 0,
      VisibilityTimeout: 30, // Give us time to process
      AttributeNames: ['All'],
      MessageAttributeNames: ['All']
    });

    const response = await sqsClient.send(receiveCommand);
    const messages = response.Messages || [];
    
    console.log(`Received ${messages.length} messages`);

    if (messages.length === 0) {
      break; // No more messages to process
    }

    // Process each message
    for (const message of messages) {
      try {
        // Check if message has been retried
        const approximateReceiveCount = message.Attributes?.ApproximateReceiveCount;
        const receiveCount = approximateReceiveCount ? parseInt(approximateReceiveCount, 10) : 0;
        
        // Parse message body to get information about the job
        let body = { trackId: 'unknown', artist: 'unknown', title: 'unknown' };
        try {
          if (message.Body) {
            body = JSON.parse(message.Body);
          }
        } catch (parseError) {
          console.warn(`Could not parse message body for ID ${message.MessageId}`);
        }

        if (options.logDetails) {
          console.log(`Message ID: ${message.MessageId}`);
          console.log(`Track ID: ${body.trackId}`);
          console.log(`Song: ${body.artist} - ${body.title}`);
          console.log(`Receive count: ${receiveCount}`);
        }

        // Delete the message
        const deleteCommand = new DeleteMessageCommand({
          QueueUrl: queueUrl,
          ReceiptHandle: message.ReceiptHandle!
        });

        await sqsClient.send(deleteCommand);
        messagesDeleted++;
        
        // If this was a message that had been received multiple times, it was likely failing
        if (receiveCount > 1) {
          failingMessagesDeleted++;
          const songInfo = `${body.artist} - ${body.title}`;
          failedSongs.add(songInfo);
          console.log(`Deleted failing message for: ${songInfo} (received ${receiveCount} times)`);
        }
      } catch (error) {
        console.error(`Error processing message ${message.MessageId}:`, error);
        // Try to delete the message anyway to prevent it from getting stuck
        try {
          const deleteCommand = new DeleteMessageCommand({
            QueueUrl: queueUrl,
            ReceiptHandle: message.ReceiptHandle!
          });
          await sqsClient.send(deleteCommand);
          messagesDeleted++;
          console.log(`Deleted message ${message.MessageId} despite processing error`);
        } catch (deleteError) {
          console.error(`Failed to delete message ${message.MessageId}:`, deleteError);
        }
      }
    }

    console.log(`Deleted ${messagesDeleted} messages so far (${failingMessagesDeleted} failing)...`);
  }

  console.log(`Finished deleting ${messagesDeleted} messages (${failingMessagesDeleted} failing)`);
  
  // Show a summary of failed songs if any were found
  if (failedSongs.size > 0) {
    console.log('\nFailed songs:');
    Array.from(failedSongs).forEach(song => {
      console.log(`- ${song}`);
    });
  }
  
  return { messagesDeleted, failingMessagesDeleted, failedSongs: Array.from(failedSongs) };
}

async function listAllQueues() {
  console.log("\n=== LISTING ALL AVAILABLE QUEUES ===\n");
  try {
    const command = new ListQueuesCommand({});
    const response = await sqsClient.send(command);
    const queueUrls = response.QueueUrls || [];
    
    if (queueUrls.length === 0) {
      console.log("No queues found in this AWS account/region");
      return [];
    }
    
    console.log(`Found ${queueUrls.length} queues:`);
    queueUrls.forEach((url, index) => {
      console.log(`${index + 1}. ${url}`);
    });
    
    return queueUrls;
  } catch (error) {
    console.error("Error listing queues:", error);
    return [];
  }
}

async function purgeAllQueues() {
  // List all available queues
  const allQueues = await listAllQueues();
  
  if (allQueues.length === 0) {
    console.log("No queues found to purge");
    return;
  }
  
  console.log("\n=== CHECKING ALL QUEUES FOR MESSAGES ===");
  
  // Separate queues into main queues and DLQs
  const mainQueues = allQueues.filter(url => 
    !url.includes('DLQ') && 
    !url.includes('dlq') && 
    !url.includes('dead-letter')
  );
  
  const dlqQueues = allQueues.filter(url => 
    url.includes('DLQ') || 
    url.includes('dlq') || 
    url.includes('dead-letter')
  );
  
  let totalMessagesDeleted = 0;
  let totalFailingMessagesDeleted = 0;
  let allFailedSongs = new Set<string>();
  
  // Process all main queues
  for (const queueUrl of mainQueues) {
    console.log(`\n=== PROCESSING QUEUE: ${queueUrl} ===`);
    const results = await deleteAllMessages(queueUrl, { logDetails: true });
    totalMessagesDeleted += results.messagesDeleted;
    totalFailingMessagesDeleted += results.failingMessagesDeleted;
    
    // Add any failed songs to our overall set
    if (results.failedSongs && results.failedSongs.length > 0) {
      results.failedSongs.forEach(song => allFailedSongs.add(song));
    }
  }
  
  // Process all DLQs
  for (const queueUrl of dlqQueues) {
    console.log(`\n=== PROCESSING DLQ: ${queueUrl} ===`);
    const results = await deleteAllMessages(queueUrl, { logDetails: true });
    totalMessagesDeleted += results.messagesDeleted;
    totalFailingMessagesDeleted += results.failingMessagesDeleted;
    
    // Add any failed songs to our overall set
    if (results.failedSongs && results.failedSongs.length > 0) {
      results.failedSongs.forEach(song => allFailedSongs.add(song));
    }
  }
  
  console.log("\n=== SUMMARY ===");
  console.log(`Total messages deleted: ${totalMessagesDeleted}`);
  console.log(`Total failing messages deleted: ${totalFailingMessagesDeleted}`);
  
  // Show a summary of all failed songs across all queues
  if (allFailedSongs.size > 0) {
    console.log("\n=== FAILED SONGS ACROSS ALL QUEUES ===");
    Array.from(allFailedSongs).forEach(song => {
      console.log(`- ${song}`);
    });
    console.log("\nThese songs have been removed from the queues and will not be retried.");
    console.log("If you want to analyze them again, you'll need to manually trigger analysis.");
  }
  
  if (totalMessagesDeleted === 0) {
    console.log("\nNo messages found in any queue. The problematic message might be in a different system or has already been processed.");
  } else {
    console.log("\nQueue purge completed successfully");
  }
  console.log("Note: The SQS service has been configured to only attempt jobs once (MAX_RECEIVE_COUNT = 1)");
}

async function purgeQueues() {
  // List all available queues
  const allQueues = await listAllQueues();
  
  // Get queue URLs from environment or use defaults
  let mainQueueUrl = process.env.AWS_SQS_QUEUE_URL;
  let dlqUrl = process.env.AWS_SQS_DLQ_URL;
  
  // If no queue URL is provided but we found queues, use the first one that looks like a main queue
  if (!mainQueueUrl && allQueues.length > 0) {
    const possibleMainQueues = allQueues.filter(url => 
      !url.includes('DLQ') && 
      !url.includes('dlq') && 
      !url.includes('dead-letter')
    );
    
    if (possibleMainQueues.length > 0) {
      mainQueueUrl = possibleMainQueues[0];
      console.log(`No AWS_SQS_QUEUE_URL provided, using discovered queue: ${mainQueueUrl}`);
    }
  }
  
  // If no DLQ URL is provided but we found queues, use the first one that looks like a DLQ
  if (!dlqUrl && allQueues.length > 0) {
    const possibleDlqs = allQueues.filter(url => 
      url.includes('DLQ') || 
      url.includes('dlq') || 
      url.includes('dead-letter')
    );
    
    if (possibleDlqs.length > 0) {
      dlqUrl = possibleDlqs[0];
      console.log(`No AWS_SQS_DLQ_URL provided, using discovered DLQ: ${dlqUrl}`);
    }
  }
  
  // If we still don't have a DLQ but have a main queue, try to derive it
  if (!dlqUrl && mainQueueUrl) {
    // Try different patterns for deriving DLQ URL
    if (mainQueueUrl.includes('MusicAnalysis.fifo')) {
      dlqUrl = mainQueueUrl.replace('MusicAnalysis.fifo', 'MusicAnalysisDLQ.fifo');
    } else if (mainQueueUrl.includes('song-analysis-queue')) {
      dlqUrl = mainQueueUrl.replace('song-analysis-queue', 'song-analysis-dlq');
    } else {
      // Generic approach - append -dlq to the queue name
      const queueParts = mainQueueUrl.split('/');
      const queueName = queueParts[queueParts.length - 1];
      dlqUrl = mainQueueUrl.replace(queueName, `${queueName}-dlq`);
    }
  }

  if (!mainQueueUrl) {
    console.error("AWS_SQS_QUEUE_URL is not defined");
    process.exit(1);
  }

  try {
    // Log queue URLs for debugging
    console.log("\n=== QUEUE CONFIGURATION ===");
    console.log(`Main Queue URL: ${mainQueueUrl}`);
    console.log(`DLQ URL: ${dlqUrl || 'Not configured'}`);
    
    // Process main queue
    console.log("\n=== PROCESSING MAIN QUEUE ===");
    const mainQueueResults = await deleteAllMessages(mainQueueUrl, { logDetails: true });

    // Process DLQ if it exists
    if (dlqUrl) {
      console.log("\n=== PROCESSING DEAD LETTER QUEUE ===");
      const dlqResults = await deleteAllMessages(dlqUrl, { logDetails: true });
      
      console.log("\n=== SUMMARY ===");
      console.log(`Main Queue: ${mainQueueResults.messagesDeleted} messages deleted (${mainQueueResults.failingMessagesDeleted} failing)`);
      console.log(`Dead Letter Queue: ${dlqResults.messagesDeleted} messages deleted`);
      console.log(`Total: ${mainQueueResults.messagesDeleted + dlqResults.messagesDeleted} messages deleted`);
    } else {
      console.log("\n=== SUMMARY ===");
      console.log(`Main Queue: ${mainQueueResults.messagesDeleted} messages deleted (${mainQueueResults.failingMessagesDeleted} failing)`);
      console.log(`Total: ${mainQueueResults.messagesDeleted} messages deleted`);
    }
    
    console.log("\nQueue purge completed successfully");
    console.log("Note: The SQS service has been configured to only attempt jobs once (MAX_RECEIVE_COUNT = 1)");
  } catch (error) {
    console.error("Error processing messages:", error);
    process.exit(1);
  }
}

// Check if we should purge all queues or just the configured ones
const args = process.argv.slice(2);
const purgeAll = args.includes('--all') || args.includes('-a');

if (purgeAll) {
  purgeAllQueues();
} else {
  purgeQueues();
  console.log("\nTip: Run with '--all' flag to check all queues: bun scripts/purgeSQS.ts --all");
}
