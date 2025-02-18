import wretch from 'wretch'
import { LyricsSection, LyricsService } from '~/core/domain/Lyrics'
import { GeniusApiError } from '~/core/errors/ApiError'
import { SearchResponse, ResponseReferents } from './types/genius.types'
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
			throw new GeniusApiError('Access token is required', 401)
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
			throw new GeniusApiError(`Failed to get lyrics for ${artist} - ${song}`, 503, {
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
				throw new GeniusApiError(`Song not found: ${artist} - ${song}`, 404)
			}

			if (!firstHit.primary_artist.name.toLowerCase().includes(artist.toLowerCase())) {
				throw new GeniusApiError(
					`Found song "${firstHit.title}" but artist "${firstHit.primary_artist.name}" doesn't match "${artist}"`,
					404
				)
			}

			return firstHit
		} catch (error) {
			console.error('Error in searchSong:', error)
			throw new GeniusApiError(`Search failed for ${artist} - ${song}`, 503, {
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
				throw new GeniusApiError(`Failed to fetch referents for song ID ${songId}`, 503, {
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
				throw new GeniusApiError(`Failed to find lyrics content. URL: ${url}`, 422, {
					context: 'lyrics_content',
				})
			}

			return LyricsParser.parse(response)
		} catch (error) {
			console.error('Error in fetchLyrics:', error)
			throw new GeniusApiError(`Failed to fetch lyrics from ${url}`, 503, {
				error,
				context: 'lyrics_fetch',
			})
		}
	}
}
