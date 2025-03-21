import type { Tables, TablesInsert, TablesUpdate } from '~/types/database.types'
import type { SyncStatus } from '~/lib/repositories/TrackRepository'
import { SavedTrackRow } from './Track'

export type Playlist = Tables<'playlists'>
export type PlaylistInsert = TablesInsert<'playlists'>
export type PlaylistUpdate = TablesUpdate<'playlists'>
export type PlaylistTrack = Tables<'playlist_tracks'>
export type PlaylistTrackInsert = TablesInsert<'playlist_tracks'>
export type PlaylistTrackUpdate = TablesUpdate<'playlist_tracks'>
export type PlaylistWithTracks = Playlist & { tracks: SavedTrackRow[] }

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
  getPlaylistAnalysis(playlistId: number): Promise<Tables<'playlist_analyses'> | null>
  updateSyncStatus(userId: number, status: SyncStatus): Promise<void>
  getLastSyncTime(userId: number): Promise<string | null>
  savePlaylistTracks(playlistTracks: PlaylistTrackInsert[]): Promise<void>
  getPlaylistTracks(playlistId: number): Promise<Array<{ track_id: number, spotify_track_id: string }>>
  removePlaylistTracks(playlistId: number, trackIds: number[]): Promise<void>
  updatePlaylistTrackCounts(updates: Array<{ id: number, track_count: number }>): Promise<void>
  deletePlaylists(playlistIds: number[]): Promise<void>
  getPlaylistsByIds(playlistIds: number[]): Promise<Playlist[]>
}
