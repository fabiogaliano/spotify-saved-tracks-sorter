import type { Database } from '~/types/database.types'
import type { SyncStatus } from '~/lib/repositories/TrackRepository'

export type Track = Database['public']['Tables']['tracks']['Row']
export type TrackInsert = Database['public']['Tables']['tracks']['Insert']
export type TrackUpdate = Database['public']['Tables']['tracks']['Update']

export type SavedTrack = Database['public']['Tables']['saved_tracks']['Row']
export type SavedTrackInsert = Database['public']['Tables']['saved_tracks']['Insert']

export interface SavedTrackRow {
  liked_at: string
  sorting_status: Database['public']['Enums']['sorting_status_enum'] | null
  track: {
    id: number
    spotify_track_id: string
    name: string
    artist: string
    album: string | null
  }
}

export type SavedTrackStore = {
  liked_at: SavedTrack['liked_at'];
  sorting_status: SavedTrack['sorting_status'];
} & Omit<Track, 'created_at'>;

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

export const mapSavedTrackToTrackInsert = (
  savedTrack: SavedTrackRow
): TrackInsert => ({
  spotify_track_id: savedTrack.track.spotify_track_id,
  name: savedTrack.track.name,
  artist: savedTrack.track.artist,
  album: savedTrack.track.album,
  created_at: new Date().toISOString(),
})

export const mapSpotifyTrackDTOToTrackInsert = (
  spotifyTrack: SpotifyTrackDTO
): TrackInsert => ({
  spotify_track_id: spotifyTrack.track.id,
  name: spotifyTrack.track.name,
  artist: spotifyTrack.track.artists[0].name,
  album: spotifyTrack.track.album.name,
  created_at: new Date().toISOString(),
})

export const mapPlaylistTrackToTrackInsert = (track: {
  id: string
  name: string
  artists: Array<{ name: string }>
  album: { name: string }
}): TrackInsert => ({
  spotify_track_id: track.id,
  name: track.name,
  artist: track.artists[0].name,
  album: track.album.name,
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
  getAllTracks(): Promise<Track[]>
  getTracksBySpotifyIds(spotifyTrackIds: string[]): Promise<Track[]>
  insertTracks(tracks: TrackInsert[]): Promise<Track[]>

  // Saved track operations
  getSavedTracks(userId: number): Promise<SavedTrackRow[]>
  saveSavedTracks(savedTracks: SavedTrackInsert[]): Promise<void>
  updateTrackStatus(trackId: number, status: Database['public']['Enums']['sorting_status_enum']): Promise<void>
  updateSyncStatus(userId: number, status: SyncStatus): Promise<void>
  getLastSyncTime(userId: number): Promise<string | null>
}
