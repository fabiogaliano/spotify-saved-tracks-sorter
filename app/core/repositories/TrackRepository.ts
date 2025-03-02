import { getSupabase } from '~/core/db/db'
import type { Track, TrackInsert, SavedTrackInsert, SavedTrackRow, TrackRepository } from '../domain/Track'
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
        tracks!inner(
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

  async saveSavedTracks(savedTracks: SavedTrackInsert[]): Promise<void> {
    const { error } = await getSupabase()
      .from('saved_tracks')
      .upsert(savedTracks, {
        onConflict: 'track_id,user_id',
        ignoreDuplicates: true
      })

    if (error) throw error
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
}

export const trackRepository = new SupabaseTrackRepository()
