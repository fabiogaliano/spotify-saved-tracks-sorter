import * as v from 'valibot'

import { logger } from '~/lib/logging/Logger'
import { safeNumberInRange } from '~/lib/utils/safe-number'

import { type SongAnalysis, SongAnalysisSchema } from './analysis-schemas'

// Fields that should be arrays of strings
const STRING_ARRAY_FIELDS = new Set([
	'generational_markers',
	'social_movements',
	'peak_moments',
	'perfect_for',
	'avoid_during',
	'time_of_day',
	'season',
	'life_moments',
	'cohesion_factors',
	'must_have_elements',
	'deal_breakers',
	'growth_potential',
	'similarity_priorities',
	'exclusion_criteria',
	'ideal_additions',
	'internal_conflicts',
	'supporting_tracks',
])

// Fields that should be arrays of objects, with string-to-object coercion
const OBJECT_ARRAY_COERCION: Record<string, (s: string) => object> = {
	themes: s => ({ name: s, confidence: 0.5, description: '' }),
	core_themes: s => ({ name: s, confidence: 0.5, description: '' }),
	metaphors: s => ({ text: s, meaning: '' }),
	key_lines: s => ({ line: s, significance: '' }),
	journey: s => ({ section: 'verse', mood: s, description: '' }),
}

const OBJECT_ARRAY_FIELDS = new Set(Object.keys(OBJECT_ARRAY_COERCION))

// Fields that should be numbers (0.0 to 1.0 scores)
const NUMBER_FIELDS = new Set([
	// Shared / nested object scores
	'confidence',
	'consistency',
	'intensity_score',
	'emotional_range',
	'catharsis_potential',
	'alone_vs_group',
	'intimate_vs_public',
	'active_vs_passive',
	'repeat_potential',
	'transition_quality',
	'genre_flexibility',
	'mood_rigidity',
	'cultural_specificity',
	'era_constraints',
	'universal_appeal',
	'mood_consistency',
	'energy_flexibility',
	'theme_cohesion',
	'sonic_similarity',
	// Song emotional top-level scores
	'intensity',
	'valence',
	'energy',
	// Listening context scores
	'workout',
	'party',
	'relaxation',
	'focus',
	'driving',
	'emotional_release',
	'cooking',
	'social_gathering',
	'morning_routine',
	'late_night',
	'romance',
	'meditation',
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
		} else if (OBJECT_ARRAY_FIELDS.has(key) && typeof value === 'string') {
			// Coerce string to array of objects using field-specific mapping
			const coercer = OBJECT_ARRAY_COERCION[key]
			result[key] = [coercer(value)]
		} else if (
			OBJECT_ARRAY_FIELDS.has(key) &&
			typeof value === 'object' &&
			value !== null &&
			!Array.isArray(value)
		) {
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
 * Type guard for checking if data is a valid SongAnalysis.
 */
export function isSongAnalysis(data: unknown): data is SongAnalysis {
	if (!data || typeof data !== 'object') return false

	const result = v.safeParse(SongAnalysisSchema, data)
	return result.success
}
