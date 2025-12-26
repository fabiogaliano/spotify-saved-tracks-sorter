import * as v from 'valibot'

/**
 * Valibot schemas for validating LLM analysis outputs
 */

// Cultural markers schema
export const CulturalMarkersSchema = v.object({
  historical_events: v.optional(v.array(v.string())),
  social_movements: v.optional(v.array(v.string())),
  cultural_figures: v.optional(v.array(v.string())),
  generational_markers: v.optional(v.array(v.string())),
  community_identity: v.optional(v.array(v.string())),
  political_stance: v.optional(v.array(v.string()))
})

// Theme schema
export const ThemeSchema = v.object({
  name: v.string(),
  confidence: v.pipe(v.number(), v.minValue(0), v.maxValue(1)),
  description: v.string(),
  cultural_context: v.optional(v.string()),
  references: v.optional(v.array(v.string())),
  impact: v.optional(v.string())
})

// Song analysis schema - streamlined for clarity and utility
export const SongAnalysisSchema = v.object({
  meaning: v.object({
    themes: v.array(v.object({
      name: v.string(),
      confidence: v.pipe(v.number(), v.minValue(0), v.maxValue(1)),
      description: v.string()
    })),
    interpretation: v.object({
      surface_meaning: v.string(),
      deeper_meaning: v.string(),
      cultural_significance: v.optional(v.string()),
      metaphors: v.optional(v.array(v.object({
        text: v.string(),
        meaning: v.string()
      }))),
      key_lines: v.optional(v.array(v.object({
        line: v.string(),
        significance: v.string()
      })))
    })
  }),
  emotional: v.object({
    dominant_mood: v.string(),
    mood_description: v.string(),
    intensity: v.pipe(v.number(), v.minValue(0), v.maxValue(1)),
    valence: v.pipe(v.number(), v.minValue(0), v.maxValue(1)),
    energy: v.pipe(v.number(), v.minValue(0), v.maxValue(1)),
    journey: v.optional(v.array(v.object({
      section: v.string(),
      mood: v.string(),
      description: v.string()
    }))),
    emotional_peaks: v.optional(v.array(v.string()))
  }),
  context: v.object({
    listening_contexts: v.object({
      workout: v.pipe(v.number(), v.minValue(0), v.maxValue(1)),
      party: v.pipe(v.number(), v.minValue(0), v.maxValue(1)),
      relaxation: v.pipe(v.number(), v.minValue(0), v.maxValue(1)),
      focus: v.pipe(v.number(), v.minValue(0), v.maxValue(1)),
      driving: v.pipe(v.number(), v.minValue(0), v.maxValue(1)),
      emotional_release: v.pipe(v.number(), v.minValue(0), v.maxValue(1)),
      cooking: v.pipe(v.number(), v.minValue(0), v.maxValue(1)),
      social_gathering: v.pipe(v.number(), v.minValue(0), v.maxValue(1)),
      morning_routine: v.pipe(v.number(), v.minValue(0), v.maxValue(1)),
      late_night: v.pipe(v.number(), v.minValue(0), v.maxValue(1)),
      romance: v.pipe(v.number(), v.minValue(0), v.maxValue(1)),
      meditation: v.pipe(v.number(), v.minValue(0), v.maxValue(1))
    }),
    best_moments: v.optional(v.array(v.string())),
    audience: v.object({
      primary_demographic: v.optional(v.string()),
      universal_appeal: v.pipe(v.number(), v.minValue(0), v.maxValue(1)),
      resonates_with: v.optional(v.array(v.string()))
    })
  }),
  musical_style: v.object({
    genre_primary: v.string(),
    genre_secondary: v.optional(v.string()),
    vocal_style: v.string(),
    production_style: v.string(),
    sonic_texture: v.optional(v.string()),
    distinctive_elements: v.optional(v.array(v.string()))
  }),
  matching_profile: v.object({
    mood_consistency: v.pipe(v.number(), v.minValue(0), v.maxValue(1)),
    energy_flexibility: v.pipe(v.number(), v.minValue(0), v.maxValue(1)),
    theme_cohesion: v.pipe(v.number(), v.minValue(0), v.maxValue(1)),
    sonic_similarity: v.pipe(v.number(), v.minValue(0), v.maxValue(1))
  }),
  audio_features: v.optional(v.object({
    tempo: v.number(),
    energy: v.pipe(v.number(), v.minValue(0), v.maxValue(1)),
    valence: v.pipe(v.number(), v.minValue(0), v.maxValue(1)),
    danceability: v.pipe(v.number(), v.minValue(0), v.maxValue(1)),
    acousticness: v.pipe(v.number(), v.minValue(0), v.maxValue(1)),
    instrumentalness: v.pipe(v.number(), v.minValue(0), v.maxValue(1)),
    liveness: v.pipe(v.number(), v.minValue(0), v.maxValue(1)),
    speechiness: v.pipe(v.number(), v.minValue(0), v.maxValue(1)),
    loudness: v.number()
  }))
})

// Playlist analysis schema
export const PlaylistAnalysisSchema = v.object({
  meaning: v.object({
    playlist_purpose: v.string(),
    core_themes: v.array(v.object({
      name: v.string(),
      confidence: v.pipe(v.number(), v.minValue(0), v.maxValue(1)),
      description: v.string(),
      cultural_significance: v.optional(v.string()),
      supporting_tracks: v.optional(v.array(v.string()))
    })),
    cultural_identity: v.object({
      primary_community: v.optional(v.string()),
      generational_markers: v.optional(v.array(v.string())),
      social_movements: v.optional(v.array(v.string())),
      historical_context: v.optional(v.string()),
      geographic_culture: v.optional(v.string())
    }),
    main_message: v.string(),
    contradiction_analysis: v.optional(v.object({
      internal_conflicts: v.optional(v.array(v.string())),
      resolution: v.optional(v.string())
    }))
  }),
  emotional: v.object({
    dominantMood: v.object({
      mood: v.string(),
      description: v.string(),
      consistency: v.pipe(v.number(), v.minValue(0), v.maxValue(1))
    }),
    emotional_arc: v.object({
      opening_mood: v.string(),
      peak_moments: v.optional(v.array(v.string())),
      resolution: v.string(),
      journey_type: v.string()
    }),
    intensity_score: v.pipe(v.number(), v.minValue(0), v.maxValue(1)),
    emotional_range: v.pipe(v.number(), v.minValue(0), v.maxValue(1)),
    catharsis_potential: v.pipe(v.number(), v.minValue(0), v.maxValue(1))
  }),
  context: v.object({
    primary_setting: v.optional(v.string()),
    social_context: v.object({
      alone_vs_group: v.pipe(v.number(), v.minValue(0), v.maxValue(1)),
      intimate_vs_public: v.pipe(v.number(), v.minValue(0), v.maxValue(1)),
      active_vs_passive: v.pipe(v.number(), v.minValue(0), v.maxValue(1))
    }),
    situations: v.object({
      perfect_for: v.array(v.string()),
      avoid_during: v.optional(v.array(v.string())),
      why: v.optional(v.string())
    }),
    temporal_context: v.optional(v.object({
      time_of_day: v.optional(v.array(v.string())),
      season: v.optional(v.array(v.string())),
      life_moments: v.optional(v.array(v.string()))
    })),
    listening_experience: v.object({
      attention_level: v.string(),
      interaction_style: v.string(),
      repeat_potential: v.pipe(v.number(), v.minValue(0), v.maxValue(1))
    })
  }),
  curation: v.object({
    cohesion_factors: v.array(v.string()),
    flow_analysis: v.object({
      transition_quality: v.pipe(v.number(), v.minValue(0), v.maxValue(1)),
      pacing: v.string(),
      narrative_structure: v.optional(v.string())
    }),
    target_matching: v.object({
      genre_flexibility: v.pipe(v.number(), v.minValue(0), v.maxValue(1)),
      mood_rigidity: v.pipe(v.number(), v.minValue(0), v.maxValue(1)),
      cultural_specificity: v.pipe(v.number(), v.minValue(0), v.maxValue(1)),
      era_constraints: v.pipe(v.number(), v.minValue(0), v.maxValue(1))
    }),
    expansion_guidelines: v.object({
      must_have_elements: v.array(v.string()),
      deal_breakers: v.optional(v.array(v.string())),
      growth_potential: v.optional(v.array(v.string()))
    })
  }),
  matching_profile: v.object({
    similarity_priorities: v.array(v.string()),
    exclusion_criteria: v.optional(v.array(v.string())),
    ideal_additions: v.optional(v.array(v.string()))
  })
})

// Type exports from schemas
export type SongAnalysis = v.InferOutput<typeof SongAnalysisSchema>
export type PlaylistAnalysis = v.InferOutput<typeof PlaylistAnalysisSchema>
export type CulturalMarkers = v.InferOutput<typeof CulturalMarkersSchema>
export type Theme = v.InferOutput<typeof ThemeSchema>

// Re-export types from the single source of truth
export * from './analysis-types'