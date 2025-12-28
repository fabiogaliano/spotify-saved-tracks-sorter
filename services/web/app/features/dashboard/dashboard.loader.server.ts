import { type LoaderFunctionArgs } from 'react-router'

import { requireUserSession } from '~/features/auth/auth.utils'
import { Playlist } from '~/lib/models/Playlist'
import { TrackWithAnalysis } from '~/lib/models/Track'
import { PlaylistService } from '~/lib/services/PlaylistService'
import { SpotifyService } from '~/lib/services/SpotifyService'
import { trackService } from '~/lib/services/TrackService'

export type DashboardLoaderData = {
	user: {
		id: number
		spotify: {
			id: string
			name: string
			image: string
		}
	}
	likedSongs: Promise<TrackWithAnalysis[]>
	playlists: Promise<Playlist[]>
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
	try {
		const userSession = await requireUserSession(request)

		if (!userSession) {
			return { user: null }
		}

		// Critical data - returned immediately (not deferred)
		const userData = {
			id: userSession.userId,
			spotify: {
				id: userSession.spotifyUser.id,
				name: userSession.spotifyUser.name,
				image: userSession.spotifyUser.image || '',
			},
		}

		// Non-critical data - deferred and fetched in parallel
		// Both promises start executing immediately, React Router streams results
		const likedSongsPromise = trackService.getUserTracksWithAnalysis(userSession.userId)
		const playlistService = new PlaylistService(
			new SpotifyService(userSession.spotifyApi)
		)
		const playlistsPromise = playlistService.getPlaylists(userSession.userId)

		return {
			user: userData,
			likedSongs: likedSongsPromise, // Deferred - uses optimized RPC (single query)
			playlists: playlistsPromise, // Deferred
		} as DashboardLoaderData
	} catch (error) {
		if (error instanceof Response) throw error
		return { user: null, error: true }
	}
}
