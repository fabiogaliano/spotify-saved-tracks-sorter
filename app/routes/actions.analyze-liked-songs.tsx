/**
 * Action endpoint for submitting track analysis jobs to SQS
 */
import { ActionFunctionArgs } from 'react-router';
import { requireUserSession } from '~/features/auth/auth.utils';
import { sqsService, AnalysisJobPayload } from '~/lib/services/queue/SQSService';
import { jobPersistenceService } from '~/lib/services/JobPersistenceService';

// Define the structure of a single track received in the request
interface TrackForAnalysis {
  id: number; // Your internal DB track ID
  spotifyTrackId: string;
  artist: string;
  name: string;
}

// Define the expected request payload
interface AnalyzeTracksRequest {
  tracks: TrackForAnalysis[];
  batchSize?: 1 | 5 | 10; // Optional batch size for parallel processing
}

/**
 * Action function to handle track analysis job submission
 */
export async function action({ request }: ActionFunctionArgs) {
  const userSession = await requireUserSession(request);
  if (!userSession) {
    return Response.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const body = await request.json() as AnalyzeTracksRequest;

    if (!body.tracks || !Array.isArray(body.tracks) || body.tracks.length === 0) {
      return Response.json({ error: 'No tracks provided for analysis' }, { status: 400 });
    }

    // Generate a single batch ID for all tracks in this request
    const batchId = crypto.randomUUID();

    let enqueuedCount = 0;
    const enqueueErrors: { trackId: number, error: string }[] = [];

    for (const track of body.tracks) {
      if (!track.id || !track.spotifyTrackId || !track.artist || !track.name) {
        console.warn('Skipping track due to missing details:', track);
        enqueueErrors.push({ trackId: track.id, error: 'Missing track details' });
        continue;
      }
      const payload: AnalysisJobPayload = {
        trackId: String(track.id), // SQS service expects string trackId
        artist: track.artist,
        title: track.name, // Map 'name' from track to 'title' expected by SQS
        userId: userSession.userId, // Include user ID for provider preferences
        batchId: batchId, // Shared batch ID for all tracks in this request
        batchSize: body.batchSize || 1, // Default to 5 if not specified
      };

      try {
        await sqsService.enqueueAnalysisJob(payload);
        enqueuedCount++;
      } catch (err) {
        console.error(`Failed to enqueue track ${track.id}:`, err);
        enqueueErrors.push({ trackId: track.id, error: err instanceof Error ? err.message : String(err) });
      }
    }

    // Save job to database if any tracks were enqueued
    if (enqueuedCount > 0) {
      try {
        const contextJob = {
          id: batchId,
          status: 'pending' as const,
          trackCount: enqueuedCount,
          trackStates: new Map(),
          startedAt: new Date(),
          dbStats: {
            tracksProcessed: 0,
            tracksSucceeded: 0,
            tracksFailed: 0
          }
        };
        // Extract track IDs for the successfully enqueued tracks
        const enqueuedTrackIds = body.tracks
          .filter(track => !enqueueErrors.some(error => error.trackId === track.id))
          .map(track => track.id);

        await jobPersistenceService.saveJob(contextJob, userSession.userId, enqueuedTrackIds);
      } catch (error) {
        console.error('Failed to save job to database:', error);
        // Don't fail the request if job saving fails
      }
    }

    if (enqueuedCount > 0 && enqueueErrors.length === 0) {
      return Response.json({ success: true, message: `${enqueuedCount} track(s) queued for analysis.`, batchId });
    } else if (enqueuedCount > 0) {
      return Response.json(
        { success: true, message: `${enqueuedCount} track(s) queued, but ${enqueueErrors.length} failed.`, errors: enqueueErrors, batchId },
        { status: 207 } // Multi-Status
      );
    } else {
      return Response.json(
        { error: 'Failed to enqueue any tracks for analysis.', details: enqueueErrors },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error processing analysis job submission:', error);
    return Response.json(
      {
        error: 'Failed to process analysis job submission.',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
