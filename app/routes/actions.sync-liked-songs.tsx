import { ActionFunction } from 'react-router'
import { getUserSession } from '~/features/auth/auth.utils'
import { SpotifyService } from '~/lib/services/SpotifyService'
import { SyncService } from '~/lib/services/SyncService'
import { PlaylistService } from '~/lib/services/PlaylistService'
import { trackService } from '~/lib/services/TrackService'

export const action: ActionFunction = async ({ request }) => {
  try {
    const session = await getUserSession(request)
    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.userId
    if (!userId) {
      return Response.json({ error: 'User ID not found' }, { status: 400 })
    }

    const spotifyService = new SpotifyService(session.spotifyApi)
    const playlistService = new PlaylistService(spotifyService)
    const syncService = new SyncService(spotifyService, trackService, playlistService)

    // Sync saved tracks only
    const savedTracksResult = await syncService.syncSavedTracks(userId)

    return Response.json({
      success: true,
      result: savedTracksResult
    })
  } catch (error) {
    console.error('Liked songs sync error:', error)
    return Response.json({
      error: error instanceof Error ? error.message : 'Failed to sync liked songs'
    }, { status: 500 })
  }
}