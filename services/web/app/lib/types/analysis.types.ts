/**
 * Shared types for analysis job tracking
 */

/** Status of an individual item within an analysis job */
export type ItemState = 'queued' | 'in_progress' | 'completed' | 'failed'

/** Map of item IDs to their current processing state */
export type ItemStatesMap = Map<number, ItemState>

/** Valid job types */
export type AnalysisJobType = 'track_batch' | 'playlist'

/** Valid job statuses */
export type AnalysisJobStatus = 'pending' | 'in_progress' | 'completed' | 'failed'

/** Database-persisted aggregate stats */
export interface AnalysisJobDbStats {
	itemsProcessed: number
	itemsSucceeded: number
	itemsFailed: number
}

/** Base properties shared by all analysis jobs */
interface AnalysisJobBase {
	id: string
	status: AnalysisJobStatus
	startedAt?: Date
	dbStats: AnalysisJobDbStats
}

/**
 * Track batch job - analyzes multiple individual tracks
 * Progress tracked per-item via itemStates map
 */
export interface TrackBatchJob extends AnalysisJobBase {
	jobType: 'track_batch'
	/** Number of tracks in the batch */
	itemCount: number
	/** Per-track state tracking */
	itemStates: ItemStatesMap
}

/**
 * Playlist job - analyzes a playlist as an atomic unit
 * No per-item tracking; progress via dbStats only
 */
export interface PlaylistJob extends AnalysisJobBase {
	jobType: 'playlist'
	/** Always 1 for playlist jobs (the playlist itself) */
	itemCount: 1
}

/** Discriminated union of all job types */
export type AnalysisJob = TrackBatchJob | PlaylistJob

/** Type guard for track batch jobs */
export function isTrackBatchJob(job: AnalysisJob): job is TrackBatchJob {
	return job.jobType === 'track_batch'
}

/** Type guard for playlist jobs */
export function isPlaylistJob(job: AnalysisJob): job is PlaylistJob {
	return job.jobType === 'playlist'
}
