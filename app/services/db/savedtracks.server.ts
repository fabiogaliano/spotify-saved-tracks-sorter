import { SavedTrack, Track } from '@fostertheweb/spotify-web-sdk'
import { getSupabase } from './db'
import { FormattedSavedTrack, SYNC_STATUS, SYNC_TYPES } from '../api.sync_savedtracks'
import { Database } from '~/types/database.types'

export type SyncType = (typeof SYNC_TYPES)[keyof typeof SYNC_TYPES]

const supabase = getSupabase()

export async function insertTracks(tracks: (SavedTrack | { track: Partial<Track>, added_at: string })[]) {
	try {
		const { data, error } = await supabase
			.from('tracks')
			.upsert(
				tracks.map(item => ({
					spotify_track_id: item.track.id!,
					name: item.track.name!,
					artist: item.track.artists?.[0]?.name ?? 'Unknown Artist',
					album: item.track.album?.name || null,
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

export async function getSavedTracks(userId: number): Promise<SavedTrackRow[]> {
	const { data, error } = await supabase
		.from('saved_tracks')
		.select(`
			liked_at,
			sorting_status,
			tracks!inner(
				spotify_track_id,
				name,
				artist,
				album
			)
		`)
		.eq('user_id', userId)
		.order('liked_at', { ascending: false })

	if (error) {
		throw new Error('Failed to fetch saved tracks')
	}

	return data
}

export async function persistSavedTracks(userId: number, tracks: FormattedSavedTrack[]) {
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

export async function updateTrackStatus(
	userId: number,
	trackId: number,
	status: Database['public']['Enums']['sorting_status_enum']
) {
	try {
		const { error } = await supabase
			.from('saved_tracks')
			.update({ sorting_status: status })
			.eq('user_id', userId)
			.eq('track_id', trackId)

		if (error) throw error
		return true
	} catch (error) {
		console.error('Error updating track status:', error)
		throw new Error('Failed to update track status')
	}
}
