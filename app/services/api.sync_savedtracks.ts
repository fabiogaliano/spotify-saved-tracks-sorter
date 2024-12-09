import { getSpotifyApi } from './spotify.server'
import { fetchSavedTracks } from './spotify.savedtracks.server'
import {
	insertTracks,
	persistSavedTracks,
	updateSyncStatus,
	getLastSyncTime,
} from './db/savedtracks.server'
import { SavedTrack } from '@fostertheweb/spotify-web-sdk'

export const SYNC_STATUS = {
	IN_PROGRESS: 'in_progress',
	COMPLETED: 'completed',
	FAILED: 'failed',
} as const

export const SYNC_TYPES = {
	SONGS: 'songs',
	PLAYLISTS: 'playlists',
} as const

export interface SyncResult {
	success: boolean
	message: string
}

export async function startSyncSavedTracks(userId: number): Promise<SyncResult> {
	if (!userId || userId <= 0) {
		throw new Error('Invalid userId provided')
	}

	try {
		await updateSyncStatus({
			userId,
			status: SYNC_STATUS.IN_PROGRESS,
			type: SYNC_TYPES.SONGS,
		})

		const spotifyApi = getSpotifyApi()
		const lastSyncDate = new Date((await getLastSyncTime(userId, SYNC_TYPES.SONGS)) || 0)

		const newTracks = await fetchSavedTracks(spotifyApi, lastSyncDate)

		if (!newTracks?.length) {
			await updateSyncStatus({
				userId,
				status: SYNC_STATUS.COMPLETED,
				type: SYNC_TYPES.SONGS,
			})
			return { success: true, message: 'No new tracks to sync. Sync completed.' }
		}

		const persistedTracks = await insertTracks(newTracks)
		const formattedTracks = formatTracksForPersistence(newTracks, persistedTracks)
		await persistSavedTracks(userId, formattedTracks)

		await updateSyncStatus({
			userId,
			status: SYNC_STATUS.COMPLETED,
			type: SYNC_TYPES.SONGS,
		})
		return { success: true, message: 'Sync completed successfully.' }
	} catch (error) {
		console.error('Error syncing tracks:', error)
		await updateSyncStatus({
			userId,
			status: SYNC_STATUS.FAILED,
			type: SYNC_TYPES.SONGS,
		})
		return { success: false, message: 'Sync failed.' }
	}
}

function formatTracksForPersistence(
	spotifyTracks: SavedTrack[],
	persistedTracks: { id: number; spotify_track_id: string }[]
): FormattedSavedTrack[] {
	const spotifyTracksMap = new Map(
		spotifyTracks.map(track => [track.track.id, track.added_at])
	)

	return persistedTracks
		.map(({ id, spotify_track_id }) => {
			const added_at = spotifyTracksMap.get(spotify_track_id)
			return added_at ? { track_id: id, added_at } : undefined
		})
		.filter((track): track is FormattedSavedTrack => track !== undefined)
}

export interface FormattedSavedTrack {
	track_id: number
	added_at: string
}
