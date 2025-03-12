import wretch from 'wretch'
import { LyricsService } from '~/lib/services'
import { logger } from '~/lib/logging/Logger'
import type { LyricsSection } from '~/lib/models/Lyrics'
import { SearchResponse, ResponseReferents, } from './types/genius.types'
import { LyricsParser } from './utils/lyrics-parser'
import { LyricsTransformer, TransformedLyricsBySection } from './utils/lyrics-transformer'

export interface GeniusServiceConfig {
	accessToken: string
}
//todo: copy from tana
export class DefaultLyricsService implements LyricsService {
	private readonly baseUrl = 'https://api.genius.com'
	private readonly client: ReturnType<typeof wretch>

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
			throw new logger.AppError(`Failed to get lyrics for ${artist} - ${song}`, 'LYRICS_SERVICE_ERROR', 503, {
				error,
				context: 'get_lyrics',
			})
		}
	}

	private async searchSong(artist: string, song: string) {
		const searchQuery = encodeURIComponent(`${artist} ${song}`)

		try {
			const response: SearchResponse = await this.client
				.get(`/search?q=${searchQuery}`)
				.json()

			const firstHit = response.response?.hits?.[0]?.result

			if (!firstHit?.url) {
				throw new logger.AppError(`Song not found: ${artist} - ${song}`, 'LYRICS_SERVICE_ERROR', 404)
			}

			if (!firstHit.primary_artist.name.toLowerCase().includes(artist.toLowerCase())) {
				throw new logger.AppError(
					`Found song "${firstHit.title}" but artist "${firstHit.primary_artist.name}" doesn't match "${artist}"`,
					'LYRICS_SERVICE_ERROR',
					404
				)
			}

			return firstHit
		} catch (error) {
			console.error('Error in searchSong:', error)
			throw new logger.AppError(`Search failed for ${artist} - ${song}`, 'LYRICS_SERVICE_ERROR', 503, {
				error,
				context: 'search',
			})
		}
	}

	private async fetchReferents(songId: number): Promise<ResponseReferents[]> {
		const perPage = 50
		let page = 1
		let allReferents: ResponseReferents[] = []
		let hasMoreReferents = true

		while (hasMoreReferents) {
			try {
				const response: ResponseReferents = await this.client
					.url(
						`/referents?song_id=${songId}&text_format=plain&per_page=${perPage}&page=${page}`
					)
					.get()
					.json()

				const referents = response.response.referents
				if (!referents || referents.length === 0) {
					hasMoreReferents = false
					break
				}

				allReferents = allReferents.concat(referents)
				page++
			} catch (error) {
				console.error('Error in fetchReferents:', error)
				throw new logger.AppError(`Failed to fetch referents for song ID ${songId}`, 'LYRICS_SERVICE_ERROR', 503, {
					error,
					context: 'referents',
				})
			}
		}

		return allReferents
	}

	private async fetchLyrics(url: string): Promise<LyricsSection[]> {
		try {
			console.log('Fetching lyrics from URL:', url)
			const response = await wretch(url).get().text()

			if (!response.includes('lyrics-root')) {
				throw new logger.AppError(`Failed to find lyrics content. URL: ${url}`, 'LYRICS_SERVICE_ERROR', 422, {
					context: 'lyrics_content',
				})
			}

			return LyricsParser.parse(response)
		} catch (error) {
			console.error('Error in fetchLyrics:', error)
			throw new logger.AppError(`Failed to fetch lyrics from ${url}`, 'LYRICS_SERVICE_ERROR', 503, {
				error,
				context: 'lyrics_fetch',
			})
		}
	}
}
