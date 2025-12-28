import {
	AnalysisJobInsert,
	AnalysisJob as DBAnalysisJob,
	analysisJobRepository,
} from '~/lib/repositories/AnalysisJobRepository'
import { trackAnalysisAttemptsRepository } from '~/lib/repositories/TrackAnalysisAttemptsRepository'
import { trackAnalysisRepository } from '~/lib/repositories/TrackAnalysisRepository'
import {
	AnalysisJob,
	AnalysisJobStatus,
	AnalysisJobType,
	ItemState,
	ItemStatesMap,
	PlaylistJob,
	TrackBatchJob,
} from '~/lib/types/analysis.types'

/** Valid job types for runtime validation */
const VALID_JOB_TYPES = new Set<AnalysisJobType>(['track_batch', 'playlist'])

/** Valid job statuses for runtime validation */
const VALID_JOB_STATUSES = new Set<AnalysisJobStatus>([
	'pending',
	'in_progress',
	'completed',
	'failed',
])

/** Validates and returns a safe job type, logging warnings for unexpected values */
function validateJobType(
	rawJobType: string | null | undefined,
	batchId: string
): AnalysisJobType {
	if (rawJobType && VALID_JOB_TYPES.has(rawJobType as AnalysisJobType)) {
		return rawJobType as AnalysisJobType
	}
	if (rawJobType) {
		console.warn(
			`Unknown job_type '${rawJobType}' for job ${batchId}, defaulting to 'track_batch'`
		)
	}
	return 'track_batch'
}

/** Validates and returns a safe job status, logging warnings for unexpected values */
function validateJobStatus(
	rawStatus: string | null | undefined,
	batchId: string
): AnalysisJobStatus {
	if (rawStatus && VALID_JOB_STATUSES.has(rawStatus as AnalysisJobStatus)) {
		return rawStatus as AnalysisJobStatus
	}
	if (rawStatus) {
		console.warn(
			`Unknown status '${rawStatus}' for job ${batchId}, defaulting to 'pending'`
		)
	}
	return 'pending'
}

export class JobPersistenceService {
	async saveJob(
		job: AnalysisJob,
		userId: number,
		itemIds: number[]
	): Promise<DBAnalysisJob> {
		const jobData: AnalysisJobInsert = {
			user_id: userId,
			batch_id: job.id,
			status: job.status,
			item_count: job.itemCount,
			items_processed: 0,
			items_succeeded: 0,
			items_failed: 0,
			item_ids: itemIds,
			job_type: job.jobType,
		}

		return await analysisJobRepository.createJob(jobData)
	}

	async getActiveJobForUser(userId: number): Promise<AnalysisJob | null> {
		const dbJob = await analysisJobRepository.getActiveJobForUser(userId)
		if (!dbJob) return null

		// Only return active jobs to client - filter out old completed jobs
		// This prevents old completed jobs from showing up after reload
		if (dbJob.status === 'completed' || dbJob.status === 'failed') {
			return null
		}

		// Get the original item IDs from the job
		const itemIds = (dbJob.item_ids as number[]) || []

		if (itemIds.length === 0) {
			console.warn(
				`Job ${dbJob.batch_id} has no item_ids stored. This might be an old job created before item_ids were implemented.`
			)
			return null // Cannot recover job without item IDs
		}

		// Validate job type early to ensure correct path selection
		const validatedJobType = validateJobType(dbJob.job_type, dbJob.batch_id)

		// For playlist jobs, skip the detailed state reconstruction
		const isPlaylistJob = validatedJobType === 'playlist'

		// Build item states map
		const itemStates: ItemStatesMap = new Map()

		if (isPlaylistJob) {
			// Playlist jobs don't need per-item state tracking
			itemIds.forEach(itemId => {
				itemStates.set(
					itemId,
					dbJob.status === 'completed' ? 'completed'
					: dbJob.status === 'failed' ? 'failed'
					: 'queued'
				)
			})
		} else {
			// Track batch jobs - reconstruct the itemStates map from track_analysis_attempts and track_analyses
			const attempts = await trackAnalysisAttemptsRepository.getAttemptsByJobId(
				dbJob.batch_id
			)

			// Create a map of track_id -> attempt status
			const attemptStatusMap = new Map<number, string>()
			attempts.forEach(attempt => {
				attemptStatusMap.set(attempt.track_id, attempt.status || '')
			})

			// For tracks with no attempt record, check if they have completed analyses
			const itemIdsWithoutAttempts = itemIds.filter(
				itemId => !attemptStatusMap.has(itemId)
			)
			const completedItemIds = new Set<number>()

			// Batch check for completed analyses to avoid N+1 queries
			if (itemIdsWithoutAttempts.length > 0) {
				try {
					// Check which tracks have completed analyses
					for (const itemId of itemIdsWithoutAttempts) {
						const analysis = await trackAnalysisRepository.getByTrackId(itemId)
						if (analysis) {
							completedItemIds.add(itemId)
						}
					}
				} catch (error) {
					console.error(
						'Error checking for completed analyses during job recovery:',
						error
					)
					// Continue with recovery even if this check fails
				}
			}

			itemIds.forEach(itemId => {
				const attemptStatus = attemptStatusMap.get(itemId)
				let state: ItemState = 'queued'

				if (attemptStatus) {
					// Track has an attempt record
					switch (attemptStatus) {
						case 'IN_PROGRESS':
							state = 'in_progress'
							break
						case 'COMPLETED':
							state = 'completed'
							break
						case 'FAILED':
							state = 'failed'
							break
						default:
							// Shouldn't happen, but default to queued
							state = 'queued'
					}
				} else if (completedItemIds.has(itemId)) {
					// No attempt record but has completed analysis - it's done
					state = 'completed'
				} else {
					// No attempt record and no completed analysis - truly queued/pending
					state = 'queued'
				}

				itemStates.set(itemId, state)
			})
		}

		// Check if job should be marked as completed or is stale
		let finalStatus = validateJobStatus(dbJob.status, dbJob.batch_id)
		const totalProcessed = dbJob.items_processed
		const expectedTotal = dbJob.item_count
		const jobAge =
			dbJob.created_at ? Date.now() - new Date(dbJob.created_at).getTime() : 0
		const jobAgeMinutes = jobAge / (1000 * 60)

		// Check completion based on itemStates as well as DB counters
		const completedItemsFromStates = Array.from(itemStates.values()).filter(
			s => s === 'completed' || s === 'failed'
		).length
		const isCompleteByStates = completedItemsFromStates >= expectedTotal
		const isCompleteByDB = totalProcessed >= expectedTotal

		if (finalStatus === 'in_progress' || finalStatus === 'pending') {
			if (isCompleteByDB || isCompleteByStates) {
				// All items processed, mark as complete
				console.log(
					`Job ${dbJob.batch_id} is complete (DB: ${totalProcessed}/${expectedTotal}, States: ${completedItemsFromStates}/${expectedTotal}), updating status`
				)
				finalStatus = 'completed'
				this.markJobCompleted(dbJob.batch_id).catch(error => {
					console.error('Failed to mark job as completed:', error)
				})
			} else if (jobAgeMinutes > 30) {
				// Job is over 30 minutes old and still in progress - likely stale
				console.log(
					`Job ${dbJob.batch_id} appears stale (DB: ${totalProcessed}/${expectedTotal}, States: ${completedItemsFromStates}/${expectedTotal}, ${jobAgeMinutes.toFixed(1)}min old), marking as failed`
				)
				finalStatus = 'failed'
				this.markJobFailed(dbJob.batch_id).catch(error => {
					console.error('Failed to mark stale job as failed:', error)
				})
			}
		}

		const baseProps = {
			id: dbJob.batch_id,
			status: finalStatus,
			startedAt: dbJob.created_at ? new Date(dbJob.created_at) : new Date(),
			dbStats: {
				itemsProcessed: dbJob.items_processed,
				itemsSucceeded: dbJob.items_succeeded,
				itemsFailed: dbJob.items_failed,
			},
		}

		// Return proper discriminated union type based on job type
		if (validatedJobType === 'playlist') {
			const playlistJob: PlaylistJob = {
				...baseProps,
				jobType: 'playlist',
				itemCount: 1,
			}
			return playlistJob
		}

		// Default: track_batch job
		const trackBatchJob: TrackBatchJob = {
			...baseProps,
			jobType: 'track_batch',
			itemCount: dbJob.item_count,
			itemStates,
		}
		return trackBatchJob
	}

	async updateJobProgress(
		batchId: string,
		itemsProcessed: number,
		itemsSucceeded: number,
		itemsFailed: number
	): Promise<void> {
		await analysisJobRepository.updateJobProgress(
			batchId,
			itemsProcessed,
			itemsSucceeded,
			itemsFailed
		)
	}

	async markJobCompleted(batchId: string): Promise<void> {
		await analysisJobRepository.markJobAsCompleted(batchId)
	}

	async markJobFailed(batchId: string): Promise<void> {
		await analysisJobRepository.markJobAsFailed(batchId)
	}

	async getJobCounts(
		batchId: string
	): Promise<{ processed: number; succeeded: number; failed: number }> {
		const job = await analysisJobRepository.getJobByBatchId(batchId)
		if (!job) {
			return { processed: 0, succeeded: 0, failed: 0 }
		}

		return {
			processed: job.items_processed,
			succeeded: job.items_succeeded,
			failed: job.items_failed,
		}
	}
}

export const jobPersistenceService = new JobPersistenceService()
