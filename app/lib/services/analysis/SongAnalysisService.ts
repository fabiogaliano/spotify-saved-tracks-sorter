
import { LyricsService } from '~/lib/models/Lyrics'
import { SongAnalysisService } from '~/lib/models/SongAnalysis'
import type { LlmProviderManager } from '../llm/LlmProviderManager'

const MUSIC_ANALYSIS_PROMPT = `Artist: {artist}
Title: {title}
Lyrics and Annotations:
{lyrics_with_annotations}

Please analyze the following song and provide analysis in this JSON format. Ensure all numerical scores are floating point numbers between 0.0-1.0, where 0.0 represents the lowest possible value and 1.0 represents the highest. Provide detailed reasoning for any score above 0.8 or below 0.2.

{
  "meaning": {
    "themes": [
      {
        "name": "Primary Theme",
        "confidence": 0.0-1.0,
        "description": "Natural language explanation of this theme and why it matters.",
        "related_themes": ["related theme 1", "related theme 2"],
        "connection": "How these themes connect within the song."
      }
    ],
    "interpretation": {
      "main_message": "Core message of the song",
      "verified": ["verified interpretations from annotations"],
      "derived": ["LLM-derived interpretations"]
    }
  },
  "emotional": {
    "dominantMood": {
      "mood": "Primary Mood",
      "description": "Why this is the dominant mood."
    },
    "progression": [
      {
        "section": "verse/chorus/bridge",
        "mood": "Specific mood in this section",
        "intensity": 0.0-1.0,
        "description": "How this section's mood contributes to the song's journey."
      }
    ],
    "intensity_score": 0.0-1.0
  },
  "context": {
    "primary_setting": "Most fitting scenario with brief why",
    "situations": {
      "perfect_for": ["situations"],
      "why": "Explanation of why these situations fit."
    },
    "activities": ["activities"],
    "temporal": ["temporal contexts"],
    "social": ["social contexts"],
    "fit_scores": {
      "morning": 0.0-1.0,
      "working": 0.0-1.0,
      "relaxation": 0.0-1.0
    }
  },
  "matchability": {
    "versatility": 0.0-1.0,
    "mood_consistency": 0.0-1.0,
    "uniqueness": 0.0-1.0
  }
}`

export class DefaultSongAnalysisService implements SongAnalysisService {
  constructor(
    private readonly lyricsService: LyricsService,
    private readonly providerManager: LlmProviderManager
  ) { }

  async fetchSongLyricsAndAnnotations(artist: string, song: string): Promise<string> {
    const lyrics = await this.lyricsService.getLyrics(artist, song)
    return JSON.stringify(lyrics, null, 2)
  }

  async analyzeSong(artist: string, song: string): Promise<string> {
    try {
      const lyrics = await this.lyricsService.getLyrics(artist, song)
      const filledPrompt = MUSIC_ANALYSIS_PROMPT
        .replace('{artist}', artist)
        .replace('{title}', song)
        .replace('{lyrics_with_annotations}', JSON.stringify(lyrics, null, 2))
      if (!this.providerManager) {
        throw new Error('LLM Provider Manager is not initialized')
      }

      const result = await this.providerManager.generateText(filledPrompt)
      console.log('Result:', result)
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
          throw new Error('Failed to parse analysis result as JSON - no JSON code block found')
        }
      }

      return JSON.stringify({ model: this.providerManager.getCurrentModel(), analysisJson })
    } catch (error) {
      throw new Error(`Failed to analyze song ${artist} - ${song}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
}
