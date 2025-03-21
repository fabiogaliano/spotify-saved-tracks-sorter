import { redirect, type LoaderFunctionArgs } from '@remix-run/node'
import { getUserSession, requireUserSession } from '~/features/auth/auth.utils'
import { SavedTrackRow, TrackAnalysisStats } from '~/lib/models/Track'
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
  likedSongs: SavedTrackRow[],
  stats: TrackAnalysisStats
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    await requireUserSession(request)
    const userSession = await getUserSession(request)

    if (!userSession) {
      return Response.json({ user: null })
    }

    const savedTracks = await trackService.getUserTracksWithAnalysis(userSession.userId)

    const stats = await trackService.getTrackAnalysisStats(savedTracks)


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
    }

    return Response.json(safeUserData)
  } catch (error) {
    if (error instanceof Response) throw error
    return Response.json({ user: null }, { status: 500 })
  }
} 