import { redirect, type LoaderFunctionArgs } from '@remix-run/node'
import { getUserSession, requireUserSession } from '~/features/auth/auth.utils'
import { SavedTrackRow, TrackAnalysisStats, TrackWithAnalysis } from '~/lib/models/Track'
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
  likedSongs: TrackWithAnalysis[],
  stats: TrackAnalysisStats,
  playlistsWithTracks: PlaylistWithTracks[]
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    await requireUserSession(request)
    const userSession = await getUserSession(request)

    if (!userSession) {
      return Response.json({ user: null })
    }

    const savedTracks: TrackWithAnalysis[] = await trackService.getUserTracksWithAnalysis(userSession.userId)

    const stats = await trackService.getTrackAnalysisStats(savedTracks)

    const playlists = await playlistService.getUserPlaylistsWithTracks(userSession.userId, savedTracks)

    const safeUserData: DashboardLoaderData = {
      user: {
        id: userSession.userId,
        spotify: {
          id: userSession.spotifyUser.id,
          name: userSession.spotifyUser.name,
          image: userSession.spotifyUser.image || ''
        }
      },
      likedSongs: savedTracks,
      stats,
      playlistsWithTracks: playlists
    }

    return Response.json(safeUserData)
  } catch (error) {
    if (error instanceof Response) throw error
    return Response.json({ user: null }, { status: 500 })
  }
} 