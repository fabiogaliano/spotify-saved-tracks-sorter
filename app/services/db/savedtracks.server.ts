import { SavedTrack } from '@fostertheweb/spotify-web-sdk'
import { getSupabase } from './db'
import { FormattedSavedTrack, SYNC_STATUS, SYNC_TYPES } from '../api.sync_savedtracks'

export type SyncType = (typeof SYNC_TYPES)[keyof typeof SYNC_TYPES]

export async function persistTracks(tracks: SavedTrack[]) {
  const supabase = getSupabase()

  try {
    const { data, error } = await supabase
      .from('tracks')
      .upsert(
        tracks.map(item => ({
          spotify_track_id: item.track.id,
          name: item.track.name,
          artist: item.track.artists[0].name,
          album: item.track.album.name || null,
        })),
        { onConflict: 'spotify_track_id' }
      )
      .select('id, spotify_track_id')

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error saving tracks:', error)
    throw new Error('Failed to save tracks')
  }
}

export async function getSavedTracks(userId: number) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('saved_tracks')
    .select(
      `
            liked_at,
            tracks!inner(spotify_track_id)
        `
    )
    .eq('user_id', userId)
    .order('liked_at', { ascending: false })

  if (error) {
    throw new Error('Failed to fetch saved tracks')
  }

  return data
}

export async function persistSavedTracks(userId: number, tracks: FormattedSavedTrack[]) {
  const supabase = getSupabase()

  try {
    const { error } = await supabase.from('saved_tracks').upsert(
      tracks.map(track => ({
        user_id: userId,
        track_id: track.track_id,
        liked_at: track.added_at,
      })),
      { onConflict: 'user_id,track_id' }
    )

    if (error) throw error
  } catch (error) {
    console.error('Error saving user liked tracks:', error)
    throw new Error('Failed to save user liked tracks')
  }
}

export async function getLastSyncTime(userId: number, type: SyncType): Promise<string> {
  const supabase = getSupabase()
  const column = type === SYNC_TYPES.SONGS ? 'songs_last_sync' : 'playlists_last_sync'

  type UserSyncData = {
    id: number
    songs_last_sync?: string
    playlists_last_sync?: string
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .select(`id, ${column}`)
      .eq('id', userId)
      .single<UserSyncData>()

    if (error) throw error
    if (!data) throw new Error('User not found')

    return data[column] || ''
  } catch (error) {
    throw new Error(`Failed to fetch last sync time for ${type}: ${error}`)
  }
}

type SyncStatus = (typeof SYNC_STATUS)[keyof typeof SYNC_STATUS]

export async function updateSyncStatus({
  userId,
  type,
  status,
}: {
  userId: number
  type: SyncType
  status: SyncStatus
}) {
  const supabase = getSupabase()
  const statusColumn =
    type === SYNC_TYPES.SONGS ? 'songs_sync_status' : 'playlists_sync_status'
  const lastSyncColumn =
    type === SYNC_TYPES.SONGS ? 'songs_last_sync' : 'playlists_last_sync'

  try {
    const updateData: Record<string, any> = {
      [statusColumn]: status,
    }

    if (status === SYNC_STATUS.COMPLETED) {
      updateData[lastSyncColumn] = new Date().toISOString()
    }

    const { error } = await supabase.from('users').update(updateData).eq('id', userId)

    if (error) throw error
  } catch (error) {
    throw new Error(`Failed to update ${type} sync status: ${error}`)
  }
}
