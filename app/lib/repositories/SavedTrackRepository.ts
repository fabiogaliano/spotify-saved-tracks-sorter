import { getSupabase } from '~/lib/db/db'

export type SortingStatus = 'unsorted' | 'sorted' | 'ignored'

export interface SavedTrack {
  track_id: number
  user_id: number
  liked_at: string
  sorting_status: SortingStatus | null
}

export interface SavedTrackWithDetails extends SavedTrack {
  track: {
    id: number
    spotify_track_id: string
    name: string
    artist: string
    album: string | null
    created_at: string | null
  }
}

class SavedTrackRepository {
  /**
   * Get all saved tracks for a user
   */
  async getSavedTracksByUserId(userId: number): Promise<SavedTrack[]> {
    const { data, error } = await getSupabase()
      .from('saved_tracks')
      .select('*')
      .eq('user_id', userId)

    if (error) {
      console.error('Error fetching saved tracks:', error)
      throw error
    }

    return data || []
  }

  /**
   * Get all saved tracks with track details for a user
   */
  async getSavedTracksWithDetailsByUserId(userId: number): Promise<SavedTrackWithDetails[]> {
    const { data, error } = await getSupabase()
      .from('saved_tracks')
      .select(`
        *,
        track:track_id (
          id,
          spotify_track_id,
          name,
          artist,
          album,
          created_at
        )
      `)
      .eq('user_id', userId)

    if (error) {
      console.error('Error fetching saved tracks with details:', error)
      throw error
    }

    return data || []
  }

  /**
   * Get saved tracks by status for a user
   */
  async getSavedTracksByStatus(userId: number, status: SortingStatus): Promise<SavedTrack[]> {
    const { data, error } = await getSupabase()
      .from('saved_tracks')
      .select('*')
      .eq('user_id', userId)
      .eq('sorting_status', status)

    if (error) {
      console.error(`Error fetching saved tracks with status ${status}:`, error)
      throw error
    }

    return data || []
  }

  /**
   * Update the sorting status of a track
   */
  async updateSortingStatus(userId: number, trackId: number, status: SortingStatus | null): Promise<void> {
    const { error } = await getSupabase()
      .from('saved_tracks')
      .update({ sorting_status: status })
      .eq('user_id', userId)
      .eq('track_id', trackId)

    if (error) {
      console.error(`Error updating sorting status for track ${trackId}:`, error)
      throw error
    }
  }

  /**
   * Batch update sorting statuses
   */
  async batchUpdateSortingStatus(userId: number, updates: { trackId: number, status: SortingStatus | null }[]): Promise<void> {
    if (updates.length === 0) return

    const promises = updates.map(update =>
      this.updateSortingStatus(userId, update.trackId, update.status)
    )

    await Promise.all(promises)
  }
}

export const savedTrackRepository = new SavedTrackRepository() 