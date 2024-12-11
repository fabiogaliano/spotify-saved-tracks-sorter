import type { Database } from '~/types/database.types'

export type Playlist = Database['public']['Tables']['playlists']['Row']
export type PlaylistInsert = Database['public']['Tables']['playlists']['Insert']
export type PlaylistUpdate = Database['public']['Tables']['playlists']['Update']

// DTO for Spotify's playlist data structure
export type SpotifyPlaylistDTO = {
  id: string
  name: string
  description: string | null
  owner: {
    id: string
  }
}

export const mapSpotifyPlaylistToPlaylistInsert = (
  playlist: SpotifyPlaylistDTO,
  userId: number
): PlaylistInsert => ({
  spotify_playlist_id: playlist.id,
  name: playlist.name,
  description: playlist.description || '',
  user_id: userId,
  created_at: new Date().toISOString(),
  is_flagged: playlist.description?.toLowerCase().startsWith('ai:') || false,
  updated_at: new Date().toISOString()
})

export interface PlaylistRepository {
  getPlaylists(userId: number): Promise<Playlist[]>
  savePlaylists(playlists: PlaylistInsert[]): Promise<void>
  getPlaylistAnalysis(playlistId: number): Promise<Database['public']['Tables']['playlist_analyses']['Row'] | null>
}
