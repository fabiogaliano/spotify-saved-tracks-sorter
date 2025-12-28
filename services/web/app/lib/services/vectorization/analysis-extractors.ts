/**
 * Analysis Text Extractors
 *
 * Extract text from Song and Playlist analysis schemas for vectorization.
 * TypeScript owns schema knowledge - Python just receives text strings.
 */
import type { Playlist, Song } from '~/lib/models/Matching'
import type {
	PlaylistAnalysis,
	SongAnalysis,
} from '~/lib/services/analysis/analysis-schemas'
import { isValidNumber, safeNumber } from '~/lib/utils/safe-number'

/**
 * Text extracted for vectorization, split by semantic category.
 * Python API will weight and combine these for hybrid embedding.
 */
export interface VectorizationText {
	/** Title, artist, genre info */
	metadata: string
	/** Themes, mood, meaning, interpretation */
	analysis: string
	/** Listening contexts, situations, settings */
	context: string
}

/**
 * Extract vectorization text from a Song object.
 * Handles SongAnalysis schema structure.
 */
export function extractSongText(song: Song): VectorizationText {
	const { track, analysis } = song

	return {
		metadata: extractSongMetadata(track, analysis),
		analysis: extractSongAnalysisText(analysis),
		context: extractSongContextText(analysis),
	}
}

/**
 * Extract vectorization text from a Playlist object.
 * Handles PlaylistAnalysis schema structure (spread on playlist object).
 */
export function extractPlaylistText(playlist: Playlist): VectorizationText {
	return {
		metadata: extractPlaylistMetadata(playlist),
		analysis: extractPlaylistAnalysisText(playlist),
		context: extractPlaylistContextText(playlist),
	}
}

// =============================================================================
// Song Extraction Helpers
// =============================================================================

function extractSongMetadata(track: Song['track'], analysis: SongAnalysis): string {
	const parts: string[] = []

	// Track info
	if (track.title) parts.push(track.title)
	if (track.artist) parts.push(track.artist)
	if (track.album) parts.push(track.album)

	// Genre from musical_style
	if (analysis.musical_style) {
		if (analysis.musical_style.genre_primary) {
			parts.push(analysis.musical_style.genre_primary)
		}
		if (analysis.musical_style.genre_secondary) {
			parts.push(analysis.musical_style.genre_secondary)
		}
	}

	return parts.filter(Boolean).join(' ')
}

function extractSongAnalysisText(analysis: SongAnalysis): string {
	const parts: string[] = []

	// Themes with confidence weighting
	if (analysis.meaning?.themes?.length) {
		const themeText = analysis.meaning.themes
			.map(t => {
				const weight = Math.max(1, Math.round(safeNumber(t.confidence, 0.5) * 2))
				const text = `${t.name} ${t.description}`.trim()
				return Array(weight).fill(text).join(' ')
			})
			.join(' ')
		parts.push(themeText)
	}

	// Interpretation
	if (analysis.meaning?.interpretation) {
		const interp = analysis.meaning.interpretation
		if (interp.surface_meaning) parts.push(interp.surface_meaning)
		if (interp.deeper_meaning) parts.push(interp.deeper_meaning)
		if (interp.cultural_significance) parts.push(interp.cultural_significance)
	}

	// Mood (flat string in Song schema)
	if (analysis.emotional?.dominant_mood) {
		parts.push(analysis.emotional.dominant_mood)
	}
	if (analysis.emotional?.mood_description) {
		parts.push(analysis.emotional.mood_description)
	}

	// Intensity as text
	const intensity = analysis.emotional?.intensity
	if (isValidNumber(intensity)) {
		parts.push(intensityToText(intensity))
	}

	// Musical style details
	if (analysis.musical_style) {
		if (analysis.musical_style.vocal_style) {
			parts.push(analysis.musical_style.vocal_style)
		}
		if (analysis.musical_style.production_style) {
			parts.push(analysis.musical_style.production_style)
		}
		if (analysis.musical_style.sonic_texture) {
			parts.push(analysis.musical_style.sonic_texture)
		}
	}

	return parts.filter(Boolean).join(' ')
}

function extractSongContextText(analysis: SongAnalysis): string {
	const parts: string[] = []

	// Listening contexts - convert scores to text
	if (analysis.context?.listening_contexts) {
		const contexts = analysis.context.listening_contexts
		const topContexts = getTopListeningContexts(contexts, 5)
		if (topContexts.length) {
			parts.push(topContexts.join(' '))
		}
	}

	// Best moments
	if (analysis.context?.best_moments?.length) {
		parts.push(analysis.context.best_moments.join(' '))
	}

	// Audience
	if (analysis.context?.audience) {
		if (analysis.context.audience.primary_demographic) {
			parts.push(analysis.context.audience.primary_demographic)
		}
		if (analysis.context.audience.resonates_with?.length) {
			parts.push(analysis.context.audience.resonates_with.join(' '))
		}
	}

	return parts.filter(Boolean).join(' ')
}

// =============================================================================
// Playlist Extraction Helpers
// =============================================================================

function extractPlaylistMetadata(playlist: Playlist): string {
	const parts: string[] = []

	// Title/name
	const name = playlist.name || playlist.title
	if (name) parts.push(name)

	// Description
	if (playlist.description) parts.push(playlist.description)

	// Purpose from analysis
	if (playlist.meaning?.playlist_purpose) {
		parts.push(playlist.meaning.playlist_purpose)
	}

	return parts.filter(Boolean).join(' ')
}

function extractPlaylistAnalysisText(playlist: Playlist): string {
	const parts: string[] = []

	// Core themes (different field name than Song)
	if (playlist.meaning?.core_themes?.length) {
		const themeText = playlist.meaning.core_themes
			.map(t => {
				const weight = Math.max(1, Math.round(safeNumber(t.confidence, 0.5) * 2))
				const text = `${t.name} ${t.description}`.trim()
				return Array(weight).fill(text).join(' ')
			})
			.join(' ')
		parts.push(themeText)
	}

	// Main message
	if (playlist.meaning?.main_message) {
		parts.push(playlist.meaning.main_message)
	}

	// Cultural identity
	if (playlist.meaning?.cultural_identity) {
		const cultural = playlist.meaning.cultural_identity
		if (cultural.primary_community) parts.push(cultural.primary_community)
		if (cultural.historical_context) parts.push(cultural.historical_context)
		if (cultural.generational_markers?.length) {
			parts.push(cultural.generational_markers.join(' '))
		}
	}

	// Mood (nested object in Playlist schema)
	if (playlist.emotional?.dominant_mood) {
		if (playlist.emotional.dominant_mood.mood) {
			parts.push(playlist.emotional.dominant_mood.mood)
		}
		if (playlist.emotional.dominant_mood.description) {
			parts.push(playlist.emotional.dominant_mood.description)
		}
	}

	// Intensity
	const intensity = playlist.emotional?.intensity_score
	if (isValidNumber(intensity)) {
		parts.push(intensityToText(intensity))
	}

	// Emotional arc
	if (playlist.emotional?.emotional_arc) {
		const arc = playlist.emotional.emotional_arc
		if (arc.opening_mood) parts.push(arc.opening_mood)
		if (arc.journey_type) parts.push(arc.journey_type)
		if (arc.resolution) parts.push(arc.resolution)
	}

	return parts.filter(Boolean).join(' ')
}

function extractPlaylistContextText(playlist: Playlist): string {
	const parts: string[] = []

	// Primary setting
	if (playlist.context?.primary_setting) {
		parts.push(playlist.context.primary_setting)
	}

	// Perfect for situations
	if (playlist.context?.situations?.perfect_for?.length) {
		parts.push(playlist.context.situations.perfect_for.join(' '))
	}

	// Why it fits
	if (playlist.context?.situations?.why) {
		parts.push(playlist.context.situations.why)
	}

	// Temporal context
	if (playlist.context?.temporal_context) {
		const temporal = playlist.context.temporal_context
		if (temporal.time_of_day?.length) {
			parts.push(temporal.time_of_day.join(' '))
		}
		if (temporal.life_moments?.length) {
			parts.push(temporal.life_moments.join(' '))
		}
	}

	// Listening experience
	if (playlist.context?.listening_experience) {
		if (playlist.context.listening_experience.attention_level) {
			parts.push(playlist.context.listening_experience.attention_level)
		}
		if (playlist.context.listening_experience.interaction_style) {
			parts.push(playlist.context.listening_experience.interaction_style)
		}
	}

	// Curation hints
	if (playlist.curation?.cohesion_factors?.length) {
		parts.push(playlist.curation.cohesion_factors.join(' '))
	}

	return parts.filter(Boolean).join(' ')
}

// =============================================================================
// Shared Utilities
// =============================================================================

/**
 * Convert numeric intensity (0-1) to descriptive text
 */
function intensityToText(intensity: number): string {
	if (intensity > 0.8) return 'very intense'
	if (intensity > 0.6) return 'intense'
	if (intensity > 0.4) return 'moderate'
	if (intensity > 0.2) return 'mild'
	return 'subtle'
}

/**
 * Get top N listening contexts by score, converted to readable text
 */
function getTopListeningContexts(
	contexts: SongAnalysis['context']['listening_contexts'],
	limit: number
): string[] {
	const entries = Object.entries(contexts) as [string, number][]

	return entries
		.filter(([, score]) => isValidNumber(score) && score > 0.4)
		.sort((a, b) => b[1] - a[1])
		.slice(0, limit)
		.map(([context]) => context.replace(/_/g, ' '))
}

/**
 * Extract text directly from SongAnalysis (when Song object not available)
 */
export function extractSongAnalysisOnly(analysis: SongAnalysis): VectorizationText {
	return {
		metadata: extractSongMetadataFromAnalysis(analysis),
		analysis: extractSongAnalysisText(analysis),
		context: extractSongContextText(analysis),
	}
}

function extractSongMetadataFromAnalysis(analysis: SongAnalysis): string {
	const parts: string[] = []

	if (analysis.musical_style) {
		if (analysis.musical_style.genre_primary) {
			parts.push(analysis.musical_style.genre_primary)
		}
		if (analysis.musical_style.genre_secondary) {
			parts.push(analysis.musical_style.genre_secondary)
		}
	}

	return parts.filter(Boolean).join(' ')
}

/**
 * Combine VectorizationText into single string for simple embedding
 */
export function combineVectorizationText(text: VectorizationText): string {
	return [text.metadata, text.analysis, text.context].filter(Boolean).join(' | ')
}
