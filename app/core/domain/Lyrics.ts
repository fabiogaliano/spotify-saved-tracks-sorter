export interface LyricsResult {
  type: 'text' | 'link'
  content: string
  annotation?: string
}

export interface LyricsService {
  getLyrics(artist: string, song: string): Promise<LyricsResult[]>
}

export interface GeniusResponse {
  response: {
    hits: Array<{
      result: {
        url: string
      }
    }>
  }
}
