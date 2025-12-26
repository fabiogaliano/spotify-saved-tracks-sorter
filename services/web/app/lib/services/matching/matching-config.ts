/**
 * Configuration for the hybrid matching algorithm
 * All weights and scoring parameters in one place for easy tuning
 */

export const MATCHING_WEIGHTS = {
  // Embedding weights for hybrid vectorization
  // Controls how metadata/analysis/context text is weighted when generating embeddings
  embedding: {
    metadata: 0.3,   // Title, artist, genre
    analysis: 0.5,   // Themes, mood, meaning
    context: 0.2,    // Listening contexts, situations
  },

  // Adaptive weights based on data availability
  profiles: {
    // When we have audio features and full analysis
    fullDataAvailable: {
      metadata: 0.15,
      vector: 0.25,
      audio: 0.25,
      context: 0.15,
      thematic: 0.15,
      flow: 0.05
    },
    // When we learned from existing songs and have full analysis (no audio)
    learnedWithAnalysis: {
      metadata: 0.2,
      vector: 0.35,
      audio: 0,
      context: 0.2,
      thematic: 0.2,
      flow: 0.05
    },
    // When only using playlist description
    // Increased context/thematic weights since we have rich analysis data
    fromDescription: {
      metadata: 0.15,
      vector: 0.35,
      audio: 0.10,
      context: 0.15,
      thematic: 0.20,
      flow: 0.05
    },
    // Default balanced weights
    default: {
      metadata: 0.2,
      vector: 0.3,
      audio: 0.2,
      context: 0.15,
      thematic: 0.1,
      flow: 0.05
    }
  },

  // Scoring thresholds and multipliers
  scoring: {
    // Mood matching scores
    mood: {
      match: 0.8,
      noMatch: 0.2,
      neutral: 0.5
    },
    // Genre matching weight (when Last.fm integration is ready)
    genre: {
      weight: 0.4
    },
    // Context alignment multiplier
    context: {
      weight: 0.3  // Per matching context
    },
    // Thematic alignment multiplier
    thematic: {
      themeWeight: 0.25  // Per matching theme
    },
    // Minimum score to not apply veto
    vetoThreshold: 0.2
  },

  // Tier processing thresholds
  tiers: {
    // Minimum weighted early score to run deep analysis
    // Uses weighted sum of metadata/vector/audio scores (max ~0.65)
    // 0.10 threshold ≈ 15% of max, keeping gate inclusive to avoid missing good matches
    deepAnalysisThreshold: 0.10
  }
} as const

/**
 * Note: Analysis type definitions are imported from analysis-schemas.ts
 * This file only contains matching algorithm configuration
 */