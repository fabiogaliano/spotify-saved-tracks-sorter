import { type LoaderFunctionArgs } from 'react-router';
import { requireUserSession } from '~/features/auth/auth.utils'
import { TrackWithAnalysis } from '~/lib/models/Track'
import { PlaylistService } from '~/lib/services/PlaylistService'
import { trackService } from '~/lib/services/TrackService'
import { Playlist } from '~/lib/models/Playlist'
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
  likedSongs: Promise<TrackWithAnalysis[]>,
  playlists: Promise<Playlist[]>
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const userSession = await requireUserSession(request)

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
    const playlistService = new PlaylistService(new SpotifyService(userSession.spotifyApi))
    const playlistsPromise = playlistService.getPlaylists(userSession.userId)

    return {
      user: userData,
      likedSongs: likedSongsPromise,
      playlists: playlistsPromise
    } as DashboardLoaderData
  } catch (error) {
    if (error instanceof Response) throw error
    return { user: null, error: true }
  }
}