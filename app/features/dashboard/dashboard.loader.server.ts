import { type LoaderFunctionArgs } from 'react-router';
import { getUserSession, requireUserSession } from '~/features/auth/auth.utils'
import { TrackAnalysisStats, TrackWithAnalysis } from '~/lib/models/Track'
import { PlaylistService } from '~/lib/services/PlaylistService'
import { trackService } from '~/lib/services/TrackService'
import { PlaylistWithTracks } from '~/lib/models/Playlist'
import { SpotifyService } from '~/lib/services/SpotifyService';

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

    const likedSongs = await trackService.getUserTracksWithAnalysis(userSession.userId)
    const stats = trackService.getTrackAnalysisStats(likedSongs)
    const playlistService = new PlaylistService(new SpotifyService(userSession.spotifyApi))
    const playlistsPromise = playlistService.getUserPlaylistsWithTracks(userSession.userId)

    return {
      user: userData,
      stats,
      likedSongs,
      playlistsWithTracks: playlistsPromise
    } as DashboardLoaderData
  } catch (error) {
    if (error instanceof Response) throw error
    return { user: null, error: true }
  }
}