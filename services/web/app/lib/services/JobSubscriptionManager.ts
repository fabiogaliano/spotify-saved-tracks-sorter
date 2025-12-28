import {
	WebSocketMessage,
	isBatchTracksNotification,
	isDirectJobNotification,
	isJobStatusMessage,
} from '~/lib/types/websocket.types'

export type JobStatusUpdate = {
	trackId: number
	status: 'QUEUED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'SKIPPED'
}

export type JobSubscriptionCallback = (update: JobStatusUpdate) => void

/**
 * Centralized job subscription manager that eliminates stale closure problems
 * by maintaining current job reference and providing job-scoped message filtering
 */
export class JobSubscriptionManager {
	private currentJobId: string | null = null
	private callbacks: Set<JobSubscriptionCallback> = new Set()
	private isActive: boolean = false

	/**
	 * Set the current active job ID
	 * This invalidates any messages from previous jobs
	 */
	setCurrentJob(jobId: string | null): void {
		this.currentJobId = jobId

		// If setting to null, deactivate the manager
		if (jobId === null) {
			this.isActive = false
		} else {
			this.isActive = true
		}
	}

	/**
	 * Subscribe to job status updates
	 * Returns an unsubscribe function
	 */
	subscribe(callback: JobSubscriptionCallback): () => void {
		this.callbacks.add(callback)

		return () => {
			this.callbacks.delete(callback)
		}
	}

	/**
	 * Process a WebSocket message with job-scoped filtering
	 * Only processes messages if they belong to the current active job
	 */
	processMessage(message: WebSocketMessage | any): boolean {
		// Only process if manager is active
		if (!this.isActive || !this.currentJobId) {
			return false
		}

		// Handle batch tracks notification
		if (isBatchTracksNotification(message)) {
			// Check if this message belongs to the current job
			if (message.jobId !== this.currentJobId) {
				return false
			}

			// Send update for each track in the batch
			for (const trackId of message.trackIds) {
				const update: JobStatusUpdate = {
					trackId,
					status: message.status,
				}
				this.notifySubscribers(update)
			}
			return true
		}

		// Handle direct job notification (from worker)
		if (isDirectJobNotification(message)) {
			// Check if this message belongs to the current job
			if (message.jobId !== this.currentJobId) {
				return false
			}

			// Skip job-level notifications without a trackId (e.g., playlist analysis)
			// These are handled separately by consumers that check for null trackId
			if (message.trackId === null) {
				return true // Message was processed, just not broadcast to track subscribers
			}

			const update: JobStatusUpdate = {
				trackId: message.trackId,
				status: message.status,
			}

			this.notifySubscribers(update)
			return true
		}

		// Handle nested job status message (legacy format)
		if (isJobStatusMessage(message)) {
			const { jobId, trackId, status } = message.data

			// Check if this message belongs to the current job
			if (jobId !== this.currentJobId) {
				return false
			}

			const update: JobStatusUpdate = {
				trackId,
				status,
			}

			this.notifySubscribers(update)
			return true
		}

		return false
	}

	/**
	 * Notify all subscribers with an update
	 */
	private notifySubscribers(update: JobStatusUpdate): void {
		this.callbacks.forEach(callback => {
			try {
				callback(update)
			} catch (error) {
				console.error('JobSubscriptionManager: Error in callback', error)
			}
		})
	}

	/**
	 * Clear all subscriptions and reset state
	 */
	reset(): void {
		this.currentJobId = null
		this.isActive = false
		this.callbacks.clear()
	}

	/**
	 * Get current job ID
	 */
	getCurrentJobId(): string | null {
		return this.currentJobId
	}

	/**
	 * Check if manager is active
	 */
	getIsActive(): boolean {
		return this.isActive
	}
}

// Singleton instance for the application
export const jobSubscriptionManager = new JobSubscriptionManager()
