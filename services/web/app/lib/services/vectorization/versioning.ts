/**
 * Versioning Constants for Embedding & Matching Pipeline
 *
 * These versions control cache invalidation and ensure reproducibility.
 * Bump the appropriate version when changing:
 * - EXTRACTOR: Text extraction logic in analysis-extractors.ts
 * - EMBEDDING_SCHEMA: Structure of stored embedding rows
 * - PLAYLIST_PROFILE: Playlist profile computation logic
 * - MATCHING_ALGO: Matching algorithm weights/logic
 */

/**
 * Version of the text extraction logic.
 * Bump when changing what fields are extracted or how they're formatted.
 * This affects the content hash of extracted text.
 */
export const EXTRACTOR_VERSION = 1 as const

/**
 * Version of the embedding storage schema.
 * Bump when changing the structure of persisted embedding rows.
 */
export const EMBEDDING_SCHEMA_VERSION = 1 as const

/**
 * Version of playlist profile computation.
 * Bump when changing how playlist profiles are aggregated.
 */
export const PLAYLIST_PROFILE_VERSION = 1 as const

/**
 * Version of the matching algorithm.
 * Bump when changing scoring weights, thresholds, or ranking logic.
 */
export const MATCHING_ALGO_VERSION = 'matching_v2' as const

/**
 * Combined version object for easy access
 */
export const PIPELINE_VERSIONS = {
	extractor: EXTRACTOR_VERSION,
	embeddingSchema: EMBEDDING_SCHEMA_VERSION,
	playlistProfile: PLAYLIST_PROFILE_VERSION,
	matchingAlgo: MATCHING_ALGO_VERSION,
} as const

export type PipelineVersions = typeof PIPELINE_VERSIONS
