import type { PlaylistAnalysisService, PlaylistAnalysisResult } from '../../domain/PlaylistAnalysis'
import type { LlmProviderManager } from '../../domain/LlmProvider'

export class DefaultPlaylistAnalysisService implements PlaylistAnalysisService {
  constructor(private readonly llmProviderManager: LlmProviderManager) {}

  async analyzePlaylistDescription(playlistDescription: string): Promise<string> {
    const prompt = `Analyze the following playlist description and identify the mood or theme: ${playlistDescription}`
    const analysis = await this.llmProviderManager.generateText(prompt)
    return analysis
  }

  async analyzePlaylistSongs(songTitles: string[]): Promise<string[]> {
    const results: string[] = []
    for (const songTitle of songTitles) {
      const prompt = `Analyze the lyrics and theme of this song: ${songTitle}`
      const analysis = await this.llmProviderManager.generateText(prompt)
      results.push(analysis)
    }
    return results
  }

  async analyzePlaylist(playlistDescription: string, songTitles: string[]): Promise<PlaylistAnalysisResult> {
    const descriptionAnalysis = await this.analyzePlaylistDescription(playlistDescription)
    const songAnalysis = await this.analyzePlaylistSongs(songTitles)

    return {
      descriptionAnalysis,
      songAnalysis
    }
  }
}
