import { LoaderFunctionArgs } from 'react-router';
import { requireUserSession } from '~/features/auth/auth.utils';
import { SpotifyService } from '~/lib/services/SpotifyService';
import { logger } from '~/lib/logging/Logger';

export async function loader({ request, params }: LoaderFunctionArgs) {
  try {
    const session = await requireUserSession(request);
    const spotifyService = new SpotifyService(session.spotifyApi);
    const playlistId = params.playlistId;

    if (!playlistId) {
      return Response.json({ error: 'Playlist ID is required' }, { status: 400 });
    }

    logger.info('Fetching playlist image', { playlistId });
    const imageUrl = await spotifyService.getPlaylistImage(playlistId);

    // Cache the response for 1 hour
    return Response.json(
      { imageUrl },
      {
        headers: {
          'Cache-Control': 'public, max-age=3600'
        }
      }
    );

  } catch (error) {
    // Check if it's a specific Spotify error
    if (error instanceof logger.AppError) {
      logger.error('Spotify API error fetching playlist image', {
        playlistId: params.playlistId,
        error: error.message,
        statusCode: error.statusCode
      });

      // Return a more graceful response for expected errors
      if (error.statusCode === 404) {
        return Response.json({ error: 'Playlist not found', imageUrl: null }, { status: 200 });
      }
    } else {
      logger.error('Unexpected error fetching playlist image', {
        playlistId: params.playlistId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Return null imageUrl instead of error to allow graceful fallback
    return Response.json({ imageUrl: null }, { status: 200 });
  }
}