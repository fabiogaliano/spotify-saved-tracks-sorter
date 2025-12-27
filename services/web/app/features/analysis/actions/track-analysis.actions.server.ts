import { ActionFunctionArgs } from 'react-router';
import { trackAnalysisRepository } from "~/lib/repositories/TrackAnalysisRepository";
import { trackRepository } from "~/lib/repositories/TrackRepository";
import { sqsService, AnalysisJobPayload } from "~/lib/services/queue/SQSService";
import { jobPersistenceService } from '~/lib/services/JobPersistenceService';
import { requireUserSession } from '~/features/auth/auth.utils';
import { logger } from '~/lib/logging/Logger';
import { TrackBatchJob, ItemStatesMap } from '~/lib/types/analysis.types';

export const action = async ({ request }: ActionFunctionArgs) => {
  // requireUserSession throws redirect if no session - never returns null
  const userSession = await requireUserSession(request);

  const contentType = request.headers.get('content-type') || '';

  // Handle JSON request (batch analysis)
  if (contentType.includes('application/json')) {
    const body = await request.json();
    const { trackIds, batchSize, batchId: clientBatchId } = body as {
      trackIds: number[];
      batchSize?: number;
      batchId?: string;
    };

    if (!trackIds || !Array.isArray(trackIds) || trackIds.length === 0) {
      return { success: false, error: 'No trackIds provided', status: 400 };
    }

    // Validate all trackIds are numbers
    const invalidIds = trackIds.filter(id => typeof id !== 'number' || Number.isNaN(id));
    if (invalidIds.length > 0) {
      return { success: false, error: 'Invalid trackIds: all must be numbers', status: 400 };
    }

    // Fetch track metadata from DB - single source of truth
    const tracks = await trackRepository.getTracksByIds(trackIds);
    if (tracks.length === 0) {
      return { success: false, error: 'No tracks found for provided IDs', status: 404 };
    }

    // Log if some tracks weren't found
    if (tracks.length !== trackIds.length) {
      const foundIds = new Set(tracks.map(t => t.id));
      const missingIds = trackIds.filter(id => !foundIds.has(id));
      logger.warn('Some tracks not found', { missingIds, requestedCount: trackIds.length, foundCount: tracks.length });
    }

    // Use client-provided batchId if available (eliminates race condition),
    // otherwise generate a new one for backwards compatibility
    const batchId = clientBatchId || crypto.randomUUID();

    // Build payloads from DB data - guaranteed correct metadata
    const payloads: Omit<AnalysisJobPayload, 'batchId'>[] = tracks.map(track => ({
      type: 'track' as const,
      trackId: String(track.id),
      spotifyTrackId: track.spotify_track_id,
      artist: track.artist,
      title: track.name,
      userId: userSession.userId,
      batchSize: batchSize as 1 | 5 | 10 | undefined,
    }));

    // DB-first approach: Save job record before enqueueing to SQS
    // This ensures job is always trackable and recoverable on page refresh
    try {
      // 1. Save to DB first (source of truth for job tracking)
      const itemStates: ItemStatesMap = new Map();
      tracks.forEach(track => itemStates.set(track.id, 'queued'));

      const contextJob: TrackBatchJob = {
        id: batchId,
        jobType: 'track_batch',
        status: 'pending',
        itemCount: tracks.length,
        itemStates,
        startedAt: new Date(),
        dbStats: {
          itemsProcessed: 0,
          itemsSucceeded: 0,
          itemsFailed: 0
        }
      };

      await jobPersistenceService.saveJob(contextJob, userSession.userId, tracks.map(t => t.id));

      // 2. Then enqueue to SQS
      try {
        const { results } = await sqsService.enqueueBatchAnalysisJobs(payloads, batchId);

        logger.info('Batch track analysis enqueued', {
          batchId,
          trackCount: tracks.length,
          userId: userSession.userId
        });

        return {
          success: true,
          batchId,
          trackIds: tracks.map(t => t.id),
          totalQueued: results.length
        };
      } catch (sqsError) {
        // 3. SQS failed - rollback by marking job as failed
        logger.error('SQS enqueue failed, rolling back job record:', sqsError);
        await jobPersistenceService.markJobFailed(batchId);

        return {
          success: false,
          error: 'Failed to queue analysis. Please try again.',
          status: 500
        };
      }
    } catch (dbError) {
      // DB save failed - clean failure, nothing to rollback
      logger.error('Failed to create job record:', dbError);
      return {
        success: false,
        error: 'Failed to create analysis job. Please try again.',
        status: 500
      };
    }
  }

  // Handle form data request (single track analysis)
  const formData = await request.formData();
  const formAction = formData.get('action');

  if (formAction === 'analyze') {
    const trackIdRaw = formData.get('trackId') as string;

    if (!trackIdRaw) {
      return { success: false, error: 'Missing trackId', status: 400 };
    }

    const trackId = parseInt(trackIdRaw, 10);
    if (Number.isNaN(trackId)) {
      return { success: false, error: 'Invalid trackId: must be a number', status: 400 };
    }

    try {
      // Fetch track from DB - single source of truth for metadata
      const track = await trackRepository.getTrackById(trackId);
      if (!track) {
        return { success: false, error: 'Track not found', status: 404 };
      }

      const existingAnalysis = await trackAnalysisRepository.getByTrackId(trackId);
      if (existingAnalysis) {
        return { success: true, trackId, analysisId: existingAnalysis.id, alreadyAnalyzed: true };
      }

      const jobPayload: Omit<AnalysisJobPayload, 'batchId'> = {
        type: 'track',
        trackId: String(track.id),
        spotifyTrackId: track.spotify_track_id,
        artist: track.artist,
        title: track.name,
        userId: userSession.userId,
      };

      const { batchId } = await sqsService.enqueueAnalysisJob(jobPayload);

      logger.info('Single track analysis enqueued', { batchId, trackId, userId: userSession.userId });

      return { success: true, trackId, batchId, queued: true };

    } catch (error) {
      logger.error('Error in single track analysis action:', error);
      return {
        success: false,
        error: 'Failed to process analysis request.',
        status: 500,
      };
    }
  }

  return { success: false, error: 'Unknown action', status: 400 }
} 