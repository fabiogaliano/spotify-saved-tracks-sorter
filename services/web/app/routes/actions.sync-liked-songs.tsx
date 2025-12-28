import { ActionFunction } from 'react-router'

import { getUserSession } from '~/features/auth/auth.utils'
import { PlaylistService } from '~/lib/services/PlaylistService'
import { SpotifyService } from '~/lib/services/SpotifyService'
import { SyncService } from '~/lib/services/SyncService'
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
		console.log(JSON.stringify(savedTracksResult, null, 2))

		// Transform the result to match the expected format
		// TODO: Later figure out a solution to clean up liked songs that are removed from Spotify
		// Currently we only track additions, not removals
		return Response.json({
			success: true,
			result: {
				added: savedTracksResult.newItems || 0,
				removed: 0, // Not implemented yet - see TODO above
				total: savedTracksResult.totalProcessed || 0,
			},
		})
	} catch (error) {
		console.error('Liked songs sync error:', error)
		return Response.json(
			{
				error: error instanceof Error ? error.message : 'Failed to sync liked songs',
			},
			{ status: 500 }
		)
	}
}
