import {
	Market,
	MaxInt,
	Page,
	Playlist,
	PlaylistedTrack,
	SpotifyApi,
	Track,
} from '@fostertheweb/spotify-web-sdk'
import { getSpotifyApi } from './spotify.server'

export async function fetchPlaylists() {
	const LIMIT = 50
	let offset = 0
	const playlists: Playlist[] = []
	let shouldContinue = true

	while (shouldContinue) {
		const response = (await fetchPlaylistsWithRetry(LIMIT, offset)) as Page<Playlist>
		playlists.push(...response.items)

		if (response.items.length < LIMIT) {
			shouldContinue = false
			break
		}
		offset += LIMIT
	}

	return playlists
}

async function fetchPlaylistsWithRetry(
	limit: MaxInt<50>,
	offset: number,
	maxRetries: number = 3
) {
	const spotifyApi = getSpotifyApi()
	let attempt = 0

	while (attempt <= maxRetries) {
		try {
			const response = await spotifyApi.currentUser.playlists.playlists(limit, offset)
			// Filter out any null items and ensure we have valid Playlist objects
			return {
				...response,
				items: response.items.filter((playlist): playlist is Playlist => 
					playlist != null && typeof playlist === 'object'
				)
			}
		} catch (error: any) {
			if (error.status === 429) {
				const retryAfter = parseInt(error.headers.get('Retry-After') || '1', 10)
				console.warn(
					`Rate limited. Retrying after ${retryAfter} seconds... (Attempt ${
						attempt + 1
					}/${maxRetries})`
				)
				await sleep(retryAfter * 1000)
				attempt++
			} else {
				throw error
			}
		}
	}

	throw new Error('Maximum retry attempts reached. Unable to fetch playlists.')
}

export async function fetchPlaylistTracks(playlistId: string, market: Market) {
	market = 'PT'
	const LIMIT = 50
	let offset = 0
	const allTracks: PlaylistedTrack<Track>[] = []
	let shouldContinue = true

	while (shouldContinue) {
		const options: FetchPlaylistTracksOpt = {
			playlistId,
			offset,
			market,
			limit: LIMIT,
		}

		const response = await fetchPlaylistTracksWithRetry(options)

		if (!response || !response.items) {
			console.warn(`No tracks found for playlist ${playlistId}`)
			break
		}

		allTracks.push(...response.items)

		if (response.items.length < LIMIT) {
			shouldContinue = false
			break
		}
		offset += LIMIT
	}

	return allTracks
}

type FetchPlaylistTracksOpt = {
	playlistId: string
	limit: MaxInt<50>
	offset: number
	market: Market
}

async function fetchPlaylistTracksWithRetry(options: FetchPlaylistTracksOpt) {
	const spotifyApi = getSpotifyApi()
	const MAX_RETRIES = 3
	let attempt = 0
	const { playlistId, limit, offset, market } = options

	const fields = 'items(added_at,track(id,name,artists(name),album(name)))'

	while (attempt <= MAX_RETRIES) {
		try {
			const response = await spotifyApi.playlists.getPlaylistItems(
				playlistId,
				market,
				fields,
				limit,
				offset
			)

			if (!response || typeof response !== 'object') {
				throw new Error(`Invalid response format for playlist ${playlistId}`)
			}

			return response
		} catch (error: any) {
			if (error.status === 429) {
				const retryAfter = parseInt(error.headers.get('Retry-After') || '1', 10)
				await sleep(retryAfter * 1000)
				attempt++
			} else {
				console.error(`Error fetching playlist ${playlistId}:`, error)
				throw error
			}
		}
	}

	throw new Error('Maximum retry attempts reached. Unable to fetch playlist tracks.')
}

function sleep(ms: number) {
	return new Promise(resolve => setTimeout(resolve, ms))
}
