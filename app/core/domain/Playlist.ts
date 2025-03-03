import type { Database } from '~/types/database.types'
import type { SyncStatus } from '~/core/repositories/TrackRepository'

export type Playlist = Database['public']['Tables']['playlists']['Row']
export type PlaylistInsert = Database['public']['Tables']['playlists']['Insert']
export type PlaylistUpdate = Database['public']['Tables']['playlists']['Update']
export type PlaylistTrack = Database['public']['Tables']['playlist_tracks']['Row']
export type PlaylistTrackInsert = Database['public']['Tables']['playlist_tracks']['Insert']
export type PlaylistTrackUpdate = Database['public']['Tables']['playlist_tracks']['Update']

// DTO for Spotify's playlist data structure
export type SpotifyPlaylistDTO = {
  id: string
  name: string
  description: string | null
  is_flagged: boolean
  owner: {
    id: string
  }
  track_count: number
  tracks?: {
    total: number
    items: Array<{
      added_at: string
      track: {
        id: string
        name: string
        artists: Array<{ name: string }>
        album: { name: string }
      }
    }>
  }
}

export const mapSpotifyPlaylistToPlaylistInsert = (
  playlist: SpotifyPlaylistDTO,
  userId: number
): PlaylistInsert => ({
  spotify_playlist_id: playlist.id,
  user_id: userId,
  name: playlist.name,
  description: playlist.description || '',
  is_flagged: playlist.is_flagged,
  track_count: playlist.tracks?.total ?? 0,
  updated_at: new Date().toISOString()
})

export interface PlaylistRepository {
  getPlaylists(userId: number): Promise<Playlist[]>
  savePlaylists(playlists: PlaylistInsert[]): Promise<Playlist[]>
  getPlaylistAnalysis(playlistId: number): Promise<Database['public']['Tables']['playlist_analyses']['Row'] | null>
  updateSyncStatus(userId: number, status: SyncStatus): Promise<void>
  getLastSyncTime(userId: number): Promise<string | null>
  savePlaylistTracks(playlistTracks: PlaylistTrackInsert[]): Promise<void>
  getPlaylistTracks(playlistId: number): Promise<Array<{ track_id: number, spotify_track_id: string }>>
  removePlaylistTracks(playlistId: number, trackIds: number[]): Promise<void>
  updatePlaylistTrackCounts(updates: Array<{ id: number, track_count: number }>): Promise<void>
  deletePlaylists(playlistIds: number[]): Promise<void>
  getPlaylistsByIds(playlistIds: number[]): Promise<Playlist[]>
}
