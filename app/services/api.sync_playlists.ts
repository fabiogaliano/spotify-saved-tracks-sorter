import { getSpotifyApi } from './spotify.server'
import { fetchPlaylists, fetchPlaylistTracks } from './spotify.playlists.server'
import { insertTracks, updateSyncStatus, getLastSyncTime } from './db/savedtracks.server'
import {
	insertPlaylists,
	insertPlaylistTracks,
	deleteMissingPlaylists,
	getFlaggedPlaylists,
	PlaylistInsert,
	PlaylistTracksInsert
} from './db/playlists.server'
import { SYNC_STATUS, SYNC_TYPES } from './api.sync_savedtracks'
import {
	Market,
	PlaylistedTrack,
	Track,
	UserProfile,
	Playlist,
} from '@fostertheweb/spotify-web-sdk'
import { Database } from '../types/database.types'

// sync playlists and their tracks between spotify and db
export async function startSyncPlaylists(userId: number) {
	if (!userId || userId <= 0) {
		throw new Error('Invalid userId provided')
	}

	try {
		const spotifyApi = getSpotifyApi()

		await updateSyncStatus({
			userId,
			status: SYNC_STATUS.IN_PROGRESS,
			type: SYNC_TYPES.PLAYLISTS,
		})

		const spotifyUser = await spotifyApi.currentUser.profile()
		const ownedPlaylists = (await fetchPlaylists()).filter(
			p => p.owner.id === spotifyUser.id
		)
		const flaggedPlaylists = ownedPlaylists.filter(p =>
			p.description.toLowerCase().startsWith('ai:') // flagged playlists with 'ai:' in description are able to receive saved tracks
		)

		// fetch tracks + obtain date from the last added to each playlist
		const processedFlaggedPlaylists = await processFlaggedPlaylists(
			{ spotify: spotifyUser, id: userId },
			flaggedPlaylists
		)

		const hasPlaylistChanges = async (
			userId: number,
			playlists: ProcessedPlaylist[]
		): Promise<boolean> => {
			const lastSync = new Date(
				await getLastSyncTime(userId, SYNC_TYPES.PLAYLISTS) || 0
			)
			return playlists.some(playlist => playlist.updated_at > lastSync)
		}

		if (!await hasPlaylistChanges(userId, processedFlaggedPlaylists)) {
			await updateSyncStatus({
				userId,
				status: SYNC_STATUS.COMPLETED,
				type: SYNC_TYPES.PLAYLISTS,
			})
			return {
				success: true,
				message: 'No new playlists to sync. Sync completed.'
			}
		}

		// Replace the persistence section with this updated code
		const playlistsToInsert: PlaylistInsert[] = processedFlaggedPlaylists.map(playlist => ({
			user_id: userId,
			spotify_playlist_id: playlist.spotify_playlist_id,
			name: playlist.name,
			description: playlist.description,
			is_flagged: playlist.is_flagged,
			updated_at: playlist.updated_at.toISOString()
		}))

		// Persist playlists first
		const persistedPlaylists = await insertPlaylists(playlistsToInsert[0])

		// Prepare and persist all tracks from all playlists
		const allTracks = processedFlaggedPlaylists.flatMap(playlist =>
			playlist.tracks.map(track => ({
				track: {
					id: track.id,
					name: track.name,
					artists: [{ name: track.artists[0] }] as Partial<Track>['artists'],
					album: { name: track.album } as Partial<Track>['album']
				} as Partial<Track>,
				added_at: track.added_at.toISOString()
			}))
		)
		const persistedTracks = await insertTracks(allTracks)

		// Prepare and persist playlist-track relationships
		const playlistTracksToInsert: PlaylistTracksInsert[] = processedFlaggedPlaylists.flatMap(playlist =>
			playlist.tracks.map(track => ({
				user_id: userId,
				playlist_id: persistedPlaylists.find(p => p.spotify_playlist_id === playlist.spotify_playlist_id)?.id!,
				track_id: persistedTracks.find(t => t.spotify_track_id === track.id)?.id!,
				added_at: track.added_at.toISOString()
			}))
		)
		await insertPlaylistTracks(playlistTracksToInsert)

		// Clean up playlists that are no longer flagged or have been deleted
		const currentSpotifyPlaylistIds = processedFlaggedPlaylists.map(p => p.spotify_playlist_id)
		await deleteMissingPlaylists(userId, currentSpotifyPlaylistIds)

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

async function processFlaggedPlaylists(
	user: { id: number; spotify: UserProfile },
	flaggedUserPlaylists: Array<Playlist>
): Promise<ProcessedPlaylist[]> {
	const spotifyApi = getSpotifyApi()

	const processedPlaylists: ProcessedPlaylist[] = []

	for (const playlist of flaggedUserPlaylists) {
		const playlistTracks = await fetchPlaylistTracks(
			playlist.id,
				user.spotify.country as Market
		)

		let lastAddedTrackAt = new Date(0)
		playlistTracks.forEach(item => {
			const addedAt = new Date(item.added_at)
			if (addedAt > lastAddedTrackAt) {
				lastAddedTrackAt = addedAt
			}
		})

		processedPlaylists.push({
			user_id: user.id,
			spotify_playlist_id: playlist.id,
			name: playlist.name,
			description: playlist.description || '',
			is_flagged: (playlist.description || '').toLowerCase().startsWith('ai:'),
			updated_at: lastAddedTrackAt,
			tracks: playlistTracks.map(item => ({
				id: item.track.id,
				name: item.track.name,
				added_at: new Date(item.added_at),
				artists: item.track.artists.map(artist => artist.name),
				album: item.track.album.name
			}))
		})
	}

	return processedPlaylists
}

type ProcessedPlaylist = {
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
