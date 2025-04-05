import { type LoaderFunctionArgs } from 'react-router';
import { getUserSession, requireUserSession } from '~/features/auth/auth.utils'
import { TrackWithAnalysis } from '~/lib/models/Track'
import { PlaylistService } from '~/lib/services/PlaylistService'
import { trackService } from '~/lib/services/TrackService'
import { Playlist, PlaylistWithTracks } from '~/lib/models/Playlist'
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
  aiEnabledPlaylistsWithTracks: Promise<PlaylistWithTracks[]>,
  otherPlaylists: Promise<Playlist[]>
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
    const playlistService = new PlaylistService(new SpotifyService(userSession.spotifyApi))
    const aiEnabledPlaylistsPromise = playlistService.getAIEnabledPlaylistsWithTracks(userSession.userId)
    const otherPlaylistsPromise = playlistService.getUnflaggedPlaylists(userSession.userId)

    return {
      user: userData,
      likedSongs: likedSongsPromise,
      aiEnabledPlaylistsWithTracks: aiEnabledPlaylistsPromise,
      otherPlaylists: otherPlaylistsPromise
    } as DashboardLoaderData
  } catch (error) {
    if (error instanceof Response) throw error
    return { user: null, error: true }
  }
}