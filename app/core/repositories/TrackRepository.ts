import { getSupabase } from '~/core/db/db'
import type { Track, TrackInsert, SavedTrackInsert, SavedTrackRow, TrackRepository } from '../domain/Track'
import type { Database } from '~/types/database.types'

class SupabaseTrackRepository implements TrackRepository {
  async getTrackBySpotifyId(spotifyTrackId: string): Promise<Track | null> {
    const { data, error } = await getSupabase()
      .from('tracks')
      .select('*')
      .eq('spotify_track_id', spotifyTrackId)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data
  }

  async insertTrack(track: TrackInsert): Promise<Track> {
    const { data, error } = await getSupabase()
      .from('tracks')
      .upsert(track, { onConflict: 'spotify_track_id' })
      .select()
      .single()

    if (error) throw error
    if (!data) throw new Error('Failed to insert track')
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
}

export const trackRepository = new SupabaseTrackRepository()
