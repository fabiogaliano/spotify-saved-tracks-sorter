/**
 * Action endpoint for submitting playlist analysis jobs to SQS
 */
import { ActionFunctionArgs } from 'react-router';
import { requireUserSession } from '~/features/auth/auth.utils';
import { sqsService, AnalysisJobPayload } from '~/lib/services/queue/SQSService';
import { jobPersistenceService } from '~/lib/services/JobPersistenceService';
import { PlaylistService } from '~/lib/services/PlaylistService';
import { SpotifyService } from '~/lib/services/SpotifyService';
import { logger } from '~/lib/logging/Logger';

// Define the expected request payload
interface AnalyzePlaylistRequest {
  playlistId: string;
}

/**
 * Action function to handle playlist analysis job submission
 */
export async function action({ request }: ActionFunctionArgs) {
  const userSession = await requireUserSession(request);
  if (!userSession) {
    return Response.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const body: AnalyzePlaylistRequest = {
      playlistId: formData.get('playlistId') as string
    };

    if (!body.playlistId) {
      return Response.json({ error: 'No playlist ID provided for analysis' }, { status: 400 });
    }

    // Get playlist details
    const spotifyService = new SpotifyService(userSession.spotifyApi);
    const playlistService = new PlaylistService(spotifyService);

    // Parse playlist ID to number and get playlist details
    const playlistId = parseInt(body.playlistId);
    if (isNaN(playlistId)) {
      return Response.json({ error: 'Invalid playlist ID' }, { status: 400 });
    }
    
    const playlists = await playlistService.getPlaylistsByIds([playlistId]);
    const playlist = playlists[0];
    
    if (!playlist || playlist.user_id !== userSession.userId) {
      return Response.json({ error: 'Playlist not found' }, { status: 404 });
    }

    // Generate a batch ID for this analysis
    const batchId = crypto.randomUUID();

    const payload: AnalysisJobPayload = {
      type: 'playlist',
      playlistId: playlist.id.toString(),
      playlistName: playlist.name,
      playlistDescription: playlist.description || '',
      userId: userSession.userId,
      batchId: batchId,
      batchSize: 1
    };

    try {
      await sqsService.enqueueAnalysisJob(payload);
      logger.info(`Successfully enqueued playlist analysis job`, {
        playlistId: playlist.id,
        batchId,
        userId: userSession.userId
      });
    } catch (err) {
      logger.error(`Failed to enqueue playlist ${playlist.id}:`, err);
      return Response.json(
        { error: 'Failed to enqueue playlist for analysis', details: err instanceof Error ? err.message : String(err) },
        { status: 500 }
      );
    }

    // Save job to database
    try {
      const contextJob = {
        id: batchId,
        status: 'pending' as const,
        trackCount: 1, // Single playlist counts as 1 item
        trackStates: new Map(),
        startedAt: new Date(),
        dbStats: {
          tracksProcessed: 0,
          tracksSucceeded: 0,
          tracksFailed: 0
        }
      };

      // For playlist analysis, we'll use the playlist ID as the "track" ID
      await jobPersistenceService.saveJob(contextJob, userSession.userId, [playlist.id]);
    } catch (error) {
      logger.error('Failed to save job to database:', error);
      // Don't fail the request if job saving fails
    }

    return Response.json({
      success: true,
      message: 'Playlist queued for analysis',
      batchId,
      playlistId: playlist.id.toString()
    });

  } catch (error) {
    logger.error('Error processing playlist analysis job submission:', error);
    return Response.json(
      {
        error: 'Failed to process playlist analysis job submission',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}