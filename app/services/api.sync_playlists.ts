import { getSpotifyApi } from './spotify.server'
import { fetchPlaylists, fetchPlaylistTracks } from './spotify.playlists.server'
import { insertTracks, updateSyncStatus, getLastSyncTime } from './db/savedtracks.server'
import {
	insertPlaylists,
	insertPlaylistTracks,
	PlaylistTracksInsert,
	getFlaggedPlaylists,
} from './db/playlists.server'
import { SYNC_STATUS, SYNC_TYPES, SyncResult } from './api.sync_savedtracks'
import { Market, Track, UserProfile, Playlist } from '@fostertheweb/spotify-web-sdk'

// sync playlists and their tracks between spotify and db
export async function startSyncPlaylists(userId: number): Promise<SyncResult> {
	if (!userId || userId <= 0) {
		throw new Error('Invalid userId provided')
	}

	try {
		await updateSyncStatus({
			userId,
			status: SYNC_STATUS.IN_PROGRESS,
			type: SYNC_TYPES.PLAYLISTS,
		})

		const spotifyApi = getSpotifyApi()
		const spotifyUser = await spotifyApi.currentUser.profile()
		const playlists = await fetchPlaylists()
		const flaggedPlaylists = playlists.filter(p => p.owner.id === spotifyUser.id && p.description.toLowerCase().startsWith('ai:'))


		// fetch playlist tracks from Spotify + format them for database storage + calculate last update time
		const preparedAIPlaylists: PreparedPlaylist[] = await prepareAIPlaylistsForSync(
			{ spotify: spotifyUser, id: userId },
			flaggedPlaylists
		)

		const lastSyncTime = new Date(
			(await getLastSyncTime(userId, SYNC_TYPES.PLAYLISTS)) || 0
		)
		const existingFlaggedPlaylists = await getFlaggedPlaylists(userId)
		const existingPlaylistIds = new Set(
			existingFlaggedPlaylists.map(playlist => playlist.spotify_playlist_id)
		)

		const playlistsToSync = preparedAIPlaylists.filter(playlist => {
			const isNewPlaylist = !existingPlaylistIds.has(playlist.spotify_playlist_id)
			const hasBeenUpdated = playlist.updated_at > lastSyncTime
			return isNewPlaylist || hasBeenUpdated
		})

		if (playlistsToSync.length === 0) {
			await updateSyncStatus({
				userId,
				status: SYNC_STATUS.COMPLETED,
				type: SYNC_TYPES.PLAYLISTS,
			})
			return {
				success: true,
				message: 'No new playlists to sync.',
			}
		}

		const persistedPlaylists = await insertPlaylists(playlistsToSync, userId)

		// prepare and persist all tracks from all playlists
		const allTracks = playlistsToSync.flatMap(playlist =>
			playlist.tracks.map(track => ({
				track: {
					id: track.id,
					name: track.name,
					artists: [{ name: track.artists[0] }] as Partial<Track>['artists'],
					album: { name: track.album } as Partial<Track>['album'],
				} as Partial<Track>,
				added_at: track.added_at.toISOString(),
			}))
		)
		const persistedTracks = await insertTracks(allTracks)

		// prepare and persist playlist-track relationships
		const playlistTracksToInsert: PlaylistTracksInsert[] =
			playlistsToSync.flatMap(playlist =>
				playlist.tracks.map(track => ({
					user_id: userId,
					playlist_id: persistedPlaylists.find(
						p => p.spotify_playlist_id === playlist.spotify_playlist_id
					)?.id!,
					track_id: persistedTracks.find(t => t.spotify_track_id === track.id)?.id!,
					added_at: track.added_at.toISOString(),
				}))
			)
		await insertPlaylistTracks(playlistTracksToInsert)

		// TODO: clean up playlists that are no longer flagged or have been deleted

		await updateSyncStatus({
			userId,
			status: SYNC_STATUS.COMPLETED,
			type: SYNC_TYPES.PLAYLISTS,
		})

		return { success: true, message: 'Playlists sync completed successfully.' }
	} catch (error) {
		console.error('Error syncing playlists:', error)
		await updateSyncStatus({
			userId,
			status: SYNC_STATUS.FAILED,
			type: SYNC_TYPES.PLAYLISTS,
		})
		return { success: false, message: 'Playlists sync failed.' }
	}
}

async function prepareAIPlaylistsForSync(
	user: { id: number; spotify: UserProfile },
	aiFlaggedPlaylists: Array<Playlist>
): Promise<PreparedPlaylist[]> {
	const preparedPlaylists: PreparedPlaylist[] = []

	for (const playlist of aiFlaggedPlaylists) {
		const playlistTracks = await fetchPlaylistTracks(
			playlist.id,
			user.spotify.country as Market
		)

		const lastTrackAddedAt = playlistTracks.reduce((latestDate, item) => {
			const trackAddedAt = new Date(item.added_at)
			return trackAddedAt > latestDate ? trackAddedAt : latestDate
		}, new Date(0))

		preparedPlaylists.push({
			user_id: user.id,
			spotify_playlist_id: playlist.id,
			name: playlist.name,
			description: playlist.description || '',
			is_flagged: (playlist.description || '').toLowerCase().startsWith('ai:'),
			updated_at: lastTrackAddedAt,
			tracks: playlistTracks.map(item => ({
				id: item.track.id,
				name: item.track.name,
				added_at: new Date(item.added_at),
				artists: item.track.artists.map(artist => artist.name),
				album: item.track.album.name,
			})),
		})
	}

	return preparedPlaylists
}

export type PreparedPlaylist = {
	user_id: number
	spotify_playlist_id: string
	name: string
	description: string
	is_flagged: boolean
	updated_at: Date
	tracks: {
		id: string
		name: string
		added_at: Date
		artists: string[]
		album: string
	}[]
}
