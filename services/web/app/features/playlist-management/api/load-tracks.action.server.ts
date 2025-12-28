import type { ActionFunctionArgs } from 'react-router'

import { requireUserSession } from '~/features/auth/auth.utils'
import { SpotifyService } from '~/lib/services'
import { PlaylistService } from '~/lib/services/PlaylistService'

export async function action({ request }: ActionFunctionArgs) {
	try {
		const userSession = await requireUserSession(request)
		const formData = await request.formData()

		const playlistId = formData.get('playlistId')

		if (!playlistId) {
			return Response.json(
				{
					success: false,
					error: 'Playlist ID is required',
				},
				{ status: 400 }
			)
		}

		const spotifyService = new SpotifyService(userSession.spotifyApi)
		const playlistService = new PlaylistService(spotifyService)

		// Get playlist tracks from the database
		const tracks = await playlistService.getPlaylistTracks(Number(playlistId))

		return Response.json({
			success: true,
			tracks,
		})
	} catch (error) {
		return Response.json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Failed to load playlist tracks',
			},
			{ status: 500 }
		)
	}
}
