import type { ActionFunctionArgs } from 'react-router';
import { requireUserSession } from '~/features/auth/auth.utils';
import { SpotifyService } from '~/lib/services/SpotifyService';
import { trackRepository } from '~/lib/repositories/TrackRepository';
import { playlistRepository } from '~/lib/repositories/PlaylistRepository';
import { logger } from '~/lib/logging/Logger';

interface AddTrackRequest {
  playlistId: number;
  trackId: number;
}

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const userSession = await requireUserSession(request);
  if (!userSession) {
    return Response.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const body: AddTrackRequest = await request.json();
    const { playlistId, trackId } = body;

    if (!playlistId || !trackId) {
      return Response.json({ error: 'Playlist ID and track ID are required' }, { status: 400 });
    }

    // Get playlist details
    const playlist = await playlistRepository.getPlaylistById(playlistId);
    if (!playlist || playlist.user_id !== userSession.userId) {
      return Response.json({ error: 'Playlist not found or not owned by user' }, { status: 404 });
    }

    // Get track details
    const track = await trackRepository.getTrackById(trackId);
    if (!track) {
      return Response.json({ error: 'Track not found' }, { status: 404 });
    }

    // Add track to Spotify playlist
    const spotifyService = new SpotifyService(userSession.spotifyApi);
    
    try {
      await spotifyService.addTrackToPlaylist(playlist.spotify_playlist_id, track.spotify_track_id);
      
      logger.info('Track added to playlist successfully', {
        playlistId,
        trackId,
        spotifyPlaylistId: playlist.spotify_playlist_id,
        spotifyTrackId: track.spotify_track_id,
        userId: userSession.userId
      });

      return Response.json({
        success: true,
        message: 'Track added to playlist successfully'
      });

    } catch (spotifyError) {
      logger.error('Failed to add track to Spotify playlist', spotifyError);
      return Response.json(
        { error: 'Failed to add track to playlist via Spotify API' },
        { status: 500 }
      );
    }

  } catch (error) {
    logger.error('Error adding track to playlist', error);
    return Response.json(
      { error: 'Failed to add track to playlist' },
      { status: 500 }
    );
  }
}