import { type LoaderFunctionArgs } from '@remix-run/node'
import { getUserSession, requireUserSession } from '~/features/auth/auth.utils'
import { TrackAnalysisStats, TrackWithAnalysis } from '~/lib/models/Track'
import { playlistService } from '~/lib/services/PlaylistService'
import { trackService } from '~/lib/services/TrackService'
import { PlaylistWithTracks } from '~/lib/models/Playlist'

export type DashboardLoaderData = {
  user: {
    id: number
    spotify: {
      id: string
      name: string
      image: string
    }
  }
  likedSongs: Promise<TrackWithAnalysis[]>,
  stats: Promise<TrackAnalysisStats>,
  playlistsWithTracks: Promise<PlaylistWithTracks[]>
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    await requireUserSession(request)
    const userSession = await getUserSession(request)

    if (!userSession) {
      return { user: null }
    }

    const userData = {
      id: userSession.userId,
      spotify: {
        id: userSession.spotifyUser.id,
        name: userSession.spotifyUser.name,
        image: userSession.spotifyUser.image || ''
      }
    }

    const likedSongsPromise = trackService.getUserTracksWithAnalysis(userSession.userId)
    const statsPromise = likedSongsPromise.then(tracks =>
      trackService.getTrackAnalysisStats(tracks)
    )
    const playlistsPromise = likedSongsPromise.then(tracks =>
      playlistService.getUserPlaylistsWithTracks(userSession.userId, tracks)
    )

    return {
      user: userData,
      likedSongs: likedSongsPromise,
      stats: statsPromise,
      playlistsWithTracks: playlistsPromise
    }
  } catch (error) {
    if (error instanceof Response) throw error
    return { user: null, error: true }
  }
}