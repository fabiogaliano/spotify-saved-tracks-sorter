/**
 * Stable Content Hashing Utilities
 *
 * Provides deterministic, order-insensitive hashing for:
 * - Track content (analysis text for embedding)
 * - Playlist profiles (aggregated profile data)
 * - Model bundles (embedding + reranker + emotion models)
 * - Match contexts (config + candidate sets)
 *
 * Uses SHA-256 for cryptographic strength and collision resistance.
 * All hashes are prefixed with version for future-proofing.
 */
import { createHash } from 'crypto'

import type { VectorizationText } from './analysis-extractors'
import type { MatchingConfig, ModelBundle } from './model-bundle'
import {
	EXTRACTOR_VERSION,
	MATCHING_ALGO_VERSION,
	PLAYLIST_PROFILE_VERSION,
} from './versioning'

// =============================================================================
// Core Hashing Primitives
// =============================================================================

/**
 * Create a deterministic SHA-256 hash from any serializable content.
 * Handles object key ordering to ensure consistency.
 */
function sha256(content: string): string {
	return createHash('sha256').update(content, 'utf8').digest('hex')
}

/**
 * Serialize an object deterministically (sorted keys).
 * Handles nested objects and arrays.
 */
function stableStringify(obj: unknown): string {
	if (obj === null || obj === undefined) {
		return 'null'
	}

	if (typeof obj !== 'object') {
		return JSON.stringify(obj)
	}

	if (Array.isArray(obj)) {
		return '[' + obj.map(stableStringify).join(',') + ']'
	}

	// Sort object keys for deterministic ordering
	const sortedKeys = Object.keys(obj).sort()
	const parts = sortedKeys.map(key => {
		const value = (obj as Record<string, unknown>)[key]
		return `${JSON.stringify(key)}:${stableStringify(value)}`
	})

	return '{' + parts.join(',') + '}'
}

/**
 * Create a stable hash from any object.
 * Order-insensitive for object keys.
 */
export function stableHash(content: unknown): string {
	const serialized = stableStringify(content)
	return sha256(serialized)
}

/**
 * Create a short hash (first 16 chars) for display/logging.
 */
export function shortHash(content: unknown): string {
	return stableHash(content).substring(0, 16)
}

// =============================================================================
// Domain-Specific Hash Functions
// =============================================================================

/**
 * Hash for track embedding content.
 * Includes extractor version to invalidate when extraction logic changes.
 *
 * @param text - Extracted vectorization text
 * @returns Prefixed hash string: "te_v{version}_{hash}"
 */
export function hashTrackContent(text: VectorizationText): string {
	const content = {
		v: EXTRACTOR_VERSION,
		metadata: text.metadata,
		analysis: text.analysis,
		context: text.context,
	}
	return `te_v${EXTRACTOR_VERSION}_${shortHash(content)}`
}

/**
 * Hash for playlist profile content.
 * Includes profile version and all component hashes.
 *
 * @param params - Profile components
 * @returns Prefixed hash string: "pp_v{version}_{hash}"
 */
export function hashPlaylistProfile(params: {
	playlistText: VectorizationText
	trackIds: (string | number)[]
	genreDistribution?: Record<string, number>
	emotionDistribution?: Record<string, number>
	audioCentroid?: number[]
}): string {
	const content = {
		v: PLAYLIST_PROFILE_VERSION,
		text: params.playlistText,
		// Sort track IDs for determinism
		trackIds: [...params.trackIds].sort((a, b) => String(a).localeCompare(String(b))),
		genres: params.genreDistribution ?? null,
		emotions: params.emotionDistribution ?? null,
		// Round audio centroid to avoid floating point issues
		audio: params.audioCentroid?.map(v => Math.round(v * 10000) / 10000) ?? null,
	}
	return `pp_v${PLAYLIST_PROFILE_VERSION}_${shortHash(content)}`
}

/**
 * Hash for model bundle configuration.
 * Identifies the exact combination of models used.
 *
 * @param bundle - Model bundle configuration
 * @returns Prefixed hash string: "mb_{hash}"
 */
export function hashModelBundle(bundle: ModelBundle): string {
	const content = {
		embedding: {
			name: bundle.embedding.name,
			version: bundle.embedding.version,
			dims: bundle.embedding.dims,
		},
		emotion:
			bundle.emotion ?
				{
					name: bundle.emotion.name,
					version: bundle.emotion.version,
				}
			:	null,
		reranker:
			bundle.reranker ?
				{
					name: bundle.reranker.name,
					version: bundle.reranker.version,
				}
			:	null,
	}
	return `mb_${shortHash(content)}`
}

/**
 * Hash for matching configuration (weights, thresholds).
 * Used to detect when scoring logic changes.
 *
 * @param config - Matching configuration
 * @returns Prefixed hash string: "mc_v{version}_{hash}"
 */
export function hashMatchingConfig(config: MatchingConfig): string {
	const content = {
		v: MATCHING_ALGO_VERSION,
		weights: config.weights,
		thresholds: config.thresholds,
		playlistTypeWeights: config.playlistTypeWeights,
	}
	return `mc_${MATCHING_ALGO_VERSION}_${shortHash(content)}`
}

/**
 * Hash for a set of candidate track IDs.
 * Used to detect when the candidate pool changes.
 *
 * @param trackIds - Array of track IDs
 * @param trackContentHashes - Map of track ID to content hash
 * @returns Prefixed hash string: "cs_{hash}"
 */
export function hashCandidateSet(
	trackIds: (string | number)[],
	trackContentHashes: Map<string | number, string>
): string {
	// Sort IDs and pair with their content hashes
	const sorted = [...trackIds].sort((a, b) => String(a).localeCompare(String(b)))
	const pairs = sorted.map(id => ({
		id: String(id),
		hash: trackContentHashes.get(id) ?? 'unknown',
	}))
	return `cs_${shortHash(pairs)}`
}

/**
 * Hash for a set of playlist IDs with their profile hashes.
 * Used to detect when playlist profiles change.
 *
 * @param playlistIds - Array of playlist IDs
 * @param playlistProfileHashes - Map of playlist ID to profile hash
 * @returns Prefixed hash string: "ps_{hash}"
 */
export function hashPlaylistSet(
	playlistIds: (string | number)[],
	playlistProfileHashes: Map<string | number, string>
): string {
	const sorted = [...playlistIds].sort((a, b) => String(a).localeCompare(String(b)))
	const pairs = sorted.map(id => ({
		id: String(id),
		hash: playlistProfileHashes.get(id) ?? 'unknown',
	}))
	return `ps_${shortHash(pairs)}`
}

// =============================================================================
// Match Context Hash (combines all factors)
// =============================================================================

/**
 * Hash for complete match context.
 * This is the "cache key" for match results.
 *
 * If any component changes, the match context hash changes,
 * triggering recomputation of match results.
 */
export function hashMatchContext(params: {
	userId: string
	modelBundleHash: string
	configHash: string
	playlistSetHash: string
	candidateSetHash: string
}): string {
	const content = {
		user: params.userId,
		models: params.modelBundleHash,
		config: params.configHash,
		playlists: params.playlistSetHash,
		candidates: params.candidateSetHash,
	}
	return `ctx_${shortHash(content)}`
}

// =============================================================================
// Utilities
// =============================================================================

/**
 * Parse a prefixed hash to extract version info.
 * Returns null if format is unrecognized.
 */
export function parseHashPrefix(hash: string): {
	type: string
	version?: string | number
	hash: string
} | null {
	const patterns = [
		/^(te)_v(\d+)_(.+)$/, // track embedding
		/^(pp)_v(\d+)_(.+)$/, // playlist profile
		/^(mb)_(.+)$/, // model bundle (no version in hash)
		/^(mc)_([^_]+)_(.+)$/, // matching config
		/^(cs)_(.+)$/, // candidate set
		/^(ps)_(.+)$/, // playlist set
		/^(ctx)_(.+)$/, // match context
	]

	for (const pattern of patterns) {
		const match = hash.match(pattern)
		if (match) {
			if (match.length === 4) {
				return {
					type: match[1],
					version: isNaN(Number(match[2])) ? match[2] : Number(match[2]),
					hash: match[3],
				}
			}
			return {
				type: match[1],
				hash: match[2],
			}
		}
	}

	return null
}

/**
 * Check if a hash was created with the current version.
 */
export function isCurrentVersion(
	hash: string,
	type: 'track' | 'playlist' | 'config'
): boolean {
	const parsed = parseHashPrefix(hash)
	if (!parsed) return false

	switch (type) {
		case 'track':
			return parsed.type === 'te' && parsed.version === EXTRACTOR_VERSION
		case 'playlist':
			return parsed.type === 'pp' && parsed.version === PLAYLIST_PROFILE_VERSION
		case 'config':
			return parsed.type === 'mc' && parsed.version === MATCHING_ALGO_VERSION
		default:
			return false
	}
}
