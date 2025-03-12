import { LoaderFunctionArgs, json } from '@remix-run/node'
import { trackRepository } from '~/lib/repositories/TrackRepository'
import { trackAnalysisRepository } from '~/lib/repositories/TrackAnalysisRepository'
import { playlistAnalysisRepository } from '~/lib/repositories/PlaylistAnalysisRepository'
import { playlistRepository } from '~/lib/repositories/PlaylistRepository'
import { savedTrackRepository } from '~/lib/repositories/SavedTrackRepository'
import type { AnalyzedTrack, AnalyzedPlaylist } from '~/types/analysis'

// Database types that represent the actual structure from Supabase
interface DbPlaylistAnalysis {
  id: number;
  playlist_id: number;
  analysis: any;
}

interface DbPlaylist {
  id: number;
  name: string;
  description: string | null;
  spotify_playlist_id: string;
  user_id: number | null;
  is_flagged: boolean | null;
  track_count: number;
  created_at: string | null;
  updated_at: string | null;
}

interface DbTrack {
  id: number;
  spotify_track_id: string;
  name: string;
  artist: string;
  album: string | null;
  created_at: string | null;
}

interface DbSavedTrack {
  track_id: number;
  user_id: number;
  liked_at: string;
  sorting_status: string;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const userId = 1 // Replace with actual user ID from session

    // Get playlist analyses using the repository
    const playlistsWithAnalysis = await playlistAnalysisRepository.getAnalysesByUserId(userId)

    if (!playlistsWithAnalysis || playlistsWithAnalysis.length === 0) {
      return json({
        playlists: [] as AnalyzedPlaylist[],
        tracks: [] as AnalyzedTrack[]
      })
    }

    // Get playlist details for all playlists with analyses
    const playlistIds = playlistsWithAnalysis.map(pa => pa.playlist_id)

    let playlists: AnalyzedPlaylist[] = []

    if (playlistIds.length > 0) {
      // Use the repository to get playlists
      const fetchedPlaylists = await playlistRepository.getPlaylistsByIds(playlistIds)

      // Combine playlists with their analyses
      playlists = fetchedPlaylists.map(playlist => {
        const analysisRecord = playlistsWithAnalysis.find(pa => pa.playlist_id === playlist.id)
        return {
          ...playlist,
          description: playlist.description || undefined, // Convert null to undefined to match AnalyzedPlaylist type
          analysis: analysisRecord?.analysis || null
        } as AnalyzedPlaylist
      })
    }

    // Get all saved tracks for the user using the repository
    const savedTracks = await savedTrackRepository.getSavedTracksByUserId(userId)

    if (!savedTracks || savedTracks.length === 0) {
      return json({ playlists, tracks: [] as AnalyzedTrack[] })
    }

    // Get the track IDs
    const trackIds = savedTracks.map(st => st.track_id)

    // Get track details using the repository
    const trackDetails = await trackRepository.getTracksByIds(trackIds)

    if (!trackDetails || trackDetails.length === 0) {
      return json({ playlists, tracks: [] as AnalyzedTrack[] })
    }

    // Combine tracks with their saved_tracks data
    const tracksWithSavedInfo = trackDetails.map(track => {
      const savedTrack = savedTracks.find(st => st.track_id === track.id)
      return {
        ...track,
        album: track.album || undefined, // Convert null to undefined to match expected type
        liked_at: savedTrack?.liked_at || null,
        sorting_status: savedTrack?.sorting_status || 'unsorted'
      }
    })

    // Get the track analyses using repository
    const trackAnalyses = await trackAnalysisRepository.getAllAnalyses()

    // Filter analyses to only include those for our tracks
    const relevantAnalyses = trackAnalyses.filter(analysis =>
      trackIds.includes(analysis.track_id)
    )

    // Combine tracks with their analyses
    const tracksWithAnalyses: AnalyzedTrack[] = tracksWithSavedInfo.map(track => {
      const analysis = relevantAnalyses.find(a => a.track_id === track.id)
      return {
        ...track,
        album: track.album || undefined, // Convert null to undefined to match AnalyzedTrack
        analysis: analysis?.analysis || null
      } as AnalyzedTrack
    }).filter(track => track.analysis !== null)

    return json({
      playlists,
      tracks: tracksWithAnalyses
    })
  } catch (error) {
    console.error('Error in matching loader:', error)
    return json({
      playlists: [] as AnalyzedPlaylist[],
      tracks: [] as AnalyzedTrack[]
    })
  }
} 