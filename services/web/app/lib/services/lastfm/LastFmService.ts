import { logger } from '~/lib/logging/Logger'
import { ConcurrencyLimiter } from '~/lib/utils/concurrency'

import type {
	GenreLookupResult,
	GenreSourceLevel,
	LastFmAlbumTopTagsResponse,
	LastFmArtistTopTagsResponse,
	LastFmErrorResponse,
	LastFmTag,
	LastFmTopTagsResponse,
} from './types/lastfm.types'
import { isGenre } from './utils/genre-whitelist'
import { extractPrimaryArtist, normalizeAlbumName } from './utils/normalize'

/**
 * Service for interacting with Last.fm API to fetch track/album/artist genres
 * Supports fallback chain: track → album → artist
 *
 * @see https://www.last.fm/api/show/track.getTopTags
 * @see https://www.last.fm/api/show/album.getTopTags
 * @see https://www.last.fm/api/show/artist.getTopTags
 */
export class LastFmService {
	private readonly baseUrl = 'https://ws.audioscrobbler.com/2.0'
	private readonly apiKey: string
	// 5 concurrent requests with 200ms minimum interval = ~5 req/sec
	private readonly limiter = new ConcurrencyLimiter(5, 200)

	constructor(apiKey: string) {
		if (!apiKey) {
			throw new Error('Last.fm API key is required')
		}
		this.apiKey = apiKey
	}

	/**
	 * Handle API response, checking for errors
	 */
	private async handleResponse<T>(response: Response): Promise<T> {
		const data = await response.json()

		// Last.fm returns errors in the response body, not via HTTP status
		if ('error' in data) {
			const errorData = data as LastFmErrorResponse
			if (errorData.error === 29) {
				throw new Error('Rate limit exceeded')
			}
			throw new Error(`Last.fm API error ${errorData.error}: ${errorData.message}`)
		}

		return data as T
	}

	/** Maximum number of genres to return */
	private readonly maxGenres = 3

	/**
	 * Convert tags array to GenreLookupResult
	 * Filters to recognized genres only and limits to top 3
	 */
	private tagsToResult(
		tags: LastFmTag[],
		sourceLevel: GenreSourceLevel
	): GenreLookupResult | null {
		// Filter to only recognized genres (excludes years, nationalities, descriptors)
		const genreTags = tags.filter(t => isGenre(t.name))

		// If no recognized genres, return null to trigger fallback
		if (genreTags.length === 0) {
			return null
		}

		// Take top N genres (already sorted by score from Last.fm)
		const topGenres = genreTags.slice(0, this.maxGenres)

		return {
			tags: topGenres.map(t => t.name),
			tagsWithScores: topGenres.map(t => ({ name: t.name, score: t.count })),
			sourceLevel,
			source: 'lastfm' as const,
		}
	}

	/**
	 * Get top tags for a track (most specific)
	 */
	async getTrackTopTags(
		artist: string,
		track: string
	): Promise<GenreLookupResult | null> {
		try {
			return await this.limiter.run(async () => {
				const params = new URLSearchParams({
					method: 'track.getTopTags',
					artist,
					track,
					api_key: this.apiKey,
					autocorrect: '1',
					format: 'json',
				})

				const response = await fetch(`${this.baseUrl}?${params.toString()}`)
				const result = await this.handleResponse<LastFmTopTagsResponse>(response)

				if (!result.toptags?.tag || result.toptags.tag.length === 0) {
					return null
				}

				return this.tagsToResult(result.toptags.tag, 'track')
			})
		} catch (error) {
			logger.debug('Failed to get track tags', {
				artist,
				track,
				error: error instanceof Error ? error.message : String(error),
			})
			return null
		}
	}

	/**
	 * Get top tags for an album (medium specificity)
	 */
	async getAlbumTopTags(
		artist: string,
		album: string
	): Promise<GenreLookupResult | null> {
		try {
			return await this.limiter.run(async () => {
				const params = new URLSearchParams({
					method: 'album.getTopTags',
					artist,
					album,
					api_key: this.apiKey,
					autocorrect: '1',
					format: 'json',
				})

				const response = await fetch(`${this.baseUrl}?${params.toString()}`)
				const result = await this.handleResponse<LastFmAlbumTopTagsResponse>(response)

				if (!result.toptags?.tag || result.toptags.tag.length === 0) {
					return null
				}

				return this.tagsToResult(result.toptags.tag, 'album')
			})
		} catch (error) {
			logger.debug('Failed to get album tags', {
				artist,
				album,
				error: error instanceof Error ? error.message : String(error),
			})
			return null
		}
	}

	/**
	 * Get top tags for an artist (broadest)
	 */
	async getArtistTopTags(artist: string): Promise<GenreLookupResult | null> {
		try {
			return await this.limiter.run(async () => {
				const params = new URLSearchParams({
					method: 'artist.getTopTags',
					artist,
					api_key: this.apiKey,
					autocorrect: '1',
					format: 'json',
				})

				const response = await fetch(`${this.baseUrl}?${params.toString()}`)
				const result = await this.handleResponse<LastFmArtistTopTagsResponse>(response)

				if (!result.toptags?.tag || result.toptags.tag.length === 0) {
					return null
				}

				return this.tagsToResult(result.toptags.tag, 'artist')
			})
		} catch (error) {
			logger.debug('Failed to get artist tags', {
				artist,
				error: error instanceof Error ? error.message : String(error),
			})
			return null
		}
	}

	/**
	 * Get tags with fallback chain: album → artist
	 *
	 * Skips track-level tags because they're sparse on Last.fm (user-submitted).
	 * Album and artist tags have much better coverage.
	 *
	 * Normalizes inputs to handle:
	 * - "(with Artist)" / "(feat. Artist)" patterns in album names
	 * - "- Remastered" / "- Deluxe Edition" suffixes
	 * - Multi-artist strings like "Artist1, Artist2"
	 */
	async getTagsWithFallback(
		artist: string,
		_track: string,
		album?: string
	): Promise<GenreLookupResult | null> {
		// Extract primary artist (handles "Sam Fender, Olivia Dean" → "Sam Fender")
		const primaryArtist = extractPrimaryArtist(artist)

		// 1. Try album-level tags (if album name provided)
		if (album) {
			const normalizedAlbum = normalizeAlbumName(album)
			const albumTags = await this.getAlbumTopTags(primaryArtist, normalizedAlbum)
			if (albumTags) {
				logger.debug('Found tags at album level', {
					artist: primaryArtist,
					album: normalizedAlbum,
					originalAlbum: album !== normalizedAlbum ? album : undefined,
				})
				return albumTags
			}
		}

		// 2. Fall back to artist-level tags (broadest)
		const artistTags = await this.getArtistTopTags(primaryArtist)
		if (artistTags) {
			logger.debug('Found tags at artist level', { artist: primaryArtist })
			return artistTags
		}

		logger.debug('No tags found at any level', { artist: primaryArtist, album })
		return null
	}

	/**
	 * Batch fetch tags with fallback for multiple tracks
	 */
	async getTagsWithFallbackBatch(
		tracks: Array<{ artist: string; track: string; album?: string }>
	): Promise<Map<string, GenreLookupResult>> {
		if (tracks.length === 0) {
			return new Map()
		}

		const results = new Map<string, GenreLookupResult>()
		const failed: Array<{ artist: string; track: string }> = []

		const promises = tracks.map(async ({ artist, track, album }) => {
			const key = `${artist}:${track}`
			const result = await this.getTagsWithFallback(artist, track, album)

			if (result) {
				return { key, result }
			} else {
				failed.push({ artist, track })
				return null
			}
		})

		const settled = await Promise.allSettled(promises)

		for (const outcome of settled) {
			if (outcome.status === 'fulfilled' && outcome.value) {
				results.set(outcome.value.key, outcome.value.result)
			}
		}

		if (failed.length > 0) {
			logger.warn(`No tags found for ${failed.length} tracks`, {
				sampleFailed: failed.slice(0, 3),
				totalFailed: failed.length,
			})
		}

		logger.debug('Last.fm batch fetch completed', {
			requested: tracks.length,
			succeeded: results.size,
			failed: failed.length,
			successRate: `${((results.size / tracks.length) * 100).toFixed(1)}%`,
		})

		return results
	}
}

/**
 * Factory function to create Last.fm service
 */
export function createLastFmService(): LastFmService | null {
	const apiKey = process.env.LASTFM_API_KEY
	if (!apiKey) {
		logger.warn('LASTFM_API_KEY not set, Last.fm service unavailable')
		return null
	}

	try {
		return new LastFmService(apiKey)
	} catch (error) {
		logger.error('Failed to create Last.fm service', {
			error: error instanceof Error ? error.message : String(error),
		})
		return null
	}
}
