import { LoaderFunctionArgs } from 'react-router'
import { requireUserSession } from '~/features/auth/auth.utils'
import { PlaylistService } from '~/lib/services/PlaylistService'
import { TrackService } from '~/lib/services/TrackService'
import { SpotifyService } from '~/lib/services/SpotifyService'
import { playlistAnalysisRepository } from '~/lib/repositories/PlaylistAnalysisRepository'

export async function loader({ request, params }: LoaderFunctionArgs) {
  const user = await requireUserSession(request)
  const userId = parseInt(params.userId as string)

  // Ensure user can only access their own data
  if (user.userId !== userId) {
    throw new Response('Forbidden', { status: 403 })
  }

  try {
    console.log(`[Matching API] Loading data for user ${userId}...`)

    // Initialize services
    const spotifyService = new SpotifyService(user.spotifyApi)
    const playlistService = new PlaylistService(spotifyService)
    const trackService = new TrackService()

    // Get ALL flagged playlists for the user (not just analyzed ones)
    const flaggedPlaylists = await playlistService.getFlaggedPlaylists(userId)
    console.log(`[Matching API] Found ${flaggedPlaylists.length} flagged playlists`)

    // Get playlist analyses for flagged playlists
    const playlistsWithAnalysis = await Promise.all(
      flaggedPlaylists.map(async (playlist) => {
        try {
          const analysis = await playlistAnalysisRepository.getAnalysisByPlaylistId(playlist.id)
          return {
            ...playlist,
            analysis: analysis?.analysis || null
          }
        } catch (error) {
          console.log(`[Matching API] No analysis found for playlist ${playlist.id}`)
          return {
            ...playlist,
            analysis: null
          }
        }
      })
    )

    const analyzedCount = playlistsWithAnalysis.filter(p => p.analysis).length
    console.log(`[Matching API] Found ${analyzedCount} playlists with analysis`)

    // Get user's liked songs that have been analyzed
    const userTracksWithAnalysis = await trackService.getUserTracksWithAnalysis(userId)
    console.log(`[Matching API] Found ${userTracksWithAnalysis.length} user tracks`)

    // Filter only tracks that have analysis and limit to 10 for testing
    const analyzedTracks = userTracksWithAnalysis
      .filter(track => track.analysis !== null)

    console.log(`[Matching API] Found ${analyzedTracks.length} tracks with analysis`)

    // Transform to the expected format
    const tracksWithAnalysis = analyzedTracks.map(track => ({
      id: track.track.id,
      name: track.track.name,
      artist: track.track.artist,
      album: track.track.album,
      spotify_id: track.track.spotify_track_id,
      liked_at: track.liked_at,
      sorting_status: track.sorting_status,
      analysis: track.analysis
    }))

    return Response.json({
      playlists: playlistsWithAnalysis,
      tracks: tracksWithAnalysis
    })

  } catch (error) {
    console.error('[Matching API] Error loading data:', error)
    return Response.json(
      { error: 'Failed to load matching data' },
      { status: 500 }
    )
  }
}