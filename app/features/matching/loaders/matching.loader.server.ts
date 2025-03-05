import { LoaderFunctionArgs, json } from '@remix-run/node'
import { getSupabase } from '~/lib/db/db'
import { trackRepository } from '~/lib/repositories/TrackRepository'
import { trackAnalysisRepository } from '~/lib/repositories/TrackAnalysisRepository'
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

    // Get playlists with analyses
    const { data: playlistsWithAnalysis, error: playlistError } = await getSupabase()
      .from('playlist_analyses')
      .select('id, playlist_id, analysis')
      .eq('user_id', userId)

    if (playlistError) {
      console.error('Error fetching playlist analyses:', playlistError)
      return json({ playlists: [] as AnalyzedPlaylist[], tracks: [] as AnalyzedTrack[] })
    }

    console.log('Playlists with analysis:', playlistsWithAnalysis?.length || 0)

    let playlists: AnalyzedPlaylist[] = []
    if (playlistsWithAnalysis && playlistsWithAnalysis.length > 0) {
      const playlistIds = playlistsWithAnalysis.map(pa => pa.playlist_id) || []

      const { data: fetchedPlaylists, error: fetchPlaylistsError } = await getSupabase()
        .from('playlists')
        .select('*')
        .in('id', playlistIds)

      if (fetchPlaylistsError) {
        console.error('Error fetching playlists:', fetchPlaylistsError)
      } else {
        // Combine playlists with their analyses
        playlists = (fetchedPlaylists || []).map((playlist: DbPlaylist) => {
          const analysisRecord = (playlistsWithAnalysis as DbPlaylistAnalysis[]).find(pa => pa.playlist_id === playlist.id)
          return {
            ...playlist,
            description: playlist.description || undefined, // Convert null to undefined to match AnalyzedPlaylist type
            analysis: analysisRecord?.analysis || null
          } as AnalyzedPlaylist
        })
      }
    }

    // Get all saved tracks for the user, regardless of sorting status
    // This allows the front-end to filter based on selected tracks in the store
    const { data: savedTracks, error: savedTracksError } = await getSupabase()
      .from('saved_tracks')
      .select('*')
      .eq('user_id', userId)

    if (savedTracksError) {
      console.error('Error fetching saved tracks:', savedTracksError)
      return json({ playlists, tracks: [] as AnalyzedTrack[] })
    }

    // Get the track details
    const trackIds = (savedTracks || []).map(st => st.track_id)
    let tracks: DbTrack[] = []

    if (trackIds.length > 0) {
      const { data: trackDetails, error: trackDetailsError } = await getSupabase()
        .from('tracks')
        .select('*')
        .in('id', trackIds)

      if (trackDetailsError) {
        console.error('Error fetching track details:', trackDetailsError)
      } else {
        // Combine tracks with their saved_tracks data
        tracks = (trackDetails || []).map((track: DbTrack) => {
          const savedTrack = (savedTracks as DbSavedTrack[])?.find(st => st.track_id === track.id)
          return {
            ...track,
            album: track.album || undefined, // Convert null to undefined to match expected type
            liked_at: savedTrack?.liked_at || null,
            track_id: track.id,
            sorting_status: savedTrack?.sorting_status || 'unsorted'
          } as unknown as DbTrack // Cast back to DbTrack after modification
        })
      }
    }

    // Get the track analyses
    const trackAnalyses = await trackAnalysisRepository.getAllAnalyses()

    // Filter analyses to only include those for our tracks
    const relevantAnalyses = trackAnalyses.filter(analysis =>
      trackIds.includes(analysis.track_id)
    )

    // Combine tracks with their analyses
    const tracksWithAnalyses: AnalyzedTrack[] = tracks.map((track: DbTrack) => {
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