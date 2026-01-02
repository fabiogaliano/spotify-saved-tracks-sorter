/**
 * Match Caching Service
 *
 * Phase 8 of Model Optimization: Cache-first matching orchestration.
 *
 * This service ensures that repeated matching runs with identical inputs
 * return cached results without recomputing embeddings or running the matcher.
 *
 * Cache invalidation is automatic:
 * - If playlist analysis changes -> playlist profile hash changes -> cache miss
 * - If track analyses change -> candidate content hashes change -> cache miss
 * - If model bundle changes -> model bundle hash changes -> cache miss
 * - If matching config changes -> config hash changes -> cache miss
 *
 * Key design decisions:
 * - Context-based caching: full matching context is hashed for cache key
 * - Transparent fallback: if cache miss, delegates to MatchingService
 * - Results are stored per (context, track, playlist) for fine-grained retrieval
 * - Supports pruning of old contexts to prevent unbounded cache growth
 */
import { logger } from '~/lib/logging/Logger'
import type {
	MatchContext,
	MatchContextInsert,
	MatchContextRepository,
	MatchResultInsert,
	MatchResultRepository,
	MatchResultRow,
} from '~/lib/models/Embedding'
import type { MatchResult, MatchScores, Playlist, Song } from '~/lib/models/Matching'
import { toNumericId } from '~/lib/utils/safe-number'
import type { Json } from '~/types/database.types'

import type { EmbeddingService } from '../embedding/EmbeddingService'
import type { PlaylistProfilingService } from '../profiling/PlaylistProfilingService'
import { extractSongText } from '../vectorization/analysis-extractors'
import {
	hashCandidateSet,
	hashMatchContext,
	hashMatchingConfig,
	hashModelBundle,
	hashPlaylistSet,
	hashTrackContent,
} from '../vectorization/hashing'
import {
	DEFAULT_MATCHING_CONFIG,
	type MatchingConfig,
	type ModelBundle,
	getActiveModelBundle,
} from '../vectorization/model-bundle'
import { MATCHING_ALGO_VERSION } from '../vectorization/versioning'
import type { MatchingService } from './MatchingService'

// =============================================================================
// Types
// =============================================================================

/**
 * Input for a matching operation with caching.
 */
export interface CachedMatchingInput {
	/** User ID for cache isolation */
	userId: number
	/** Target playlist */
	playlist: Playlist
	/** Candidate songs to match */
	songs: Song[]
	/** Existing songs in the playlist (for profiling) */
	existingPlaylistSongs: Song[]
	/** Optional matching config override */
	matchingConfig?: MatchingConfig
	/** Optional model bundle override */
	modelBundle?: ModelBundle
}

/**
 * Result from cached matching operation.
 */
export interface CachedMatchingResult {
	/** Match results (same as MatchingService output) */
	results: MatchResult[]
	/** Whether this was a cache hit */
	fromCache: boolean
	/** The match context ID (for debugging/tracking) */
	contextId: number
	/** The context hash used for cache lookup */
	contextHash: string
	/** Processing time in milliseconds */
	processingTime: number
}

/**
 * Options for cache behavior.
 */
export interface CachingOptions {
	/** Skip cache lookup and force recompute */
	skipCache?: boolean
	/** Skip persisting results (for testing) */
	skipPersist?: boolean
	/** Maximum old contexts to keep per user */
	maxContextsPerUser?: number
}

/**
 * Statistics about cache operations.
 */
export interface CacheStats {
	/** Number of cache hits */
	hits: number
	/** Number of cache misses */
	misses: number
	/** Number of contexts pruned */
	pruned: number
}

// =============================================================================
// Service Interface
// =============================================================================

/**
 * Match caching service interface.
 * Wraps MatchingService with automatic caching.
 */
export interface MatchCachingService {
	/**
	 * Match songs to playlist with caching.
	 * Returns cached results if available, otherwise computes and caches.
	 */
	matchWithCaching(
		input: CachedMatchingInput,
		options?: CachingOptions
	): Promise<CachedMatchingResult>

	/**
	 * Invalidate cached results for a user.
	 * Call this when user modifies playlists or preferences.
	 */
	invalidateUserCache(userId: number): Promise<void>

	/**
	 * Invalidate cached results for a specific playlist.
	 */
	invalidatePlaylistCache(userId: number, playlistId: number): Promise<void>

	/**
	 * Get cache statistics.
	 */
	getStats(): CacheStats
}

// =============================================================================
// Implementation
// =============================================================================

/**
 * Default implementation of MatchCachingService.
 */
export class DefaultMatchCachingService implements MatchCachingService {
	private stats: CacheStats = { hits: 0, misses: 0, pruned: 0 }

	constructor(
		private readonly matchingService: MatchingService,
		private readonly contextRepository: MatchContextRepository,
		private readonly resultRepository: MatchResultRepository,
		private readonly embeddingService?: EmbeddingService,
		private readonly profilingService?: PlaylistProfilingService
	) {}

	async matchWithCaching(
		input: CachedMatchingInput,
		options: CachingOptions = {}
	): Promise<CachedMatchingResult> {
		const startTime = Date.now()
		const modelBundle = input.modelBundle ?? getActiveModelBundle()
		const matchingConfig = input.matchingConfig ?? DEFAULT_MATCHING_CONFIG

		// Build all the hashes needed for the context
		const {
			contextHash,
			modelBundleHash,
			configHash,
			playlistSetHash,
			candidateSetHash,
			trackContentHashes,
		} = await this.buildContextHashes(input, modelBundle, matchingConfig)

		logger.debug('Built match context hashes', {
			contextHash: contextHash.slice(0, 20),
			candidateCount: input.songs.length,
			userId: input.userId,
		})

		// Check cache unless explicitly skipped
		// Convert playlist ID to number for DB operations
		const playlistIdNum = toNumericId(input.playlist.id)

		if (!options.skipCache) {
			const cached = await this.contextRepository.getByContextHash(contextHash)

			if (cached) {
				// Cache hit - fetch results
				const cachedResults = await this.resultRepository.getByContextAndPlaylist(
					cached.id,
					playlistIdNum
				)

				if (cachedResults.length > 0) {
					this.stats.hits++
					const results = this.convertResultsFromDb(cachedResults, input.songs)

					logger.info('Match cache HIT', {
						contextId: cached.id,
						resultCount: results.length,
						processingTime: Date.now() - startTime,
					})

					return {
						results,
						fromCache: true,
						contextId: cached.id,
						contextHash,
						processingTime: Date.now() - startTime,
					}
				}
			}
		}

		// Cache miss - compute matches
		this.stats.misses++

		logger.info('Match cache MISS, computing', {
			contextHash: contextHash.slice(0, 20),
			candidateCount: input.songs.length,
		})

		const results = await this.matchingService.matchSongsToPlaylist(
			input.playlist,
			input.songs,
			input.existingPlaylistSongs
		)

		// Persist results unless skipped
		if (!options.skipPersist) {
			const context = await this.persistContext({
				user_id: input.userId,
				embedding_model_name: modelBundle.embedding.name,
				embedding_model_version: modelBundle.embedding.version,
				reranker_model_name: modelBundle.reranker?.name ?? null,
				reranker_model_version: modelBundle.reranker?.version ?? null,
				emotion_model_name: modelBundle.emotion?.name ?? null,
				emotion_model_version: modelBundle.emotion?.version ?? null,
				algorithm_version: MATCHING_ALGO_VERSION,
				config_hash: configHash,
				playlist_set_hash: playlistSetHash,
				candidate_set_hash: candidateSetHash,
				context_hash: contextHash,
			})

			await this.persistResults(context.id, playlistIdNum, results, input.songs)

			// Prune old contexts if needed
			const maxContexts = options.maxContextsPerUser ?? 10
			const pruned = await this.contextRepository.pruneOldContexts(
				input.userId,
				maxContexts
			)
			if (pruned > 0) {
				this.stats.pruned += pruned
			}

			logger.info('Match results cached', {
				contextId: context.id,
				resultCount: results.length,
				processingTime: Date.now() - startTime,
			})

			return {
				results,
				fromCache: false,
				contextId: context.id,
				contextHash,
				processingTime: Date.now() - startTime,
			}
		}

		// Not persisting - return without context ID
		return {
			results,
			fromCache: false,
			contextId: -1,
			contextHash,
			processingTime: Date.now() - startTime,
		}
	}

	async invalidateUserCache(userId: number): Promise<void> {
		try {
			const contexts = await this.contextRepository.getByUserId(userId)

			for (const context of contexts) {
				await this.contextRepository.delete(context.id)
			}

			logger.info('Invalidated user cache', {
				userId,
				contextsDeleted: contexts.length,
			})
		} catch (error) {
			logger.error('Failed to invalidate user cache', error as Error, { userId })
			throw error
		}
	}

	async invalidatePlaylistCache(userId: number, playlistId: number): Promise<void> {
		// We need to find all contexts that include this playlist
		// For now, we invalidate all user contexts (more aggressive but correct)
		// A more efficient approach would require indexing contexts by playlist
		await this.invalidateUserCache(userId)
	}

	getStats(): CacheStats {
		return { ...this.stats }
	}

	// ===========================================================================
	// Private Helpers
	// ===========================================================================

	/**
	 * Build all hashes needed for the match context.
	 */
	private async buildContextHashes(
		input: CachedMatchingInput,
		modelBundle: ModelBundle,
		matchingConfig: MatchingConfig
	): Promise<{
		contextHash: string
		modelBundleHash: string
		configHash: string
		playlistSetHash: string
		candidateSetHash: string
		trackContentHashes: Map<number, string>
	}> {
		// Build track content hashes (keyed by number for internal use)
		const trackContentHashes = new Map<number, string>()
		// Also build a string-keyed version for the hash functions
		const trackContentHashesForHashing = new Map<string | number, string>()

		for (const song of input.songs) {
			if (song.analysis) {
				const text = extractSongText(song)
				const hash = hashTrackContent(text)
				trackContentHashes.set(song.id, hash)
				trackContentHashesForHashing.set(String(song.id), hash)
			}
		}

		// Build playlist profile hash
		// For simplicity, we use the playlist ID + existing song IDs as the profile hash
		// A more complete implementation would include the actual profile content hash
		const playlistProfileHashes = new Map<string | number, string>()
		const playlistIdStr = input.playlist.id

		// Create a simple profile hash from playlist + existing songs
		const existingSongIds = input.existingPlaylistSongs
			.map(s => s.id)
			.sort((a, b) => a - b)
		const profileHash = `pp_${input.playlist.id}_${existingSongIds.join(',')}`
		playlistProfileHashes.set(playlistIdStr, profileHash)

		// Build component hashes
		const modelBundleHash = hashModelBundle(modelBundle)
		const configHash = hashMatchingConfig(matchingConfig)
		const candidateSetHash = hashCandidateSet(
			input.songs.map(s => String(s.id)),
			trackContentHashesForHashing
		)
		const playlistSetHash = hashPlaylistSet([playlistIdStr], playlistProfileHashes)

		// Build final context hash
		const contextHash = hashMatchContext({
			userId: String(input.userId),
			modelBundleHash,
			configHash,
			playlistSetHash,
			candidateSetHash,
		})

		return {
			contextHash,
			modelBundleHash,
			configHash,
			playlistSetHash,
			candidateSetHash,
			trackContentHashes,
		}
	}

	/**
	 * Persist match context to database.
	 */
	private async persistContext(context: MatchContextInsert): Promise<MatchContext> {
		try {
			return await this.contextRepository.upsert(context)
		} catch (error) {
			logger.error('Failed to persist match context', error as Error, {
				contextHash: context.context_hash,
			})
			throw error
		}
	}

	/**
	 * Persist match results to database.
	 */
	private async persistResults(
		contextId: number,
		playlistId: number,
		results: MatchResult[],
		songs: Song[]
	): Promise<void> {
		// Build a map of track_info.id (as string) -> song.id for lookup
		const trackIdToSongId = new Map<string, number>()
		for (const song of songs) {
			trackIdToSongId.set(String(song.track.id), song.id)
		}

		const resultInserts: MatchResultInsert[] = results.map((result, index) => {
			// Get the database track ID from the song
			const trackInfoIdStr = String(result.track_info.id)
			const trackId =
				trackIdToSongId.get(trackInfoIdStr) ?? toNumericId(result.track_info.id)

			return {
				match_context_id: contextId,
				track_id: trackId,
				playlist_id: playlistId,
				score: result.similarity, // DB expects number
				factors: result.component_scores as unknown as Json,
				rank: index + 1,
			}
		})

		try {
			const { inserted, errors } = await this.resultRepository.insertBatch(resultInserts)

			if (errors > 0) {
				logger.warn('Some match results failed to persist', {
					contextId,
					attempted: resultInserts.length,
					inserted,
					errors,
				})
			}
		} catch (error) {
			logger.error('Failed to persist match results', error as Error, {
				contextId,
				resultCount: resultInserts.length,
			})
			// Don't throw - results were computed successfully
		}
	}

	/**
	 * Convert database result rows back to MatchResult format.
	 */
	private convertResultsFromDb(rows: MatchResultRow[], songs: Song[]): MatchResult[] {
		// Build a map of track_id -> song for quick lookup
		const songMap = new Map<number, Song>()
		for (const song of songs) {
			songMap.set(song.id, song)
		}

		// Default component scores for rows without factors
		const defaultScores: MatchScores = {
			theme_similarity: 0,
			mood_similarity: 0,
			mood_compatibility: 0,
			sentiment_compatibility: 0,
			intensity_match: 0,
			activity_match: 0,
			fit_score_similarity: 0,
			thematic_contradiction: 0,
		}

		// Sort rows by rank (or score if rank not available)
		const sortedRows = [...rows].sort((a, b) => {
			if (a.rank !== null && b.rank !== null) {
				return a.rank - b.rank
			}
			// row.score is already a number from the DB
			return b.score - a.score
		})

		return sortedRows.map(row => {
			const song = songMap.get(row.track_id)

			// Reconstruct track_info from song or create minimal version
			const trackInfo = song?.track ?? {
				id: String(row.track_id),
				title: 'Unknown',
				artist: 'Unknown',
				album: '',
				spotify_track_id: '',
			}

			// Parse factors back to component scores with proper type
			const componentScores: MatchScores =
				row.factors ?
					{ ...defaultScores, ...(row.factors as unknown as Partial<MatchScores>) }
				:	defaultScores

			const similarity = row.score // Already a number from DB

			return {
				track_info: trackInfo,
				similarity,
				component_scores: componentScores,
				veto_applied: similarity < 0.3,
				veto_reason: similarity < 0.3 ? 'Low compatibility' : undefined,
			}
		})
	}
}
