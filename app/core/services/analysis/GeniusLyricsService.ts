import wretch from 'wretch'
import * as cheerio from 'cheerio'
import type { LyricsResult, LyricsService } from '~/core/domain/Lyrics'
import { ApiError } from '~/core/errors/ApiError'
import { logger } from '~/core/logging/Logger'

const CLIENT_ACCESS_TOKEN = process.env.GENIUS_CLIENT_TOKEN || "no token for genius"

export class GeniusLyricsService implements LyricsService {
  private readonly CLIENT_ACCESS_TOKEN: string
  private readonly searchApiGenius: string = "https://api.genius.com"

  constructor(clientAccessToken: string = CLIENT_ACCESS_TOKEN) {
    this.CLIENT_ACCESS_TOKEN = clientAccessToken
  }

  async getLyrics(artist: string, song: string): Promise<LyricsResult[]> {
    try {
      logger.info('fetching lyrics')
      const songUrl = await this.getSongUrl(artist, song)
      return await this.parseAndExtractLyrics(songUrl)
    } catch (error) {
      logger.error('fetch lyrics failed', error as Error, { artist, song })
      throw new ApiError(
        `Failed to fetch lyrics for ${artist} - ${song}`,
        'GENIUS_FETCH_ERROR',
        500,
        { cause: error, artist, song }
      )
    }
  }

  private async getSongUrl(artist: string, song: string): Promise<string> {
    const searchQuery = encodeURIComponent(artist + " " + song)
    try {
      logger.debug('search song URL', { artist, song, searchQuery })
      const geniusApi = wretch(this.searchApiGenius).auth(`Bearer ${this.CLIENT_ACCESS_TOKEN}`)
      const songSearchResult:any = await geniusApi.get("/search?q=" + searchQuery).json()
      const songUrl = songSearchResult.response.hits?.[0]?.result?.url
      
      if (!songUrl) {
        logger.warn('song URL not found', { artist, song })
        throw new ApiError(
          'Song URL not found',
          'GENIUS_URL_ERROR',
          404,
          { artist, song }
        )
      }

      logger.debug('song URL found', { artist, song, songUrl })
      return songUrl
    } catch (error) {
      logger.error('find song URL failed', error as Error, { artist, song })
      throw new ApiError(
        `Failed to find song URL for ${artist} - ${song}`,
        'GENIUS_URL_ERROR',
        500,
        { cause: error, artist, song }
      )
    }
  }

  private async parseAndExtractLyrics(url: string): Promise<LyricsResult[]> {
    try {
      logger.debug('parse lyrics', { url })
      const response = await wretch(url).get().text()
      const $ = cheerio.load(response)
      const lyrics: LyricsResult[] = []

      // Find the lyrics container
      const lyricsContainer = $('[data-lyrics-container="true"]')
      if (!lyricsContainer.length) {
        logger.warn('parse lyrics container not found', { url })
        throw new ApiError(
          'Lyrics container not found',
          'GENIUS_PARSE_ERROR',
          404,
          { url }
        )
      }

      // Process each child element
      lyricsContainer.children().each((_, element) => {
        const el = $(element)

        // Handle links (annotated lyrics)
        if (el.is('a')) {
          lyrics.push({
            type: 'link',
            content: el.text().trim(),
            annotation: el.attr('annotation-fragment')
          })
        }
        // Handle line breaks
        else if (el.is('br')) {
          lyrics.push({
            type: 'text',
            content: '\n'
          })
        }
        // Handle regular text
        else {
          const text = el.text().trim()
          if (text) {
            lyrics.push({
              type: 'text',
              content: text
            })
          }
        }
      })

      logger.debug('lyrics:parse:success', { 
        url, 
        lyricsLength: lyrics.length 
      })

      return lyrics
    } catch (error) {
      logger.error('lyrics:parse:failed', error as Error, { url })
      throw new ApiError(
        'Failed to parse lyrics from Genius',
        'GENIUS_PARSE_ERROR',
        500,
        { cause: error, url }
      )
    }
  }
}
