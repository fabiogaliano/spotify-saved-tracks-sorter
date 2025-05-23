
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

  private extractJsonFromLLMResponse(responseText: string): any {
    // First try to parse the entire response as JSON
    try {
      return JSON.parse(responseText);
    } catch (parseError) {
      console.log('Initial JSON parse failed, trying alternative methods');
    }

    // Try multiple extraction methods in sequence
    let extracted = false;
    let analysisJson: any = null;

    // 1. Try to extract JSON from markdown code blocks
    if (!extracted) {
      const jsonMatch = responseText.match(/```(?:json)?([\s\S]*?)```/s);
      if (jsonMatch && jsonMatch[1]) {
        const extractedContent = jsonMatch[1].trim();
        try {
          analysisJson = JSON.parse(extractedContent);
          extracted = true;
          console.log('Successfully extracted JSON from code block');
        } catch (extractError) {
          console.error('Failed to parse code block content as JSON');
        }
      }
    }

    // 2. Try to find anything that looks like JSON with curly braces
    if (!extracted) {
      const possibleJson = responseText.match(/{[\s\S]*}/s);
      if (possibleJson) {
        try {
          analysisJson = JSON.parse(possibleJson[0]);
          extracted = true;
          console.log('Successfully extracted JSON from curly braces');
        } catch (jsonError) {
          console.error('Failed to parse curly brace content as JSON');
        }
      }
    }

    // 3. Try to clean and fix common JSON issues
    if (!extracted) {
      try {
        // Replace escaped quotes that might be causing issues
        let cleanedText = responseText.replace(/\\"([^"]*)\\"/, '"$1"');
        // Try to extract anything between outermost curly braces
        const jsonCandidate = cleanedText.match(/{[\s\S]*}/s);
        if (jsonCandidate) {
          analysisJson = JSON.parse(jsonCandidate[0]);
          extracted = true;
          console.log('Successfully parsed JSON after cleaning');
        }
      } catch (cleanError) {
        console.error('Failed to parse cleaned JSON');
      }
    }

    // 4. Try to fix double-escaped quotes (common in LLM outputs)
    if (!extracted) {
      try {
        // Replace double-escaped quotes with proper JSON quotes
        let fixedText = responseText.replace(/\\\\"([^\\]*?)\\\\"/, '"$1"');
        const fixedJson = fixedText.match(/{[\s\S]*}/s);
        if (fixedJson) {
          analysisJson = JSON.parse(fixedJson[0]);
          extracted = true;
          console.log('Successfully parsed JSON after fixing double-escaped quotes');
        }
      } catch (fixError) {
        console.error('Failed to parse after fixing double-escaped quotes');
      }
    }

    // If all extraction methods fail, throw a detailed error
    if (!extracted) {
      console.error('All JSON extraction methods failed. Full response:', responseText);
      throw new Error('Failed to extract valid JSON from LLM response');
    }

    return analysisJson;
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

      const analysisJson = this.extractJsonFromLLMResponse(result.text);

      return JSON.stringify({ model: this.providerManager.getCurrentModel(), analysis: analysisJson })
    } catch (error) {
      throw new Error(`Failed to analyze song ${artist} - ${song}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
}
