import wretch from 'wretch'

import { logger } from '~/lib/logging/Logger'
import type { LyricsSection } from '~/lib/models/Lyrics'
import { LyricsService } from '~/lib/services'
import { ConcurrencyLimiter } from '~/lib/utils/concurrency'

import {
	type ResponseHitsResult,
	ResponseReferents,
	SearchResponse,
} from './types/genius.types'
import { LyricsParser } from './utils/lyrics-parser'
import { LyricsTransformer, TransformedLyricsBySection } from './utils/lyrics-transformer'
import {
	debugCandidates,
	findBestMatch,
	generateQueryVariants,
} from './utils/search-strategy'

export interface GeniusServiceConfig {
	accessToken: string
}
//todo: copy from tana
export class DefaultLyricsService implements LyricsService {
	private readonly baseUrl = 'https://api.genius.com'
	private readonly client: ReturnType<typeof wretch>
	// 5 concurrent requests with 50ms interval (~20 req/sec, safe for authenticated API)
	private readonly limiter = new ConcurrencyLimiter(5, 50)

	constructor(config: GeniusServiceConfig) {
		if (!config.accessToken) {
			throw new logger.AppError('Access token is required', 'LYRICS_SERVICE_ERROR', 401)
		}

		this.client = wretch(this.baseUrl).headers({
			Authorization: `Bearer ${config.accessToken}`,
		})
	}

	public async getLyrics(
		artist: string,
		song: string
	): Promise<TransformedLyricsBySection[]> {
		try {
			const searchResult = await this.searchSong(artist, song)
			const [lyrics, referents] = await Promise.all([
				this.fetchLyrics(searchResult.url),
				this.fetchReferents(searchResult.id),
			])

			return LyricsTransformer.transform(lyrics, referents)
		} catch (error) {
			throw new logger.AppError(
				`Failed to get lyrics for ${artist} - ${song}`,
				'LYRICS_SERVICE_ERROR',
				503,
				{
					error,
					context: 'get_lyrics',
				}
			)
		}
	}

	private async searchSong(artist: string, song: string): Promise<ResponseHitsResult> {
		// Generate multiple query variants to try
		const queryVariants = generateQueryVariants(artist, song)
		const debug = process.env.DEBUG_LYRICS_SEARCH === 'true'

		if (debug) {
			console.log(`\n=== Searching for: "${artist}" - "${song}" ===`)
			console.log('Query variants:', queryVariants)
		}

		let lastError: Error | null = null

		// Try each query variant until we find a good match
		for (const query of queryVariants) {
			try {
				const searchQuery = encodeURIComponent(query)
				const response: SearchResponse = await this.limiter.run(() =>
					this.client.get(`/search?q=${searchQuery}`).json()
				)

				const hits = response.response?.hits
				if (!hits || hits.length === 0) {
					if (debug) console.log(`No results for query: "${query}"`)
					continue
				}

				// Extract results from hits
				const results = hits
					.map(hit => hit.result)
					.filter((r): r is ResponseHitsResult => !!r?.url)

				if (debug) {
					debugCandidates(results, artist, song)
				}

				// Find best match using combined scoring
				const match = findBestMatch(results, artist, song, query)

				if (match) {
					if (debug) {
						console.log(
							`✓ Found match: "${match.result.title}" by "${match.result.primary_artist.name}" ` +
								`[score: ${(match.score * 100).toFixed(1)}%, query: "${match.queryUsed}"]`
						)
					}
					return match.result
				}

				if (debug) {
					console.log(
						`No good match found for query: "${query}" (best score below threshold)`
					)
				}
			} catch (error) {
				lastError = error as Error
				if (debug) console.log(`Query failed: "${query}"`, error)
			}
		}

		// No match found with any query variant
		throw new logger.AppError(
			`Song not found: ${artist} - ${song} (tried ${queryVariants.length} query variants)`,
			'LYRICS_SERVICE_ERROR',
			404,
			{ queriesAttempted: queryVariants }
		)
	}

	private async fetchReferents(songId: number): Promise<ResponseReferents[]> {
		const perPage = 50

		// Fire all 4 pages in parallel - most songs have <200 annotations
		// Using allSettled so one failed page doesn't break the whole fetch
		const results = await Promise.allSettled([
			this.fetchReferentsPage(songId, 1, perPage),
			this.fetchReferentsPage(songId, 2, perPage),
			this.fetchReferentsPage(songId, 3, perPage),
			this.fetchReferentsPage(songId, 4, perPage),
		])

		// Extract successful results only
		return results
			.filter(
				(r): r is PromiseFulfilledResult<ResponseReferents[]> => r.status === 'fulfilled'
			)
			.flatMap(r => r.value)
	}

	private async fetchReferentsPage(
		songId: number,
		page: number,
		perPage: number
	): Promise<ResponseReferents[]> {
		try {
			const response: ResponseReferents = await this.limiter.run(() =>
				this.client
					.url(
						`/referents?song_id=${songId}&text_format=plain&per_page=${perPage}&page=${page}`
					)
					.get()
					.json()
			)
			return response.response?.referents || []
		} catch {
			// Page doesn't exist or error - return empty
			return []
		}
	}

	private async fetchLyrics(url: string): Promise<LyricsSection[]> {
		try {
			console.log('Fetching lyrics from URL:', url)
			const response = await this.limiter.run(() => wretch(url).get().text())

			if (!response.includes('lyrics-root')) {
				throw new logger.AppError(
					`Failed to find lyrics content. URL: ${url}`,
					'LYRICS_SERVICE_ERROR',
					422,
					{
						context: 'lyrics_content',
					}
				)
			}

			return LyricsParser.parse(response)
		} catch (error) {
			console.error('Error in fetchLyrics:', error)
			throw new logger.AppError(
				`Failed to fetch lyrics from ${url}`,
				'LYRICS_SERVICE_ERROR',
				503,
				{
					error,
					context: 'lyrics_fetch',
				}
			)
		}
	}
}
