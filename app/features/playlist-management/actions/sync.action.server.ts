import type { ActionFunctionArgs } from 'react-router';
import { SpotifyService, SyncService } from '~/lib/services';
import { requireUserSession } from '~/features/auth/auth.utils';
import { TrackService } from '~/lib/services/TrackService';
import { PlaylistService } from '~/lib/services/PlaylistService';

export async function action({ request }: ActionFunctionArgs) {
  try {
    const userSession = await requireUserSession(request);

    const spotifyService = new SpotifyService(userSession.spotifyApi)
    const syncService = new SyncService(
      spotifyService,
      new TrackService(),
      new PlaylistService(spotifyService)
    );

    const result = await syncService.syncPlaylists(userSession.userId);

    return Response.json(result);
  } catch (error) {

    return Response.json({
      success: false,
      error: 'Failed to sync playlists',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
