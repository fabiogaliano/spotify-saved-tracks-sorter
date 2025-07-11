import { getSupabase } from '~/lib/services/DatabaseService'
import type { Track, TrackInsert, SavedTrackInsert, SavedTrackRow, TrackRepository, TrackAnalysis } from '~/lib/models/Track'
import type { Database } from '~/types/database.types'

export const SYNC_STATUS = {
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const

export const SYNC_TYPES = {
  SONGS: 'songs',
  PLAYLISTS: 'playlists',
} as const

export type SyncStatus = typeof SYNC_STATUS[keyof typeof SYNC_STATUS];
export type SyncType = typeof SYNC_TYPES[keyof typeof SYNC_TYPES];

class SupabaseTrackRepository implements TrackRepository {
  async getAllTracks(): Promise<Track[]> {
    const { data, error } = await getSupabase()
      .from('tracks')
      .select('*')

    if (error) throw error
    return data || []
  }

  async getTracksBySpotifyIds(spotifyTrackIds: string[]): Promise<Track[]> {
    const { data, error } = await getSupabase()
      .from('tracks')
      .select('*')
      .in('spotify_track_id', spotifyTrackIds)

    if (error) throw error
    return data || []
  }

  async insertTracks(tracks: TrackInsert[]): Promise<Track[]> {
    const { data, error } = await getSupabase()
      .from('tracks')
      .upsert(tracks, { onConflict: 'spotify_track_id' })
      .select()

    if (error) throw error
    if (!data) throw new Error('Failed to insert tracks')
    return data
  }

  async getSavedTracks(userId: number): Promise<SavedTrackRow[]> {
    const { data, error } = await getSupabase()
      .from('saved_tracks')
      .select(`
        liked_at,
        sorting_status,
        track:tracks!inner(
          id,
          spotify_track_id,
          name,
          artist,
          album
        )
      `)
      .eq('user_id', userId)
      .order('liked_at', { ascending: false })

    if (error) {
      throw new Error('Failed to fetch saved tracks')
    }

    return data || []
  }

  async saveSavedTrack(savedTrack: SavedTrackInsert): Promise<void> {
    const { error } = await getSupabase()
      .from('saved_tracks')
      .upsert(savedTrack, {
        onConflict: 'track_id,user_id',
        ignoreDuplicates: true
      })

    if (error) throw error
  }

  async saveSavedTracks(savedTracks: SavedTrackInsert[]): Promise<SavedTrackRow[]> {
    if (savedTracks.length === 0) return []
    
    // Trust Spotify API filtering - just insert all tracks and return them
    const { data: insertedTracks, error } = await getSupabase()
      .from('saved_tracks')
      .insert(savedTracks)
      .select(`
        liked_at,
        sorting_status,
        track:tracks!inner(
          id,
          spotify_track_id,
          name,
          artist,
          album
        )
      `)
      .order('liked_at', { ascending: false })

    if (error) throw error
    
    return insertedTracks || []
  }

  async updateTrackStatus(
    trackId: number,
    status: Database['public']['Enums']['sorting_status_enum']
  ): Promise<void> {
    const { error } = await getSupabase()
      .from('saved_tracks')
      .update({ sorting_status: status })
      .eq('track_id', trackId)

    if (error) throw error
  }

  async getLastSyncTime(userId: number): Promise<string> {
    const { data, error } = await getSupabase()
      .from('users')
      .select('songs_last_sync')
      .eq('id', userId)
      .single()

    if (error) throw error
    return data?.songs_last_sync || ''
  }

  async updateSyncStatus(userId: number, status: SyncStatus): Promise<void> {
    const updateData: Record<string, any> = {
      songs_sync_status: status,
    }

    if (status === SYNC_STATUS.COMPLETED) {
      updateData.songs_last_sync = new Date().toISOString()
    }

    const { error } = await getSupabase()
      .from('users')
      .update(updateData)
      .eq('id', userId)

    if (error) throw error
  }

  async removeSavedTracks(userId: number, trackIds: string[]): Promise<void> {
    // ... existing implementation ...
  }

  async getTrackById(trackId: number): Promise<any> {
    const { data, error } = await getSupabase()
      .from('tracks')
      .select('*')
      .eq('id', trackId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') { // No rows returned
        return null
      }
      throw error
    }

    return data
  }

  async getTracksByIds(trackIds: number[]): Promise<any[]> {
    if (!trackIds.length) return []

    const { data, error } = await getSupabase()
      .from('tracks')
      .select('*')
      .in('id', trackIds)

    if (error) throw error
    return data || []
  }

  /**
   * Get all track analyses for the given track IDs
   */
  async getTrackAnalysesByTrackIds(trackIds: number[]): Promise<TrackAnalysis[]> {
    if (!trackIds.length) return []

    const { data, error } = await getSupabase()
      .from('track_analyses')
      .select('*')
      .in('track_id', trackIds)

    if (error) throw error
    return data || []
  }

  /**
   * Get only the latest version of track analyses for each track ID
   */
  async getLatestTrackAnalysesByTrackIds(trackIds: number[]): Promise<TrackAnalysis[]> {
    if (!trackIds.length) return []

    // First, get all analyses for these tracks
    const allAnalyses = await this.getTrackAnalysesByTrackIds(trackIds)

    // Then filter to keep only the latest version for each track
    const latestAnalysesMap = new Map<number, TrackAnalysis>()

    allAnalyses.forEach(analysis => {
      const currentLatest = latestAnalysesMap.get(analysis.track_id)

      if (!currentLatest || analysis.version > currentLatest.version) {
        latestAnalysesMap.set(analysis.track_id, analysis)
      }
    })

    return Array.from(latestAnalysesMap.values())
  }

  /**
   * Get analysis for a specific track ID
   */
  async getLatestTrackAnalysisByTrackId(trackId: number): Promise<TrackAnalysis | null> {
    const { data, error } = await getSupabase()
      .from('track_analyses')
      .select('*')
      .eq('track_id', trackId)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error
    return data
  }
}

export const trackRepository = new SupabaseTrackRepository()
