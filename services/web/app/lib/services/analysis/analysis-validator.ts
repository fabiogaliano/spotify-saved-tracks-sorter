import * as v from 'valibot'
import { SongAnalysisSchema, type SongAnalysis } from './analysis-schemas'
import { logger } from '~/lib/logging/Logger'
import { safeNumberInRange } from '~/lib/utils/safe-number'

// Fields that should be arrays of strings
const STRING_ARRAY_FIELDS = new Set([
  'generational_markers', 'social_movements', 'peak_moments',
  'perfect_for', 'avoid_during', 'time_of_day', 'season', 'life_moments',
  'cohesion_factors', 'must_have_elements', 'deal_breakers', 'growth_potential',
  'similarity_priorities', 'exclusion_criteria', 'ideal_additions',
  'internal_conflicts', 'supporting_tracks'
])

// Fields that should be arrays of objects
const OBJECT_ARRAY_FIELDS = new Set([
  'core_themes', 'themes', 'metaphors', 'key_lines', 'journey'
])

// Fields that should be numbers (0.0 to 1.0 scores)
const NUMBER_FIELDS = new Set([
  'confidence', 'consistency', 'intensity_score', 'emotional_range',
  'catharsis_potential', 'alone_vs_group', 'intimate_vs_public',
  'active_vs_passive', 'repeat_potential', 'transition_quality',
  'genre_flexibility', 'mood_rigidity', 'cultural_specificity',
  'era_constraints', 'universal_appeal', 'mood_consistency',
  'energy_flexibility', 'theme_cohesion', 'sonic_similarity'
])

/**
 * Coerce LLM output to match expected schema types.
 * LLMs sometimes return strings instead of arrays, single objects instead of arrays,
 * or string representations of numbers.
 */
export function coerceLlmOutput(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj
  if (Array.isArray(obj)) return obj.map(item => coerceLlmOutput(item))
  if (typeof obj !== 'object') return obj

  const result: Record<string, unknown> = {}
  const record = obj as Record<string, unknown>

  for (const [key, value] of Object.entries(record)) {
    if (STRING_ARRAY_FIELDS.has(key) && typeof value === 'string') {
      // Coerce single string to array
      result[key] = [value]
    } else if (OBJECT_ARRAY_FIELDS.has(key) && typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Coerce single object to array of objects
      result[key] = [coerceLlmOutput(value)]
    } else if (NUMBER_FIELDS.has(key) && typeof value === 'string') {
      // Try to extract a number from the string, default to 0.5
      result[key] = safeNumberInRange(parseFloat(value), 0, 1, 0.5)
    } else if (typeof value === 'object' && value !== null) {
      // Recurse into nested objects
      result[key] = coerceLlmOutput(value)
    } else {
      result[key] = value
    }
  }

  return result
}

/**
 * Validates analysis data from the database.
 * Returns validated data or null if validation fails.
 *
 * Use this at data boundaries (repository layer) to ensure
 * type safety for analysis data coming from JSON columns.
 */
export function validateSongAnalysis(data: unknown): SongAnalysis | null {
  if (!data) return null

  const result = v.safeParse(SongAnalysisSchema, data)

  if (!result.success) {
    logger.warn('Invalid song analysis data', {
      issues: result.issues.slice(0, 3), // Log first 3 issues
    })
    return null
  }

  return result.output
}

/**
 * Validates analysis data, returning original data if valid or null if invalid.
 * Less strict than validateSongAnalysis - logs warning but doesn't block.
 *
 * Use this for defensive validation where you want to continue
 * processing even with partially invalid data.
 */
export function validateSongAnalysisLoose(data: unknown): SongAnalysis | null {
  if (!data) return null

  try {
    const result = v.safeParse(SongAnalysisSchema, data)
    if (result.success) {
      return result.output
    }

    // Log but still try to use the data if it has the expected shape
    logger.debug('Song analysis validation issues (using data anyway)', {
      issueCount: result.issues.length,
    })

    // If it at least has the expected top-level structure, return it
    if (
      typeof data === 'object' &&
      data !== null &&
      'meaning' in data &&
      'emotional' in data &&
      'context' in data
    ) {
      return data as SongAnalysis
    }

    return null
  } catch {
    return null
  }
}

/**
 * Type guard for checking if data is a valid SongAnalysis.
 */
export function isSongAnalysis(data: unknown): data is SongAnalysis {
  if (!data || typeof data !== 'object') return false

  const result = v.safeParse(SongAnalysisSchema, data)
  return result.success
}
