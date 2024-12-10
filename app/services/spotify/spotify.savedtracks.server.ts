import { Page, SavedTrack, SpotifyApi } from '@fostertheweb/spotify-web-sdk'

export async function fetchSavedTracks(
	spotifyApi: SpotifyApi,
	lastSyncDate: Date | null
): Promise<SavedTrack[]> {
	const LIMIT = 50
	let offset = 0
	const savedTracks: SavedTrack[] = []
	let shouldContinue = true

	while (shouldContinue) {
		const response: Page<SavedTrack> = await fetchSavedTracksWithRetry(
			spotifyApi,
			LIMIT,
			offset
		)

		// stop fetching if added song date is older than last sync date
		for (const track of response.items) {
			const trackDate = new Date(track.added_at)
			if (lastSyncDate && trackDate <= lastSyncDate) {
				shouldContinue = false
				break
			}
			savedTracks.push(track)
		}

		if (!shouldContinue || response.items.length < LIMIT) break
		offset += LIMIT
	}

	return savedTracks
}

async function fetchSavedTracksWithRetry(
	spotifyApi: SpotifyApi,
	limit: number,
	offset: number,
	maxRetries: number = 3
): Promise<Page<SavedTrack>> {
	let attempt = 0

	while (attempt <= maxRetries) {
		try {
			return spotifyApi.currentUser.tracks.savedTracks(<any>limit, offset)
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

	throw new Error('Maximum retry attempts reached. Unable to fetch saved tracks.')
}

function sleep(ms: number) {
	return new Promise(resolve => setTimeout(resolve, ms))
}
