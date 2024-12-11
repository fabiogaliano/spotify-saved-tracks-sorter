import type { PlaylistAnalysisService, PlaylistAnalysisResult } from '~/core/domain/PlaylistAnalysis'
import type { LlmProviderManager } from '~/core/domain/LlmProvider'
import { ApiError } from '~/core/errors/ApiError'
import { logger } from '~/core/logging/Logger'

export class DefaultPlaylistAnalysisService implements PlaylistAnalysisService {
  constructor(private readonly llmProviderManager: LlmProviderManager) {}

  async analyzePlaylistDescription(playlistDescription: string): Promise<string> {
    try {
      logger.info('Analyzing playlist description')
      const prompt = `Analyze the following playlist description and identify the mood or theme: ${playlistDescription}`
      const analysis = await this.llmProviderManager.generateText(prompt)
      logger.debug('Successfully analyzed playlist description', { analysis })
      return analysis
    } catch (error) {
      logger.error('Failed to analyze playlist description', error as Error, { playlistDescription })
      throw new ApiError(
        'Failed to analyze playlist description',
        'LLM_ANALYSIS_ERROR',
        500,
        { cause: error, playlistDescription }
      )
    }
  }

  async analyzePlaylistSongs(songTitles: string[]): Promise<string[]> {
    try {
      logger.info('Analyzing playlist songs', { songCount: songTitles.length })
      const results: string[] = []
      
      for (const songTitle of songTitles) {
        try {
          logger.debug('Analyzing song', { songTitle })
          const prompt = `Analyze the lyrics and theme of this song: ${songTitle}`
          const analysis = await this.llmProviderManager.generateText(prompt)
          results.push(analysis)
        } catch (error) {
          logger.error('Failed to analyze song', error as Error, { songTitle })
          // Continue with other songs even if one fails
          results.push(`Failed to analyze: ${songTitle}`)
        }
      }

      logger.debug('Successfully analyzed songs', { 
        totalSongs: songTitles.length,
        analyzedSongs: results.length 
      })
      
      return results
    } catch (error) {
      logger.error('Failed to analyze playlist songs', error as Error, { songCount: songTitles.length })
      throw new ApiError(
        'Failed to analyze playlist songs',
        'LLM_ANALYSIS_ERROR',
        500,
        { cause: error, songTitles }
      )
    }
  }

  async analyzePlaylist(playlistDescription: string, songTitles: string[]): Promise<PlaylistAnalysisResult> {
    try {
      logger.info('Starting playlist analysis', { 
        descriptionLength: playlistDescription.length,
        songCount: songTitles.length 
      })

      const [descriptionAnalysis, songAnalysis] = await Promise.all([
        this.analyzePlaylistDescription(playlistDescription),
        this.analyzePlaylistSongs(songTitles)
      ])

      logger.info('Completed playlist analysis')

      return {
        descriptionAnalysis,
        songAnalysis
      }
    } catch (error) {
      logger.error('Failed to analyze playlist', error as Error, {
        descriptionLength: playlistDescription.length,
        songCount: songTitles.length
      })
      throw new ApiError(
        'Failed to analyze playlist',
        'LLM_ANALYSIS_ERROR',
        500,
        { cause: error, descriptionLength: playlistDescription.length, songCount: songTitles.length }
      )
    }
  }
}
