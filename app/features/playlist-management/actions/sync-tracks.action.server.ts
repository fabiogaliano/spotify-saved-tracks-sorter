import type { ActionFunctionArgs } from 'react-router';
import { SpotifyService, SyncService } from '~/lib/services';
import { requireUserSession } from '~/features/auth/auth.utils';
import { TrackService } from '~/lib/services/TrackService';
import { PlaylistService } from '~/lib/services/PlaylistService';

export async function action({ request }: ActionFunctionArgs) {
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Request timed out after 30 seconds')), 30000);
  });

  try {
    const userSession = await requireUserSession(request);
    const formData = await request.formData();
    const playlistId = formData.get('playlistId');

    if (!playlistId) {
      return Response.json({
        success: false,
        error: 'Playlist ID is required',
      }, { status: 400 });
    }

    const spotifyService = new SpotifyService(userSession.spotifyApi);
    const syncService = new SyncService(
      spotifyService,
      new TrackService(),
      new PlaylistService(spotifyService)
    );

    const result = await Promise.race([
      syncService.syncPlaylistTracks(userSession.userId, [Number(playlistId)]),
      timeoutPromise
    ]);

    return Response.json(result);
  } catch (error) {
    const isTimeout = error instanceof Error && error.message.includes('timed out');

    return Response.json({
      success: false,
      error: isTimeout ? 'Request timed out, but sync may still be processing in the background' : 'Failed to sync playlist tracks',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: isTimeout ? 504 : 500 });
  }
}
