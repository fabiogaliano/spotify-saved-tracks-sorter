// @ts-nocheck - Advanced config not yet in use, types need work
/**
 * Advanced configuration system for matching algorithm
 * Supports A/B testing, runtime updates, and performance tracking
 */

import { logger } from '~/lib/logging/Logger'

// Weight profile version for tracking changes
export const ALGORITHM_VERSION = '2.0.0'

// Default weights (can be overridden)
export const DEFAULT_WEIGHTS = {
  metadata: 0.2,
  vector: 0.35,
  audio: 0.25,
  cultural: 0.1,
  thematic: 0.1
} as const

// Named preset configurations
export const WEIGHT_PRESETS = {
  // For users who care about musical coherence
  audiophile: {
    metadata: 0.1,
    vector: 0.2,
    audio: 0.5,  // Heavy audio focus
    cultural: 0.1,
    thematic: 0.1
  },
  
  // For users who care about lyrical meaning
  lyricist: {
    metadata: 0.15,
    vector: 0.3,
    audio: 0.15,
    cultural: 0.2,  // More cultural weight
    thematic: 0.2   // More thematic weight
  },
  
  // Balanced approach (default)
  balanced: DEFAULT_WEIGHTS,
  
  // Fast matching (less deep analysis)
  speed: {
    metadata: 0.3,
    vector: 0.5,
    audio: 0.2,
    cultural: 0,   // Skip expensive analysis
    thematic: 0
  }
} as const

// Configuration manager for runtime updates
export class MatchingConfigManager {
  private static instance: MatchingConfigManager
  private userPreferences: Map<number, keyof typeof WEIGHT_PRESETS> = new Map()
  private abTests: Map<string, any> = new Map()
  
  static getInstance(): MatchingConfigManager {
    if (!this.instance) {
      this.instance = new MatchingConfigManager()
    }
    return this.instance
  }
  
  /**
   * Get weights for a specific user
   */
  async getWeights(userId?: number): Promise<typeof DEFAULT_WEIGHTS> {
    // Check for A/B test enrollment
    if (userId) {
      const abTest = this.getActiveABTest(userId)
      if (abTest) {
        logger.debug('Using A/B test weights', { userId, test: abTest.name })
        return abTest.weights
      }
      
      // Check user preferences
      const preset = this.userPreferences.get(userId)
      if (preset) {
        return WEIGHT_PRESETS[preset]
      }
    }
    
    // Default to balanced
    return WEIGHT_PRESETS.balanced
  }
  
  /**
   * Set user's preferred weight preset
   */
  async setUserPreset(userId: number, preset: keyof typeof WEIGHT_PRESETS) {
    this.userPreferences.set(userId, preset)
    // In production, save to database
    logger.info('Updated user weight preset', { userId, preset })
  }
  
  /**
   * Get active A/B test for user
   */
  private getActiveABTest(userId: number): { name: string; weights: typeof DEFAULT_WEIGHTS } | null {
    // Guard against non-positive IDs to avoid unintended enrollment
    if (userId <= 0) {
      return null
    }

    // Simple hash-based assignment (in production, use proper A/B testing service)
    const testGroup = userId % 10

    if (testGroup === 0 && this.abTests.has('audio_boost_test')) {
      const testConfig = this.abTests.get('audio_boost_test')
      return {
        name: 'audio_boost_test',
        weights: testConfig?.weights ?? DEFAULT_WEIGHTS
      }
    }

    return null
  }
  
  /**
   * Start an A/B test
   */
  startABTest(name: string, config: any) {
    this.abTests.set(name, config)
    logger.info('Started A/B test', { name, config })
  }
}

// Performance tracking
export class AlgorithmPerformance {
  private metrics: Map<string, number[]> = new Map()
  private static readonly MAX_SCORES_PER_KEY = 1000

  /**
   * Track a match result
   */
  trackMatch(userId: number, trackId: string, score: number, outcome: 'added' | 'skipped' | 'played') {
    const key = `${userId}:${outcome}`
    const scores = this.metrics.get(key) || []
    scores.push(score)

    // Prevent unbounded growth - keep only recent scores
    if (scores.length > AlgorithmPerformance.MAX_SCORES_PER_KEY) {
      scores.shift()
    }

    this.metrics.set(key, scores)

    // Log for analysis
    logger.debug('Match outcome tracked', { userId, trackId, score, outcome })
  }
  
  /**
   * Get average score for successful matches
   */
  getAverageSuccessScore(userId: number): number {
    const scores = this.metrics.get(`${userId}:added`) || []
    if (scores.length === 0) return 0
    return scores.reduce((a, b) => a + b, 0) / scores.length
  }
  
  /**
   * Adjust weights based on performance
   */
  suggestWeightAdjustments(userId: number): Partial<typeof DEFAULT_WEIGHTS> | null {
    const addedScores = this.metrics.get(`${userId}:added`) || []
    const skippedScores = this.metrics.get(`${userId}:skipped`) || []
    
    if (addedScores.length < 10 || skippedScores.length < 10) {
      return null // Not enough data
    }
    
    // Simple heuristic: if added songs have high audio scores, boost audio weight
    // In production, use ML to optimize weights
    const avgAdded = this.getAverageSuccessScore(userId)
    const avgSkipped = skippedScores.reduce((a, b) => a + b, 0) / skippedScores.length
    
    if (avgAdded > avgSkipped * 1.2) {
      logger.info('Current weights performing well', { userId, avgAdded, avgSkipped })
      return null
    }
    
    // Suggest adjustments (simplified)
    return {
      audio: 0.35,  // Boost audio
      vector: 0.3   // Reduce vector
    }
  }
}

// Export singleton instances
export const configManager = MatchingConfigManager.getInstance()
export const performanceTracker = new AlgorithmPerformance()

// Helper to get current weights with logging
export async function getCurrentWeights(userId?: number) {
  const weights = await configManager.getWeights(userId)
  logger.debug('Using matching weights', { 
    userId, 
    weights,
    version: ALGORITHM_VERSION 
  })
  return weights
}