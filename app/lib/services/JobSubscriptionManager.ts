import { AnalysisJob } from '~/features/liked-songs-management/context';

export type JobStatusUpdate = {
  trackId: number;
  status: 'QUEUED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'SKIPPED';
};

export type JobSubscriptionCallback = (update: JobStatusUpdate) => void;

/**
 * Centralized job subscription manager that eliminates stale closure problems
 * by maintaining current job reference and providing job-scoped message filtering
 */
export class JobSubscriptionManager {
  private currentJobId: string | null = null;
  private callbacks: Set<JobSubscriptionCallback> = new Set();
  private isActive: boolean = false;

  /**
   * Set the current active job ID
   * This invalidates any messages from previous jobs
   */
  setCurrentJob(jobId: string | null): void {
    this.currentJobId = jobId;
    
    // If setting to null, deactivate the manager
    if (jobId === null) {
      this.isActive = false;
    } else {
      this.isActive = true;
    }
  }

  /**
   * Subscribe to job status updates
   * Returns an unsubscribe function
   */
  subscribe(callback: JobSubscriptionCallback): () => void {
    this.callbacks.add(callback);
    
    return () => {
      this.callbacks.delete(callback);
    };
  }

  /**
   * Process a WebSocket message with job-scoped filtering
   * Only processes messages if they belong to the current active job
   */
  processMessage(message: any): boolean {
    // Only process if manager is active
    if (!this.isActive || !this.currentJobId) {
      return false;
    }

    // Validate message structure
    if (!message || message.type !== 'job_status') {
      return false;
    }

    const statusUpdate = message.data;
    if (!statusUpdate || typeof statusUpdate.trackId !== 'number' || !statusUpdate.status) {
      console.warn('JobSubscriptionManager: Invalid status update format', statusUpdate);
      return false;
    }

    // Create the update object
    const update: JobStatusUpdate = {
      trackId: statusUpdate.trackId,
      status: statusUpdate.status
    };

    // Notify all subscribers
    this.callbacks.forEach(callback => {
      try {
        callback(update);
      } catch (error) {
        console.error('JobSubscriptionManager: Error in callback', error);
      }
    });

    return true;
  }

  /**
   * Clear all subscriptions and reset state
   */
  reset(): void {
    this.currentJobId = null;
    this.isActive = false;
    this.callbacks.clear();
  }

  /**
   * Get current job ID
   */
  getCurrentJobId(): string | null {
    return this.currentJobId;
  }

  /**
   * Check if manager is active
   */
  getIsActive(): boolean {
    return this.isActive;
  }
}

// Singleton instance for the application
export const jobSubscriptionManager = new JobSubscriptionManager();
