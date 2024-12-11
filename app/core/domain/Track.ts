import type { Database } from '~/types/database.types'

export type Track = Database['public']['Tables']['tracks']['Row']
export type TrackInsert = Database['public']['Tables']['tracks']['Insert']
export type TrackUpdate = Database['public']['Tables']['tracks']['Update']

export type SavedTrack = Database['public']['Tables']['saved_tracks']['Row']
export type SavedTrackInsert = Database['public']['Tables']['saved_tracks']['Insert']

export interface SavedTrackRow {
  liked_at: string
  sorting_status: Database['public']['Enums']['sorting_status_enum'] | null
  tracks: {
    spotify_track_id: string
    name: string
    artist: string
    album: string | null
  }
}

// DTO for Spotify's saved track data structure
export type SpotifyTrackDTO = {
  track: {
    id: string
    name: string
    artists: Array<{ name: string }>
    album: {
      name: string
    }
  }
  added_at: string
}

export const mapSpotifyTrackToTrackInsert = (
  spotifyTrack: SpotifyTrackDTO
): TrackInsert => ({
  spotify_track_id: spotifyTrack.track.id,
  name: spotifyTrack.track.name,
  artist: spotifyTrack.track.artists[0].name,
  album: spotifyTrack.track.album.name,
  created_at: new Date().toISOString(),
})

export const mapToSavedTrackInsert = (
  trackId: number,
  userId: number,
  addedAt: string
): SavedTrackInsert => ({
  track_id: trackId,
  user_id: userId,
  liked_at: addedAt,
  sorting_status: 'unsorted'
})

export interface TrackRepository {
  // Track operations
  getTrackBySpotifyId(spotifyTrackId: string): Promise<Track | null>
  insertTrack(track: TrackInsert): Promise<Track>
  
  // Saved track operations
  getSavedTracks(userId: number): Promise<SavedTrackRow[]>
  saveSavedTrack(savedTrack: SavedTrackInsert): Promise<void>
  updateTrackStatus(trackId: number, status: Database['public']['Enums']['sorting_status_enum']): Promise<void>
}
