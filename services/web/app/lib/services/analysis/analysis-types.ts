/**
 * Single source of truth for analysis types
 * These types are generated from the valibot schemas
 */

import { type InferOutput } from 'valibot'
import { SongAnalysisSchema, PlaylistAnalysisSchema } from './analysis-schemas'

// Export the types derived from schemas
export type SongAnalysis = InferOutput<typeof SongAnalysisSchema>
export type PlaylistAnalysis = InferOutput<typeof PlaylistAnalysisSchema>

// Re-export nested types for convenience
export type SongTheme = SongAnalysis['meaning']['themes'][0]
export type SongInterpretation = SongAnalysis['meaning']['interpretation']
export type SongEmotional = SongAnalysis['emotional']
export type SongContext = SongAnalysis['context']
export type SongListeningContexts = SongAnalysis['context']['listening_contexts']
export type SongMusicalStyle = SongAnalysis['musical_style']
export type SongMatchingProfile = SongAnalysis['matching_profile']
export type SongAudioFeatures = NonNullable<SongAnalysis['audio_features']>

// Analysis response wrapper (as returned by the service)
export interface AnalysisResponse {
  model: string
  analysis: SongAnalysis | PlaylistAnalysis
}

// Track analysis data structure for UI
export interface TrackAnalysisData {
  trackId: number
  trackName: string
  artistName: string
  analysis: SongAnalysis
  model: string
  analyzedAt: string
}

// Helper type guards
export function isSongAnalysis(analysis: unknown): analysis is SongAnalysis {
  return (
    typeof analysis === 'object' &&
    analysis !== null &&
    'meaning' in analysis &&
    'emotional' in analysis &&
    'context' in analysis &&
    'musical_style' in analysis &&
    'matching_profile' in analysis
  )
}

export function isPlaylistAnalysis(analysis: unknown): analysis is PlaylistAnalysis {
  return (
    typeof analysis === 'object' &&
    analysis !== null &&
    'meaning' in analysis &&
    'emotional' in analysis &&
    'context' in analysis &&
    'curation' in analysis &&
    'matching_profile' in analysis
  )
}