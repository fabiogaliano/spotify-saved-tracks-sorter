import { analysisJobRepository, AnalysisJob as DBAnalysisJob, AnalysisJobInsert } from '~/lib/repositories/AnalysisJobRepository';
import { AnalysisJob } from '~/features/liked-songs-management/context/LikedSongsContext';
import { trackAnalysisAttemptsRepository } from '~/lib/repositories/TrackAnalysisAttemptsRepository';
import { trackAnalysisRepository } from '~/lib/repositories/TrackAnalysisRepository';

export class JobPersistenceService {

  async saveJob(job: AnalysisJob, userId: number, trackIds: number[]): Promise<DBAnalysisJob> {
    const jobData: AnalysisJobInsert = {
      user_id: userId,
      batch_id: job.id,
      status: job.status,
      track_count: job.trackCount,
      tracks_processed: 0,
      tracks_succeeded: 0,
      tracks_failed: 0,
      track_ids: trackIds,
    };

    return await analysisJobRepository.createJob(jobData);
  }

  async getActiveJobForUser(userId: number): Promise<AnalysisJob | null> {
    const dbJob = await analysisJobRepository.getActiveJobForUser(userId);
    if (!dbJob) return null;

    console.log('Raw dbJob from database:', dbJob);
    
    // Only return active jobs to client - filter out old completed jobs
    // This prevents old completed jobs from showing up after reload
    if (dbJob.status === 'completed' || dbJob.status === 'failed') {
      console.log(`Job ${dbJob.batch_id} is completed/failed, not returning to client`);
      return null;
    }

    // Get the original track IDs from the job
    const trackIds = (dbJob.track_ids as number[]) || [];

    console.log('Extracted track_ids:', trackIds, 'Type:', typeof dbJob.track_ids, 'Raw value:', dbJob.track_ids);

    if (trackIds.length === 0) {
      console.warn(`Job ${dbJob.batch_id} has no track_ids stored. This might be an old job created before track_ids were implemented.`);
      return null; // Cannot recover job without track IDs
    }

    console.log(`Recovering job ${dbJob.batch_id} with ${trackIds.length} track IDs:`, trackIds);

    // Reconstruct the trackStates map from track_analysis_attempts and track_analyses
    const attempts = await trackAnalysisAttemptsRepository.getAttemptsByJobId(dbJob.batch_id);

    console.log(`Found ${attempts.length} attempts for job ${dbJob.batch_id}:`, attempts);

    // Create a map of track_id -> attempt status
    const attemptStatusMap = new Map<number, string>();
    attempts.forEach(attempt => {
      attemptStatusMap.set(attempt.track_id, attempt.status || '');
    });

    console.log('Attempt status map:', Array.from(attemptStatusMap.entries()));

    // For tracks with no attempt record, check if they have completed analyses
    const trackIdsWithoutAttempts = trackIds.filter(trackId => !attemptStatusMap.has(trackId));
    const completedTrackIds = new Set<number>();
    
    // Batch check for completed analyses to avoid N+1 queries
    if (trackIdsWithoutAttempts.length > 0) {
      try {
        // Check which tracks have completed analyses
        for (const trackId of trackIdsWithoutAttempts) {
          const analysis = await trackAnalysisRepository.getByTrackId(trackId);
          if (analysis) {
            completedTrackIds.add(trackId);
          }
        }
      } catch (error) {
        console.error('Error checking for completed analyses during job recovery:', error);
        // Continue with recovery even if this check fails
      }
    }

    // Build complete track states map using original track list
    const trackStates = new Map<number, 'queued' | 'in_progress' | 'completed' | 'failed'>();

    trackIds.forEach(trackId => {
      const attemptStatus = attemptStatusMap.get(trackId);
      let state: 'queued' | 'in_progress' | 'completed' | 'failed' = 'queued';

      if (attemptStatus) {
        // Track has an attempt record
        switch (attemptStatus) {
          case 'IN_PROGRESS':
            state = 'in_progress';
            break;
          case 'FAILED':
            state = 'failed';
            break;
          default:
            // Shouldn't happen, but default to queued
            state = 'queued';
        }
      } else if (completedTrackIds.has(trackId)) {
        // No attempt record but has completed analysis - it's done
        state = 'completed';
      } else {
        // No attempt record and no completed analysis - truly queued/pending
        state = 'queued';
      }

      trackStates.set(trackId, state);
    });

    console.log(`Recovered trackStates for job ${dbJob.batch_id}:`, Array.from(trackStates.entries()));
    console.log(`TrackStates breakdown - Queued: ${Array.from(trackStates.values()).filter(s => s === 'queued').length}, ` +
                `In Progress: ${Array.from(trackStates.values()).filter(s => s === 'in_progress').length}, ` +
                `Completed: ${Array.from(trackStates.values()).filter(s => s === 'completed').length}, ` +
                `Failed: ${Array.from(trackStates.values()).filter(s => s === 'failed').length}`);

    // Check if job should be marked as completed or is stale
    let finalStatus = dbJob.status;
    const totalProcessed = dbJob.tracks_processed;
    const expectedTotal = dbJob.track_count;
    const jobAge = dbJob.created_at ? Date.now() - new Date(dbJob.created_at).getTime() : 0;
    const jobAgeMinutes = jobAge / (1000 * 60);
    
    // Check completion based on trackStates as well as DB counters
    const completedTracksFromStates = Array.from(trackStates.values()).filter(s => s === 'completed' || s === 'failed').length;
    const isCompleteByStates = completedTracksFromStates >= expectedTotal;
    const isCompleteByDB = totalProcessed >= expectedTotal;
    
    console.log('Job completion analysis:', {
      finalStatus,
      totalProcessed,
      expectedTotal,
      completedTracksFromStates,
      isCompleteByStates,
      isCompleteByDB,
      jobAgeMinutes: jobAgeMinutes.toFixed(1)
    });
    
    if (finalStatus === 'in_progress' || finalStatus === 'pending') {
      if (isCompleteByDB || isCompleteByStates) {
        // All tracks processed, mark as complete
        console.log(`Job ${dbJob.batch_id} is complete (DB: ${totalProcessed}/${expectedTotal}, States: ${completedTracksFromStates}/${expectedTotal}), updating status`);
        finalStatus = 'completed';
        this.markJobCompleted(dbJob.batch_id).catch(error => {
          console.error('Failed to mark job as completed:', error);
        });
      } else if (jobAgeMinutes > 30) {
        // Job is over 30 minutes old and still in progress - likely stale
        console.log(`Job ${dbJob.batch_id} appears stale (DB: ${totalProcessed}/${expectedTotal}, States: ${completedTracksFromStates}/${expectedTotal}, ${jobAgeMinutes.toFixed(1)}min old), marking as failed`);
        finalStatus = 'failed';
        this.markJobFailed(dbJob.batch_id).catch(error => {
          console.error('Failed to mark stale job as failed:', error);
        });
      }
    }

    const contextJob: AnalysisJob = {
      id: dbJob.batch_id,
      status: finalStatus,
      trackCount: dbJob.track_count,
      trackStates,
      startedAt: dbJob.created_at ? new Date(dbJob.created_at) : new Date(),
      // Include database stats for accurate progress display
      dbStats: {
        tracksProcessed: dbJob.tracks_processed,
        tracksSucceeded: dbJob.tracks_succeeded,
        tracksFailed: dbJob.tracks_failed
      }
    };

    return contextJob;
  }

  async updateJobProgress(batchId: string, tracksProcessed: number, tracksSucceeded: number, tracksFailed: number): Promise<void> {
    await analysisJobRepository.updateJobProgress(batchId, tracksProcessed, tracksSucceeded, tracksFailed);
  }

  async markJobCompleted(batchId: string): Promise<void> {
    await analysisJobRepository.markJobAsCompleted(batchId);
  }

  async markJobFailed(batchId: string): Promise<void> {
    await analysisJobRepository.markJobAsFailed(batchId);
  }

  async getJobCounts(batchId: string): Promise<{ processed: number; succeeded: number; failed: number }> {
    const job = await analysisJobRepository.getJobByBatchId(batchId);
    if (!job) {
      return { processed: 0, succeeded: 0, failed: 0 };
    }

    return {
      processed: job.tracks_processed,
      succeeded: job.tracks_succeeded,
      failed: job.tracks_failed
    };
  }
}

export const jobPersistenceService = new JobPersistenceService();