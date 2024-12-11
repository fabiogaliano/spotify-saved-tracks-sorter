import { getSupabase } from '~/core/db/db'
import type { Playlist, PlaylistInsert, PlaylistRepository } from '../domain/Playlist'
import type { Database } from '~/types/database.types'

class SupabasePlaylistRepository implements PlaylistRepository {
  async getPlaylists(userId: number): Promise<Playlist[]> {
    const { data, error } = await getSupabase()
      .from('playlists')
      .select('*')
      .eq('user_id', userId)
      .order('name')

    if (error) throw error
    return data || []
  }

  async savePlaylists(playlists: PlaylistInsert[]): Promise<void> {
    const { error } = await getSupabase()
      .from('playlists')
      .upsert(playlists, { onConflict: 'spotify_playlist_id' })

    if (error) throw error
  }

  async getPlaylistAnalysis(playlistId: number): Promise<Database['public']['Tables']['playlist_analyses']['Row'] | null> {
    const { data, error } = await getSupabase()
      .from('playlist_analyses')
      .select('*')
      .eq('playlist_id', playlistId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') throw error // PGRST116 is "no rows returned"
    return data
  }
}

export const playlistRepository = new SupabasePlaylistRepository()
