/**
 * Model Bundle Configuration Types
 *
 * Defines the "model bundle" concept - a single configuration object
 * representing the active set of ML models used in the pipeline.
 *
 * This enables:
 * - Versioned model tracking in persisted artifacts
 * - Safe model upgrades with automatic cache invalidation
 * - Clear documentation of model dependencies
 */

// =============================================================================
// Model Identifiers
// =============================================================================

/**
 * Embedding model configuration.
 * The primary model for generating text embeddings.
 */
export interface EmbeddingModelConfig {
	/** HuggingFace model name or custom identifier */
	name: string
	/** Model version (HF revision, semver, or date) */
	version: string
	/** Output embedding dimensions */
	dims: number
	/** Whether this is an instruction-tuned model */
	isInstructionTuned?: boolean
}

/**
 * Emotion model configuration.
 * Used for emotion detection/classification.
 */
export interface EmotionModelConfig {
	/** HuggingFace model name or custom identifier */
	name: string
	/** Model version */
	version: string
	/** Number of emotion labels */
	numLabels: number
}

/**
 * Reranker model configuration.
 * Used for stage-2 reranking of top candidates.
 */
export interface RerankerModelConfig {
	/** HuggingFace model name or custom identifier */
	name: string
	/** Model version */
	version: string
	/** Maximum sequence length */
	maxLength?: number
}

/**
 * Complete model bundle - all models used in the pipeline.
 */
export interface ModelBundle {
	/** Primary embedding model (required) */
	embedding: EmbeddingModelConfig
	/** Emotion detection model (optional) */
	emotion?: EmotionModelConfig
	/** Reranker model (optional) */
	reranker?: RerankerModelConfig
}

// =============================================================================
// Default Model Bundles
// =============================================================================

/**
 * Current production model bundle.
 * This is the target configuration from MODEL_OPTIMIZATION_PLAN.md.
 */
export const MODEL_BUNDLE_V2: ModelBundle = {
	embedding: {
		name: 'intfloat/multilingual-e5-large-instruct',
		version: '2024-01',
		dims: 1024,
		isInstructionTuned: true,
	},
	emotion: {
		name: 'SamLowe/roberta-base-go_emotions',
		version: '2023-01',
		numLabels: 28,
	},
	reranker: {
		name: 'Qwen/Qwen3-Reranker-0.6B',
		version: '2024-01',
		maxLength: 8192,
	},
}

/**
 * Legacy model bundle (current implementation).
 * Used for comparison and backwards reference.
 */
export const MODEL_BUNDLE_V1: ModelBundle = {
	embedding: {
		name: 'all-mpnet-base-v2',
		version: 'legacy',
		dims: 768,
		isInstructionTuned: false,
	},
	// No emotion or reranker in v1
}

/**
 * Get the current active model bundle.
 * This will switch to V2 once the migration is complete.
 */
export function getActiveModelBundle(): ModelBundle {
	// TODO: Switch to MODEL_BUNDLE_V2 after Phase 5 migration
	return MODEL_BUNDLE_V1
}

// =============================================================================
// Matching Configuration
// =============================================================================

/**
 * Signal weights for multi-dimensional matching.
 */
export interface MatchingWeights {
	/** Weight for semantic/embedding similarity */
	semantic: number
	/** Weight for acoustic/audio feature similarity */
	acoustic: number
	/** Weight for emotion distribution similarity */
	emotion: number
	/** Weight for metadata matching (genre, etc.) */
	metadata?: number
}

/**
 * Playlist-type specific weight overrides.
 * Different playlist vibes benefit from different signal emphasis.
 */
export type PlaylistTypeWeights = Record<string, MatchingWeights>

/**
 * Thresholds for match filtering and ranking.
 */
export interface MatchingThresholds {
	/** Minimum overall score to consider a match */
	minScore: number
	/** Minimum semantic similarity */
	minSemanticSimilarity?: number
	/** Top-N candidates to consider for reranking */
	rerankTopN?: number
}

/**
 * Complete matching configuration.
 */
export interface MatchingConfig {
	/** Default signal weights */
	weights: MatchingWeights
	/** Playlist-type specific weight overrides */
	playlistTypeWeights?: PlaylistTypeWeights
	/** Score thresholds */
	thresholds: MatchingThresholds
}

/**
 * Default matching configuration.
 * Based on playlist type weight heuristics from MODEL_OPTIMIZATION_PLAN.md.
 */
export const DEFAULT_MATCHING_CONFIG: MatchingConfig = {
	weights: {
		semantic: 0.45,
		acoustic: 0.45,
		emotion: 0.1,
	},
	playlistTypeWeights: {
		workout: { semantic: 0.25, acoustic: 0.65, emotion: 0.1 },
		chill: { semantic: 0.55, acoustic: 0.35, emotion: 0.1 },
		emotional: { semantic: 0.7, acoustic: 0.15, emotion: 0.15 },
		party: { semantic: 0.3, acoustic: 0.6, emotion: 0.1 },
		focus: { semantic: 0.35, acoustic: 0.55, emotion: 0.1 },
		nostalgic: { semantic: 0.6, acoustic: 0.25, emotion: 0.15 },
		romantic: { semantic: 0.6, acoustic: 0.25, emotion: 0.15 },
		energetic: { semantic: 0.25, acoustic: 0.65, emotion: 0.1 },
		melancholic: { semantic: 0.7, acoustic: 0.15, emotion: 0.15 },
	},
	thresholds: {
		minScore: 0.3,
		minSemanticSimilarity: 0.2,
		rerankTopN: 50,
	},
}

/**
 * Get weights for a specific playlist type.
 * Falls back to default weights if type not found.
 */
export function getWeightsForPlaylistType(
	playlistType: string | undefined,
	config: MatchingConfig = DEFAULT_MATCHING_CONFIG
): MatchingWeights {
	if (!playlistType || !config.playlistTypeWeights) {
		return config.weights
	}

	const normalized = playlistType.toLowerCase().trim()
	return config.playlistTypeWeights[normalized] ?? config.weights
}
