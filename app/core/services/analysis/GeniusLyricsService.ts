import wretch from 'wretch'
import * as cheerio from 'cheerio'
import type { LyricsResult, LyricsService } from '../../domain/Lyrics'

const CLIENT_ACCESS_TOKEN = process.env.GENIUS_CLIENT_TOKEN || "no token for genius"

export class GeniusLyricsService implements LyricsService {
  private readonly CLIENT_ACCESS_TOKEN: string
  private readonly searchApiGenius: string = "https://api.genius.com"

  constructor(clientAccessToken: string = CLIENT_ACCESS_TOKEN) {
    this.CLIENT_ACCESS_TOKEN = clientAccessToken
  }

  async getLyrics(artist: string, song: string): Promise<LyricsResult[]> {
    try {
      const songUrl = await this.getSongUrl(artist, song)
      return await this.parseAndExtractLyrics(songUrl)
    } catch (error) {
      console.error("Error fetching lyrics:", error)
      throw new Error(`Failed to fetch lyrics for ${artist} - ${song}`)
    }
  }

  private async getSongUrl(artist: string, song: string): Promise<string> {
    const searchQuery = encodeURIComponent(artist + " " + song)
    try {
      const geniusApi = wretch(this.searchApiGenius).auth(`Bearer ${this.CLIENT_ACCESS_TOKEN}`)
      const songSearchResult = await geniusApi.get("/search?q=" + searchQuery).json()
      const songUrl = songSearchResult.response.hits?.[0]?.result?.url
      if (!songUrl) {
        throw new Error('Song URL not found')
      }
      return songUrl
    } catch (error) {
      console.error("Error searching for song:", error)
      throw new Error(`Failed to find song URL for ${artist} - ${song}`)
    }
  }

  private async parseAndExtractLyrics(url: string): Promise<LyricsResult[]> {
    try {
      const response = await wretch(url).get().text()
      const $ = cheerio.load(response)
      const lyrics: LyricsResult[] = []

      // Find the lyrics container
      const lyricsContainer = $('[data-lyrics-container="true"]')
      if (!lyricsContainer.length) {
        throw new Error('Lyrics container not found')
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

      return lyrics
    } catch (error) {
      console.error("Error parsing lyrics:", error)
      throw new Error('Failed to parse lyrics from Genius')
    }
  }
}
