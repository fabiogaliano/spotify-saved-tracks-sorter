import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router';
import { requireUserSession } from '~/features/auth/auth.utils';
import { playlistAnalysisStore } from '~/lib/services/PlaylistAnalysisStore';
import { sqsService, AnalysisJobPayload } from '~/lib/services/queue/SQSService';
import { jobPersistenceService } from '~/lib/services/JobPersistenceService';
import { PlaylistService } from '~/lib/services/PlaylistService';
import { SpotifyService } from '~/lib/services/SpotifyService';
import { logger } from '~/lib/logging/Logger';

export async function loader({ request, params }: LoaderFunctionArgs) {
  const userSession = await requireUserSession(request);
  if (!userSession) {
    return Response.json({ error: 'Authentication required' }, { status: 401 });
  }

  const playlistId = params.playlistId;
  if (!playlistId) {
    return Response.json({ error: 'Playlist ID is required' }, { status: 400 });
  }

  try {
    const numericPlaylistId = parseInt(playlistId);
    if (isNaN(numericPlaylistId)) {
      return Response.json({ error: 'Invalid playlist ID' }, { status: 400 });
    }

    const analysis = await playlistAnalysisStore.getAnalysis(numericPlaylistId);

    if (!analysis) {
      return Response.json({ error: 'Analysis not found' }, { status: 404 });
    }

    return Response.json({
      success: true,
      analysis: analysis.analysis,
      modelName: analysis.model_name,
      createdAt: analysis.created_at
    });
  } catch (error) {
    logger.error('Error fetching playlist analysis:', error);
    return Response.json(
      { error: 'Failed to fetch playlist analysis' },
      { status: 500 }
    );
  }
}

export async function action({ request, params }: ActionFunctionArgs) {
  const userSession = await requireUserSession(request);
  if (!userSession) {
    return Response.json({ error: 'Authentication required' }, { status: 401 });
  }

  const playlistId = params.playlistId;
  if (!playlistId) {
    return Response.json({ error: 'Playlist ID is required' }, { status: 400 });
  }

  try {
    const numericPlaylistId = parseInt(playlistId);
    if (isNaN(numericPlaylistId)) {
      return Response.json({ error: 'Invalid playlist ID' }, { status: 400 });
    }

    // Get playlist details
    const spotifyService = new SpotifyService(userSession.spotifyApi);
    const playlistService = new PlaylistService(spotifyService);

    const playlists = await playlistService.getPlaylistsByIds([numericPlaylistId]);
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
        trackCount: 1,
        trackStates: new Map(),
        startedAt: new Date(),
        dbStats: {
          tracksProcessed: 0,
          tracksSucceeded: 0,
          tracksFailed: 0
        }
      };

      await jobPersistenceService.saveJob(contextJob, userSession.userId, [playlist.id]);
    } catch (error) {
      logger.error('Failed to save job to database:', error);
    }

    return Response.json({
      success: true,
      message: 'Playlist queued for analysis',
      batchId,
      playlistId: playlist.id.toString()
    });

  } catch (error) {
    logger.error('Error triggering playlist analysis:', error);
    return Response.json(
      { error: 'Failed to trigger playlist analysis' },
      { status: 500 }
    );
  }
}