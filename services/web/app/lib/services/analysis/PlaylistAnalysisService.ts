import { PlaylistAnalysisService as IPlaylistAnalysisService } from '~/lib/models/PlaylistAnalysis'
import type { LlmProviderManager } from '../llm/LlmProviderManager'
import { PlaylistAnalysisLlmSchema, type PlaylistAnalysis } from './analysis-schemas'
import { valibotSchema } from '@ai-sdk/valibot'

// Enhanced playlist analysis prompt that captures cultural themes and cohesion
const ENHANCED_PLAYLIST_ANALYSIS_PROMPT = `You are an expert music curator. Analyze this playlist to understand its purpose and cohesive elements. Only identify cultural significance when it's explicitly present and central to the playlist's theme.

Playlist Name: {playlist_name}
Description: {playlist_description}
Track Count: {track_count}

Songs in playlist:
{track_list}

Analyze this playlist with focus on:
1. Thematic consistency - what messages and themes tie these songs together
2. Emotional journey - how the playlist flows emotionally
3. Target audience - who would enjoy this playlist
4. Purpose and context - when/where/why someone would listen
5. Only note cultural or political themes if they are explicit and central

IMPORTANT: For all numeric scores, provide a decimal number between 0.0 and 1.0 (e.g., 0.75, 0.3, 0.95). Do NOT use strings or descriptions for numeric fields.

Provide analysis in this JSON format:

{
  "meaning": {
    "playlist_purpose": "Why this playlist exists - entertainment/activism/nostalgia/etc",
    "core_themes": [
      {
        "name": "Theme name",
        "confidence": 0.85,
        "description": "How this theme manifests across songs",
        "cultural_significance": "Broader cultural meaning",
        "supporting_tracks": ["track 1", "track 2"]
      }
    ],
    "cultural_identity": {
      "primary_community": "Who does this playlist speak to?",
      "generational_markers": [],
      "social_movements": [],
      "historical_context": "",
      "geographic_culture": "Regional/national cultural elements"
    },
    "main_message": "The overarching message or feeling this playlist conveys",
    "contradiction_analysis": {
      "internal_conflicts": ["Any conflicting themes"],
      "resolution": "How contradictions are resolved"
    }
  },
  "emotional": {
    "dominant_mood": {
      "mood": "Overall emotional tone",
      "description": "Why this mood dominates the playlist",
      "consistency": 0.8
    },
    "emotional_arc": {
      "opening_mood": "How the playlist starts emotionally",
      "peak_moments": ["Track 3 - emotional high point", "Track 7 - climax"],
      "resolution": "How the playlist emotionally concludes",
      "journey_type": "ascending/descending/cyclical/plateau"
    },
    "intensity_score": 0.7,
    "emotional_range": 0.6,
    "catharsis_potential": 0.75
  },
  "context": {
    "primary_setting": "Where is this playlist meant to be heard?",
    "social_context": {
      "alone_vs_group": 0.3,
      "intimate_vs_public": 0.4,
      "active_vs_passive": 0.6
    },
    "situations": {
      "perfect_for": ["Situation 1", "Situation 2"],
      "avoid_during": ["Situation to avoid"],
      "why": "Explanation of situational fit"
    },
    "temporal_context": {
      "time_of_day": ["morning", "evening"],
      "season": ["summer", "fall"],
      "life_moments": ["relaxation", "reflection"]
    },
    "listening_experience": {
      "attention_level": "background/focused/immersive",
      "interaction_style": "sing-along/dance/reflect/work",
      "repeat_potential": 0.8
    }
  },
  "curation": {
    "cohesion_factors": [
      "Factor 1 that ties songs together",
      "Factor 2",
      "Factor 3"
    ],
    "flow_analysis": {
      "transition_quality": 0.75,
      "pacing": "How the energy/tempo flows",
      "narrative_structure": "How the playlist tells a story"
    },
    "target_matching": {
      "genre_flexibility": 0.6,
      "mood_rigidity": 0.7,
      "cultural_specificity": 0.4,
      "era_constraints": 0.3
    },
    "expansion_guidelines": {
      "must_have_elements": ["Essential quality 1", "Essential quality 2"],
      "deal_breakers": ["Deal breaker 1"],
      "growth_potential": ["Growth direction 1", "Growth direction 2"]
    }
  },
  "matching_profile": {
    "similarity_priorities": [
      "Most important factor",
      "Secondary consideration",
      "Nice-to-have element"
    ],
    "exclusion_criteria": [
      "Type that would never fit",
      "Mood that would clash"
    ],
    "ideal_additions": [
      "Song archetype 1",
      "Song archetype 2"
    ]
  }
}`

export class PlaylistAnalysisService implements IPlaylistAnalysisService {
  constructor(
    private readonly providerManager: LlmProviderManager
  ) { }

  async analyzePlaylist(
    playlistName: string,
    playlistDescription: string,
    tracks: Array<{ name: string; artist: string }>
  ): Promise<string> {
    try {
      const trackList = tracks.length > 0
        ? tracks.map((track, index) =>
          `${index + 1}. "${track.name}" by ${track.artist}`
        ).join('\n')
        : 'No tracks provided - analyzing based on playlist name and description only'

      const safeDescription = playlistDescription?.trim() || 'No description provided'

      const filledPrompt = ENHANCED_PLAYLIST_ANALYSIS_PROMPT
        .replace('{playlist_name}', playlistName)
        .replace('{playlist_description}', safeDescription)
        .replace('{track_count}', tracks.length.toString())
        .replace('{track_list}', trackList)

      if (!this.providerManager) {
        throw new Error('LLM Provider Manager is not initialized')
      }

      console.log(`[PlaylistAnalysis] Analyzing playlist: ${playlistName}`)

      // Use structured output - AI SDK validates against schema automatically
      const result = await this.providerManager.generateObject<PlaylistAnalysis>(
        filledPrompt,
        valibotSchema(PlaylistAnalysisLlmSchema)
      )

      console.log('[PlaylistAnalysis] Analysis structure validated via structured output')

      // Return the standard format expected by workers
      return JSON.stringify({
        model: this.providerManager.getCurrentModel(),
        analysis: result.output
      })
    } catch (error) {
      throw new Error(`Failed to analyze playlist ${playlistName}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
}