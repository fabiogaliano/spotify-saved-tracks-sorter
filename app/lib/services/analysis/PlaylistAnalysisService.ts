import type {
  PlaylistAnalysisService,
  LlmProviderManager
} from '~/lib/services'
import { logger } from '~/lib/logging/Logger'

const PLAYLIST_ANALYSIS_PROMPT = `Playlist Name: {playlist_name}
Description: {playlist_description}

Analyze this playlist and provide:
1. The main themes, moods, and emotions of the playlist.
2. The ideal listening scenarios and contexts.
3. A detailed emotional analysis, focusing on the dominant mood.
4. The adaptability of this playlist to different settings.

Provide analysis in the following JSON format:
{
  "meaning": {
    "themes": [
      {
        "name": "primary theme",
        "confidence": 0.0-1.0,
        "description": "Explanation of the theme.",
        "related_themes": ["related themes"],
        "connection": "How these themes link together."
      }
    ],
    "main_message": "Core vibe of the playlist"
  },
  "emotional": {
    "dominantMood": {
      "mood": "primary mood",
      "description": "Why this is the dominant mood"
    },
    "intensity_score": 0.0-1.0
  },
  "context": {
    "primary_setting": "Most fitting scenario",
    "situations": {
      "perfect_for": ["situations"],
      "why": "Why these situations fit"
    },
    "fit_scores": {
      "morning": 0.0-1.0,
      "working": 0.0-1.0,
      "relaxation": 0.0-1.0
    }
  },
  "matchability": {
    "versatility_score": 0.0-1.0,
    "distinctiveness": 0.0-1.0,
    "adaptability": 0.0-1.0
  }
}`

export class DefaultPlaylistAnalysisService implements PlaylistAnalysisService {
  constructor(private readonly llmProviderManager: LlmProviderManager) { }

  async analyzePlaylistWithPrompt(
    playlistName: string,
    playlistDescription: string
  ): Promise<{ model: string; analysisJson: any }> {
    try {
      const filledPrompt = PLAYLIST_ANALYSIS_PROMPT.replace(
        '{playlist_name}',
        playlistName
      ).replace(
        '{playlist_description}',
        playlistDescription || 'No description provided'
      )

      const result = await this.llmProviderManager.generateText(filledPrompt)

      if (!result) {
        throw new Error('Failed to generate analysis: No response from LLM provider')
      }

      let analysisJson
      try {
        analysisJson = JSON.parse(result.text)
      } catch (parseError) {
        const jsonMatch = result.text.match(/```(?:json)?(\n|\r\n|\r)?(.*?)```/s)
        if (jsonMatch && jsonMatch[2]) {
          try {
            analysisJson = JSON.parse(jsonMatch[2].trim())
          } catch (extractError) {
            throw new Error('Failed to parse extracted content as JSON')
          }
        } else {
          throw new Error(
            'Failed to parse analysis result as JSON - no JSON code block found'
          )
        }
      }

      return {
        model: this.llmProviderManager.getCurrentModel(),
        analysisJson,
      }
    } catch (error) {
      logger.error('Failed to analyze playlist with prompt', error as Error, {
        playlistName,
      })
      throw new logger.AppError(
        'Failed to analyze playlist with prompt',
        'LLM_ANALYSIS_ERROR',
        500,
        { cause: error, playlistName }
      )
    }
  }
}
