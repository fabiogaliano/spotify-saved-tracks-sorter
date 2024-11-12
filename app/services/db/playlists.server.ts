import { Playlist, Track } from '@fostertheweb/spotify-web-sdk'
import { getSupabase } from './db'
import { SYNC_STATUS, SYNC_TYPES } from '../api.sync_savedtracks'

import { Database } from '../../types/database.types'

export type PlaylistInsert = Database['public']['Tables']['playlists']['Insert']
export type TracksInsert = Database['public']['Tables']['tracks']['Insert']
export type PlaylistTracksInsert =
	Database['public']['Tables']['playlist_tracks']['Insert']

const supabase = getSupabase()

export async function insertPlaylists(playlists: PlaylistInsert) {
	try {
		const { data, error } = await supabase
			.from('playlists')
			.upsert(playlists, { onConflict: 'spotify_playlist_id' })
			.select('id, spotify_playlist_id, is_flagged')

		if (error) throw error
		return data
	} catch (error) {
		console.error('Error saving playlists:', error)
		throw new Error('Failed to save playlists')
	}
}

export async function insertPlaylistTracks(data: PlaylistTracksInsert[]) {
	try {
		const { error } = await supabase.from('playlist_tracks').upsert(data)

		if (error) throw error
	} catch (error) {
		console.error('Error saving playlist tracks:', error)
		throw new Error('Failed to save playlist tracks')
	}
}

export async function deleteMissingPlaylists(
	userId: number,
	currentSpotifyPlaylistIds: string[]
) {
	try {
		const { error } = await supabase
			.from('playlists')
			.delete()
			.eq('user_id', userId)
			.not('spotify_playlist_id', 'in', `(${currentSpotifyPlaylistIds.join(',')})`)

		if (error) throw error
	} catch (error) {
		console.error('Error deleting missing playlists:', error)
		throw new Error('Failed to delete missing playlists')
	}
}

export async function getFlaggedPlaylists(userId: number) {
	try {
		const { data, error } = await supabase
			.from('playlists')
			.select('id, spotify_playlist_id')
			.eq('user_id', userId)
			.eq('is_flagged', true)

		if (error) throw error
		return data
	} catch (error) {
		console.error('Error fetching flagged playlists:', error)
		throw new Error('Failed to fetch flagged playlists')
	}
}
