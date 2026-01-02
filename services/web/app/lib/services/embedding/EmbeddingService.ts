/**
 * Embedding Service
 *
 * Phase 4 of Model Optimization: DB-first embedding orchestration.
 *
 * This service replaces VectorCache as the source of truth for embeddings.
 * The pattern is:
 *   1. Extract canonical text from analysis
 *   2. Compute content_hash for cache key
 *   3. Check DB for persisted embedding
 *   4. If miss: call Python API via VectorizationService, validate dims, persist
 *   5. Optionally cache in-memory (L1) for hot-path optimization
 *
 * Key design decisions:
 * - VectorizationService remains a pure HTTP client to Python API
 * - EmbeddingService owns orchestration and persistence
 * - Uses track.id (not artist-title) as the canonical identifier
 * - All embeddings are versioned by model bundle + content hash
 */
import { logger } from '~/lib/logging/Logger'
import type {
	TrackEmbedding,
	TrackEmbeddingInsert,
	TrackEmbeddingLookupKey,
	TrackEmbeddingRepository,
} from '~/lib/models/Embedding'
import type { Song } from '~/lib/models/Matching'
import type { SongAnalysis } from '~/lib/services/analysis/analysis-schemas'

import type { VectorizationService } from '../vectorization/VectorizationService'
import {
	type VectorizationText,
	extractSongAnalysisOnly,
	extractSongText,
} from '../vectorization/analysis-extractors'
import { hashTrackContent } from '../vectorization/hashing'
import { type ModelBundle, getActiveModelBundle } from '../vectorization/model-bundle'

// =============================================================================
// Types
// =============================================================================

/**
 * Embedding kinds for different use cases.
 * Each kind can have different extraction/weighting strategies.
 */
export type EmbeddingKind = 'track_semantic_v1' | 'playlist_semantic_v1'

/**
 * Result of an embedding operation.
 * Includes the vector and metadata about how it was produced.
 */
export interface EmbeddingResult {
	/** The embedding vector */
	embedding: number[]
	/** The content hash used for cache key */
	contentHash: string
	/** Whether this was a cache hit (DB) */
	fromCache: boolean
	/** Model bundle used */
	modelBundle: ModelBundle
	/** Embedding kind */
	kind: EmbeddingKind
}

/**
 * Options for embedding operations.
 */
export interface EmbeddingOptions {
	/** Override the default model bundle */
	modelBundle?: ModelBundle
	/** Skip DB cache and force recompute (for testing/backfills) */
	skipCache?: boolean
	/** Skip persisting to DB (for testing) */
	skipPersist?: boolean
}

/**
 * Progress callback for batch operations.
 */
export interface BatchProgress {
	total: number
	completed: number
	cached: number
	computed: number
	errors: number
}

export type BatchProgressCallback = (progress: BatchProgress) => void

/**
 * Input for track embedding - either a full Song or just the analysis with ID.
 */
export type TrackInput =
	| { song: Song; trackId?: never; analysis?: never }
	| { trackId: number; analysis: SongAnalysis; song?: never }

/**
 * Result of a batch embedding operation.
 */
export interface BatchEmbeddingResult {
	/** Successfully embedded tracks (trackId -> result) */
	results: Map<number, EmbeddingResult>
	/** Failed tracks (trackId -> error message) */
	errors: Map<number, string>
	/** Summary statistics */
	stats: {
		total: number
		cached: number
		computed: number
		failed: number
	}
}

// =============================================================================
// Service Interface
// =============================================================================

/**
 * Embedding service interface.
 * Provides DB-first embedding operations with automatic caching.
 */
export interface EmbeddingService {
	/**
	 * Get or compute embedding for a track.
	 * Checks DB first, computes and persists on miss.
	 */
	embedTrack(input: TrackInput, options?: EmbeddingOptions): Promise<EmbeddingResult>

	/**
	 * Batch embed multiple tracks.
	 * Optimizes for cache hits and batches API calls for misses.
	 */
	embedTrackBatch(
		inputs: TrackInput[],
		options?: EmbeddingOptions,
		onProgress?: BatchProgressCallback
	): Promise<BatchEmbeddingResult>

	/**
	 * Check if embedding exists in DB without fetching it.
	 */
	hasEmbedding(trackId: number, options?: EmbeddingOptions): Promise<boolean>

	/**
	 * Get embedding directly from DB (no compute).
	 * Returns null if not found.
	 */
	getEmbedding(
		trackId: number,
		options?: EmbeddingOptions
	): Promise<EmbeddingResult | null>

	/**
	 * Invalidate cached embedding for a track.
	 * Use when analysis changes and embedding needs recompute.
	 */
	invalidate(trackId: number): Promise<void>
}

// =============================================================================
// Implementation
// =============================================================================

/**
 * Default implementation of EmbeddingService.
 * Uses VectorizationService for embedding generation and TrackEmbeddingRepository for persistence.
 */
export class DefaultEmbeddingService implements EmbeddingService {
	private readonly vectorizationService: VectorizationService
	private readonly embeddingRepository: TrackEmbeddingRepository

	// In-memory L1 cache for hot-path optimization
	// Map: trackId -> Map<contentHash, embedding>
	private readonly memoryCache: Map<number, Map<string, number[]>> = new Map()
	private readonly memoryCacheMaxSize = 1000

	constructor(
		vectorizationService: VectorizationService,
		embeddingRepository: TrackEmbeddingRepository
	) {
		this.vectorizationService = vectorizationService
		this.embeddingRepository = embeddingRepository
	}

	async embedTrack(
		input: TrackInput,
		options: EmbeddingOptions = {}
	): Promise<EmbeddingResult> {
		const modelBundle = options.modelBundle ?? getActiveModelBundle()
		const kind: EmbeddingKind = 'track_semantic_v1'

		// Extract track ID and text
		const { trackId, text } = this.extractTrackInfo(input)

		// Compute content hash
		const contentHash = hashTrackContent(text)

		// Check L1 memory cache first
		if (!options.skipCache) {
			const memoryCached = this.getFromMemoryCache(trackId, contentHash)
			if (memoryCached) {
				logger.debug('Embedding L1 cache hit', { trackId, contentHash })
				return {
					embedding: memoryCached,
					contentHash,
					fromCache: true,
					modelBundle,
					kind,
				}
			}
		}

		// Check DB cache
		if (!options.skipCache) {
			const lookupKey: TrackEmbeddingLookupKey = {
				track_id: trackId,
				embedding_kind: kind,
				model_name: modelBundle.embedding.name,
				model_version: modelBundle.embedding.version,
				content_hash: contentHash,
			}

			const dbCached = await this.embeddingRepository.getByKey(lookupKey)
			if (dbCached) {
				logger.debug('Embedding DB cache hit', { trackId, contentHash })

				// Parse the embedding from DB (stored as string in pgvector)
				const embedding = this.parseDbEmbedding(dbCached.embedding)

				// Populate L1 cache
				this.setMemoryCache(trackId, contentHash, embedding)

				return {
					embedding,
					contentHash,
					fromCache: true,
					modelBundle,
					kind,
				}
			}
		}

		// Cache miss - compute embedding
		logger.debug('Embedding cache miss, computing', { trackId, contentHash })

		const embedding = await this.computeEmbedding(text)

		// Validate dimensions
		this.validateDimensions(embedding, modelBundle)

		// Persist to DB
		if (!options.skipPersist) {
			await this.persistEmbedding({
				track_id: trackId,
				embedding_kind: kind,
				model_name: modelBundle.embedding.name,
				model_version: modelBundle.embedding.version,
				dims: modelBundle.embedding.dims,
				content_hash: contentHash,
				embedding: this.formatDbEmbedding(embedding),
			})
		}

		// Update L1 cache
		this.setMemoryCache(trackId, contentHash, embedding)

		return {
			embedding,
			contentHash,
			fromCache: false,
			modelBundle,
			kind,
		}
	}

	async embedTrackBatch(
		inputs: TrackInput[],
		options: EmbeddingOptions = {},
		onProgress?: BatchProgressCallback
	): Promise<BatchEmbeddingResult> {
		const modelBundle = options.modelBundle ?? getActiveModelBundle()
		const kind: EmbeddingKind = 'track_semantic_v1'

		const results = new Map<number, EmbeddingResult>()
		const errors = new Map<number, string>()
		let cached = 0
		let computed = 0

		const progress: BatchProgress = {
			total: inputs.length,
			completed: 0,
			cached: 0,
			computed: 0,
			errors: 0,
		}

		// Extract all track info
		const trackInfos = inputs.map(input => ({
			input,
			...this.extractTrackInfo(input),
		}))

		// Check which embeddings already exist in DB
		const trackIds = trackInfos.map(t => t.trackId)
		const existingMap =
			options.skipCache ?
				new Map<number, TrackEmbedding>()
			:	await this.embeddingRepository.getByTrackIds(
					trackIds,
					kind,
					modelBundle.embedding.name,
					modelBundle.embedding.version
				)

		// Separate cache hits from misses
		type TrackInfoWithHash = (typeof trackInfos)[0] & { contentHash: string }
		const toCompute: TrackInfoWithHash[] = []

		for (const info of trackInfos) {
			const existing = existingMap.get(info.trackId)
			const contentHash = hashTrackContent(info.text)

			// Check if we have a matching embedding (same content hash)
			if (existing && existing.content_hash === contentHash) {
				const embedding = this.parseDbEmbedding(existing.embedding)
				results.set(info.trackId, {
					embedding,
					contentHash,
					fromCache: true,
					modelBundle,
					kind,
				})
				cached++
				progress.cached++
				progress.completed++
				onProgress?.(progress)
			} else {
				toCompute.push({ ...info, contentHash })
			}
		}

		// Batch compute remaining embeddings
		// Process in chunks to avoid overwhelming the API
		const BATCH_SIZE = 10

		for (let i = 0; i < toCompute.length; i += BATCH_SIZE) {
			const batch = toCompute.slice(i, i + BATCH_SIZE)

			// Process batch in parallel
			const batchPromises = batch.map(async info => {
				try {
					const result = await this.embedTrack(
						info.input,
						{ ...options, skipCache: true } // We already checked cache
					)
					results.set(info.trackId, result)
					computed++
					progress.computed++
				} catch (error) {
					const message = error instanceof Error ? error.message : 'Unknown error'
					errors.set(info.trackId, message)
					progress.errors++
					logger.warn('Failed to embed track in batch', {
						trackId: info.trackId,
						error: message,
					})
				}
				progress.completed++
				onProgress?.(progress)
			})

			await Promise.all(batchPromises)
		}

		return {
			results,
			errors,
			stats: {
				total: inputs.length,
				cached,
				computed,
				failed: errors.size,
			},
		}
	}

	async hasEmbedding(trackId: number, options: EmbeddingOptions = {}): Promise<boolean> {
		const modelBundle = options.modelBundle ?? getActiveModelBundle()
		const kind: EmbeddingKind = 'track_semantic_v1'

		// We need the content hash to check, but we don't have the analysis here
		// So we just check if any embedding exists for this track+model
		const embeddings = await this.embeddingRepository.getByTrackIds(
			[trackId],
			kind,
			modelBundle.embedding.name,
			modelBundle.embedding.version
		)

		return embeddings.has(trackId)
	}

	async getEmbedding(
		trackId: number,
		options: EmbeddingOptions = {}
	): Promise<EmbeddingResult | null> {
		const modelBundle = options.modelBundle ?? getActiveModelBundle()
		const kind: EmbeddingKind = 'track_semantic_v1'

		const embeddings = await this.embeddingRepository.getByTrackIds(
			[trackId],
			kind,
			modelBundle.embedding.name,
			modelBundle.embedding.version
		)

		const dbEmbedding = embeddings.get(trackId)
		if (!dbEmbedding) {
			return null
		}

		return {
			embedding: this.parseDbEmbedding(dbEmbedding.embedding),
			contentHash: dbEmbedding.content_hash,
			fromCache: true,
			modelBundle,
			kind,
		}
	}

	async invalidate(trackId: number): Promise<void> {
		// Clear L1 cache
		this.memoryCache.delete(trackId)

		// Delete from DB
		await this.embeddingRepository.deleteByTrackId(trackId)

		logger.debug('Invalidated embeddings for track', { trackId })
	}

	// ===========================================================================
	// Private Helpers
	// ===========================================================================

	private extractTrackInfo(input: TrackInput): {
		trackId: number
		text: VectorizationText
	} {
		if (input.song) {
			// Full Song object - use song.id (database ID), not song.track.id
			const song = input.song
			if (!song.analysis) {
				throw new logger.AppError(
					'Song analysis required for embedding',
					'VALIDATION_ERROR',
					400
				)
			}
			return {
				trackId: song.id,
				text: extractSongText(song),
			}
		} else {
			// Just analysis + trackId
			return {
				trackId: input.trackId,
				text: extractSongAnalysisOnly(input.analysis),
			}
		}
	}

	private async computeEmbedding(text: VectorizationText): Promise<number[]> {
		return this.vectorizationService.embedHybrid(text)
	}

	private validateDimensions(embedding: number[], modelBundle: ModelBundle): void {
		const expected = modelBundle.embedding.dims
		const actual = embedding.length

		if (actual !== expected) {
			throw new logger.AppError(
				`Embedding dimension mismatch: expected ${expected}, got ${actual}`,
				'DIMENSION_MISMATCH',
				500,
				{ expected, actual, model: modelBundle.embedding.name }
			)
		}
	}

	private async persistEmbedding(embedding: TrackEmbeddingInsert): Promise<void> {
		try {
			await this.embeddingRepository.upsert(embedding)
		} catch (error) {
			logger.error('Failed to persist embedding', error as Error, {
				trackId: embedding.track_id,
			})
			// Don't throw - embedding was computed successfully, just persistence failed
		}
	}

	/**
	 * Parse embedding from DB storage format.
	 * pgvector stores as string like "[0.1,0.2,0.3,...]"
	 */
	private parseDbEmbedding(dbValue: string | number[]): number[] {
		if (Array.isArray(dbValue)) {
			return dbValue
		}
		// pgvector format: "[0.1,0.2,0.3]"
		const cleaned = dbValue.replace(/^\[|\]$/g, '')
		return cleaned.split(',').map(Number)
	}

	/**
	 * Format embedding for DB storage.
	 * pgvector accepts array directly or string format.
	 */
	private formatDbEmbedding(embedding: number[]): string {
		return `[${embedding.join(',')}]`
	}

	// ===========================================================================
	// L1 Memory Cache Management
	// ===========================================================================

	private getFromMemoryCache(trackId: number, contentHash: string): number[] | null {
		const trackCache = this.memoryCache.get(trackId)
		if (!trackCache) return null
		return trackCache.get(contentHash) ?? null
	}

	private setMemoryCache(
		trackId: number,
		contentHash: string,
		embedding: number[]
	): void {
		// Evict if at capacity
		if (this.memoryCache.size >= this.memoryCacheMaxSize) {
			// Simple LRU: delete first entry
			const firstKey = this.memoryCache.keys().next().value
			if (firstKey !== undefined) {
				this.memoryCache.delete(firstKey)
			}
		}

		let trackCache = this.memoryCache.get(trackId)
		if (!trackCache) {
			trackCache = new Map()
			this.memoryCache.set(trackId, trackCache)
		}
		trackCache.set(contentHash, embedding)
	}
}
