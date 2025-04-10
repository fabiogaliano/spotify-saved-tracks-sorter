/**
 * Worker process entry point for background track analysis
 * This file sets up and runs the graphile-worker instance
 */

import { run } from 'graphile-worker';
import path from 'path';
import { fileURLToPath } from 'url';
import { EventEmitter } from 'events';

// Get the directory name for the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import the configuration preset
import preset from '../../graphile.config';

// Configuration options for the worker (for legacy support)
interface WorkerConfig {
  connectionString: string;
  concurrency?: number;
  pollInterval?: number;
  taskDirectory?: string;
}

/**
 * Start the worker process
 */
async function startWorker(config?: WorkerConfig) {
  try {
    // Log worker startup
    console.log('Starting worker process...');

    // Create event emitter for worker events
    const events = new EventEmitter();

    // Set up event handlers
    events.on('pool:create', ({ workerPool }) => {
      console.log(`Worker pool created: ${workerPool.workerId}`);
    });

    events.on('worker:create', ({ worker, tasks }) => {
      console.log(`Worker created: ${worker.workerId} with ${Object.keys(tasks).length} tasks`);
    });

    events.on('job:start', ({ worker, job }) => {
      console.log(`Worker ${worker.workerId} started job ${job.id} (${job.task_identifier})`);
    });

    events.on('job:success', ({ worker, job }) => {
      console.log(`Worker ${worker.workerId} completed job ${job.id} successfully`);
    });

    events.on('job:error', ({ worker, job, error }) => {
      console.error(`Worker ${worker.workerId} job ${job.id} failed:`, error);
    });

    events.on('gracefulShutdown', ({ signal }) => {
      console.log(`Worker shutting down gracefully due to ${signal}...`);
    });

    // If config is provided, use it (legacy support)
    // Otherwise, use the configuration from graphile.config.ts
    const runner = await run({
      preset,
      events,
      ...config // For backward compatibility
    });

    console.log('Worker started successfully');
    return runner;
  } catch (error) {
    console.error('Failed to start worker:', error);
    throw error;
  }
}

// Only start the worker if this file is run directly (not imported)
// Check if file is being run directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  // Start the worker using the configuration from graphile.config.ts
  startWorker().catch((error) => {
    console.error('Worker failed to start:', error);
    process.exit(1);
  });
}

// Export for programmatic usage
export { startWorker };
