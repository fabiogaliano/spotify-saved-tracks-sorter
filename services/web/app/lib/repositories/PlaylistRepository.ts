import { getSupabase } from '~/lib/services/DatabaseService'
import type { Database } from '~/types/database.types'
import { SYNC_STATUS, type SyncStatus } from './TrackRepository'
import type { Playlist, PlaylistInsert, PlaylistTrackInsert, PlaylistRepository as IPlaylistRepository, PlaylistTrack } from '~/lib/models/Playlist'
import type { Enums } from '~/types/database.types'

//todo: infer from models database types
export type PlaylistUpdateInput = {
  id: number;
  name: string;
  description: string;
  isFlagged: boolean;
}

class SupabasePlaylistRepository implements IPlaylistRepository {
  async getPlaylists(userId: number): Promise<Playlist[]> {
    const { data, error } = await getSupabase()
      .from('playlists')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  async getFlaggedPlaylists(userId: number): Promise<Playlist[]> {
    const { data, error } = await getSupabase()
      .from('playlists')
      .select('*')
      .eq('user_id', userId)
      .eq('is_flagged', true)
      .order('updated_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  async getUnflaggedPlaylists(userId: number): Promise<Playlist[]> {
    const { data, error } = await getSupabase()
      .from('playlists')
      .select('*')
      .eq('user_id', userId)
      .eq('is_flagged', false)
      .order('updated_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  async savePlaylists(playlists: PlaylistInsert[]): Promise<Playlist[]> {
    const { data, error } = await getSupabase()
      .from('playlists')
      .upsert(playlists, {
        onConflict: 'spotify_playlist_id',
        ignoreDuplicates: false
      })
      .select()

    if (error) throw error
    return data
  }

  async getPlaylistAnalysis(playlistId: number): Promise<Database['public']['Tables']['playlist_analyses']['Row'] | null> {
    const { data, error } = await getSupabase()
      .from('playlist_analyses')
      .select('*')
      .eq('playlist_id', playlistId)
      .single()

    if (error) throw error
    return data
  }

  async updateSyncStatus(userId: number, status: SyncStatus): Promise<void> {
    const { error } = await getSupabase()
      .from('users')
      .update({
        playlists_sync_status: status,
        playlists_last_sync: status === SYNC_STATUS.COMPLETED ? new Date().toISOString() : undefined
      })
      .eq('id', userId)

    if (error) throw error
  }
  async updatePlaylistTracksStatus(
    playlistId: number,
    status: Enums<'playlist_tracks_sync_status_enum'>
  ): Promise<void> {
    const { error } = await getSupabase()
      .from('playlists')
      .update({
        tracks_sync_status: status,
        tracks_last_synced_at: status === 'COMPLETED' ? new Date().toISOString() : undefined
      })
      .eq('id', playlistId)

    if (error) throw error
  }

  async getLastSyncTime(userId: number): Promise<string | null> {
    const { data, error } = await getSupabase()
      .from('users')
      .select('playlists_last_sync')
      .eq('id', userId)
      .single()

    if (error) throw error
    return data?.playlists_last_sync || null
  }

  async getPlaylistTracksLastSyncTime(playlistId: number): Promise<string | null> {
    const { data, error } = await getSupabase()
      .from('playlists')
      .select('tracks_last_synced_at')
      .eq('id', playlistId)
      .single()

    if (error) throw error
    return data?.tracks_last_synced_at || null
  }

  async savePlaylistTracks(playlistTracks: PlaylistTrackInsert[]): Promise<void> {
    const { error } = await getSupabase()
      .from('playlist_tracks')
      .insert(playlistTracks)

    if (error) throw error
  }

  async getPlaylistTracks(playlistId: number): Promise<Array<{ track_id: number, spotify_track_id: string }>> {
    const { data, error } = await getSupabase()
      .from('playlist_tracks')
      .select(`
        track_id,
        tracks (
          spotify_track_id
        )
      `)
      .eq('playlist_id', playlistId)

    if (error) throw error
    return (data || [])
      .filter((row): row is (typeof row & { tracks: { spotify_track_id: string } }) =>
        row.tracks !== null && typeof row.tracks.spotify_track_id === 'string')
      .map(row => ({
        track_id: row.track_id,
        spotify_track_id: row.tracks.spotify_track_id
      }))
  }

  async removePlaylistTracks(playlistId: number, trackIds: number[]): Promise<void> {
    const { error } = await getSupabase()
      .from('playlist_tracks')
      .delete()
      .eq('playlist_id', playlistId)
      .in('track_id', trackIds)

    if (error) throw error
  }

  async updatePlaylistTrackCounts(updates: Array<{ id: number, track_count: number }>): Promise<void> {
    if (updates.length === 0) return

    const supabase = getSupabase()
    const { error } = await supabase.rpc('batch_update_playlist_track_counts', {
      updates: updates.map(update => {
        return {
          playlist_id: update.id,
          track_count: update.track_count
        }
      })
    })

    if (error) throw error
  }

  async deletePlaylists(playlistIds: number[]): Promise<void> {
    const { error: deleteTracksError } = await getSupabase()
      .from('playlist_tracks')
      .delete()
      .in('playlist_id', playlistIds)

    if (deleteTracksError) throw deleteTracksError

    const { error: deletePlaylistsError } = await getSupabase()
      .from('playlists')
      .delete()
      .in('id', playlistIds)

    if (deletePlaylistsError) throw deletePlaylistsError
  }

  async getPlaylistsByIds(playlistIds: number[]): Promise<Playlist[]> {
    if (!playlistIds.length) return []

    const { data, error } = await getSupabase()
      .from('playlists')
      .select('*')
      .in('id', playlistIds)
      .order('name')

    if (error) throw error
    return data || []
  }

  async getPlaylistById(playlistId: number): Promise<Playlist | null> {
    const { data, error } = await getSupabase()
      .from('playlists')
      .select('*')
      .eq('id', playlistId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') { // The error code for no rows returned
        return null
      }
      throw error
    }
    return data
  }

  async getPlaylistTracksByUserId(userId: number): Promise<PlaylistTrack[]> {
    const { data, error } = await getSupabase()
      .from('playlist_tracks')
      .select('*')
      .eq('user_id', userId)

    if (error) throw error
    return data || []
  }


  async updatePlaylistInfo(
    playlist: PlaylistUpdateInput
  ): Promise<Playlist | null> {
    const { data, error } = await getSupabase()
      .from('playlists')
      .update({
        name: playlist.name,
        description: playlist.description,
        is_flagged: playlist.isFlagged,
        updated_at: new Date().toISOString()
      })
      .eq('id', playlist.id)
      .select()
      .single()

    if (error) throw error
    return data
  }
}

export const playlistRepository = new SupabasePlaylistRepository()
