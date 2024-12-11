import type { LyricsService } from '../../domain/Lyrics'
import type { SongAnalysisService } from '../../domain/SongAnalysis'
import type { LlmProviderManager } from '../llm/LlmProviderManager'

export class DefaultSongAnalysisService implements SongAnalysisService {
  constructor(
    private readonly lyricsService: LyricsService,
    private readonly providerManager: LlmProviderManager
  ) {}

  async fetchSongLyricsAndAnnotations(artist: string, song  : string): Promise<string> {
    const lyrics = await this.lyricsService.getLyrics(artist, song)
    const annotations = 'await this.lyricsService.getAnnotations(songId)' // TODO: check how annotations are fetched
    return `${lyrics}\n\nAnnotations: ${annotations}`
  }

  async analyzeSong(artist: string, song: string): Promise<string> {
    const lyricsAndAnnotations = await this.fetchSongLyricsAndAnnotations(artist, song)
    const audioFeatures = 'TODO: get from spotify'
    const prompt = `Analyze the following song: ${lyricsAndAnnotations}\n${audioFeatures}`

    const analysis = await this.providerManager.generateText(prompt)
    return analysis
  }
}
