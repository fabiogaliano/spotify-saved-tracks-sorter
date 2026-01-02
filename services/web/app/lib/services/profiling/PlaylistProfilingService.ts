/**
 * Playlist Profiling Service
 *
 * Phase 6 of Model Optimization: DB-first playlist profile orchestration.
 *
 * This service replaces in-memory playlist profiling with persisted profiles.
 * The pattern is:
 *   1. Extract playlist text and track IDs
 *   2. Compute content_hash for cache key
 *   3. Check DB for persisted profile
 *   4. If miss: compute profile (centroid, audio, genres, emotions), persist
 *   5. Optionally cache in-memory (L1) for hot-path optimization
 *
 * Key design decisions:
 * - Profiles are composite: centroid vector + audio features + genre/emotion distributions
 * - Uses EmbeddingService to get track embeddings for centroid calculation
 * - Content hash includes track IDs, so membership changes trigger recompute
 * - Model bundle hash ensures profiles are invalidated on model changes
 */
import { logger } from '~/lib/logging/Logger'
import type {
	PlaylistProfile as DbPlaylistProfile,
	PlaylistProfileInsert,
	PlaylistProfileLookupKey,
	PlaylistProfileRepository,
} from '~/lib/models/Embedding'
import type { Playlist, Song } from '~/lib/models/Matching'
import { toNumericId } from '~/lib/utils/safe-number'
import type { Json } from '~/types/database.types'

import type { EmbeddingService } from '../embedding/EmbeddingService'
import type { ReccoBeatsAudioFeatures } from '../reccobeats/ReccoBeatsService'
import {
	type VectorizationText,
	extractPlaylistText,
} from '../vectorization/analysis-extractors'
import { hashModelBundle, hashPlaylistProfile } from '../vectorization/hashing'
import { type ModelBundle, getActiveModelBundle } from '../vectorization/model-bundle'

// =============================================================================
// Types
// =============================================================================

/**
 * Profile kinds for different use cases.
 */
export type ProfileKind = 'content_v1' | 'context_v1'

/**
 * Structured aggregates stored in the profile.
 */
export interface AudioCentroid {
	energy?: number
	valence?: number
	danceability?: number
	acousticness?: number
	instrumentalness?: number
	speechiness?: number
	liveness?: number
	tempo?: number
	loudness?: number
}

export interface GenreDistribution {
	[genre: string]: number // genre -> frequency/count
}

export interface EmotionDistribution {
	[emotion: string]: number // emotion -> frequency/count
}

/**
 * Computed playlist profile with all aggregates.
 * This is the in-memory representation used by matching.
 */
export interface ComputedPlaylistProfile {
	/** Playlist ID */
	playlistId: number
	/** Profile kind */
	kind: ProfileKind
	/** Centroid embedding vector */
	embedding: number[]
	/** Aggregated audio features */
	audioCentroid: AudioCentroid
	/** Genre distribution from tracks */
	genreDistribution: GenreDistribution
	/** Emotion distribution from tracks */
	emotionDistribution: EmotionDistribution
	/** IDs of tracks used to build profile */
	trackIds: number[]
	/** Number of tracks used */
	trackCount: number
	/** Content hash for cache key */
	contentHash: string
	/** Model bundle hash */
	modelBundleHash: string
	/** Whether this was a cache hit (DB) */
	fromCache: boolean
	/** Profile method */
	method: 'learned_from_songs' | 'from_description'
}

/**
 * Options for profiling operations.
 */
export interface ProfilingOptions {
	/** Override the default model bundle */
	modelBundle?: ModelBundle
	/** Skip DB cache and force recompute (for testing/backfills) */
	skipCache?: boolean
	/** Skip persisting to DB (for testing) */
	skipPersist?: boolean
	/** User ID for DB record */
	userId?: number
}

/**
 * Progress callback for batch operations.
 */
export interface ProfileBatchProgress {
	total: number
	completed: number
	cached: number
	computed: number
	errors: number
}

export type ProfileBatchProgressCallback = (progress: ProfileBatchProgress) => void

/**
 * Result of a batch profiling operation.
 */
export interface BatchProfilingResult {
	/** Successfully profiled playlists (playlistId -> profile) */
	results: Map<number, ComputedPlaylistProfile>
	/** Failed playlists (playlistId -> error message) */
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
 * Playlist profiling service interface.
 * Provides DB-first profile operations with automatic caching.
 */
export interface PlaylistProfilingService {
	/**
	 * Get or compute profile for a playlist.
	 * Checks DB first, computes and persists on miss.
	 */
	profilePlaylist(
		playlist: Playlist,
		songs: Song[],
		options?: ProfilingOptions
	): Promise<ComputedPlaylistProfile>

	/**
	 * Batch profile multiple playlists.
	 * Optimizes for cache hits and batches computations.
	 */
	profilePlaylistBatch(
		playlists: Array<{ playlist: Playlist; songs: Song[] }>,
		options?: ProfilingOptions,
		onProgress?: ProfileBatchProgressCallback
	): Promise<BatchProfilingResult>

	/**
	 * Check if profile exists in DB without fetching it.
	 */
	hasProfile(playlistId: number, options?: ProfilingOptions): Promise<boolean>

	/**
	 * Get profile directly from DB (no compute).
	 * Returns null if not found.
	 */
	getProfile(
		playlistId: number,
		options?: ProfilingOptions
	): Promise<ComputedPlaylistProfile | null>

	/**
	 * Invalidate cached profile for a playlist.
	 * Use when playlist membership or analysis changes.
	 */
	invalidate(playlistId: number): Promise<void>
}

// =============================================================================
// Implementation
// =============================================================================

/**
 * Default implementation of PlaylistProfilingService.
 * Uses EmbeddingService for track embeddings and PlaylistProfileRepository for persistence.
 */
export class DefaultPlaylistProfilingService implements PlaylistProfilingService {
	private readonly embeddingService: EmbeddingService
	private readonly profileRepository: PlaylistProfileRepository

	// In-memory L1 cache for hot-path optimization
	// Map: playlistId -> Map<contentHash, profile>
	private readonly memoryCache: Map<number, Map<string, ComputedPlaylistProfile>> =
		new Map()
	private readonly memoryCacheMaxSize = 100

	constructor(
		embeddingService: EmbeddingService,
		profileRepository: PlaylistProfileRepository
	) {
		this.embeddingService = embeddingService
		this.profileRepository = profileRepository
	}

	async profilePlaylist(
		playlist: Playlist,
		songs: Song[],
		options: ProfilingOptions = {}
	): Promise<ComputedPlaylistProfile> {
		const modelBundle = options.modelBundle ?? getActiveModelBundle()
		const kind: ProfileKind = 'content_v1'
		const modelBundleHash = hashModelBundle(modelBundle)
		const playlistId = toNumericId(playlist.id)

		// Extract playlist text for hashing
		const playlistText = extractPlaylistText(playlist)
		const trackIds = songs.map(s => toNumericId(s.id))

		// Determine method based on song count
		const method: ComputedPlaylistProfile['method'] =
			songs.length >= 3 ? 'learned_from_songs' : 'from_description'

		// Compute content hash (will be refined after we have all aggregates)
		// For now, use basic hash for cache lookup
		const contentHash = hashPlaylistProfile({
			playlistText,
			trackIds,
		})

		// Check L1 memory cache first
		if (!options.skipCache) {
			const memoryCached = this.getFromMemoryCache(playlistId, contentHash)
			if (memoryCached) {
				logger.debug('Profile L1 cache hit', { playlistId, contentHash })
				return memoryCached
			}
		}

		// Check DB cache
		if (!options.skipCache) {
			const lookupKey: PlaylistProfileLookupKey = {
				playlist_id: playlistId,
				profile_kind: kind,
				model_bundle_hash: modelBundleHash,
				content_hash: contentHash,
			}

			const dbCached = await this.profileRepository.getByKey(lookupKey)
			if (dbCached) {
				logger.debug('Profile DB cache hit', { playlistId, contentHash })

				const profile = this.dbProfileToComputed(dbCached, modelBundleHash, method)

				// Populate L1 cache
				this.setMemoryCache(playlistId, contentHash, profile)

				return profile
			}
		}

		// Cache miss - compute profile
		logger.debug('Profile cache miss, computing', {
			playlistId,
			contentHash,
			songCount: songs.length,
		})

		const profile = await this.computeProfile(
			playlist,
			songs,
			playlistText,
			kind,
			modelBundle,
			method
		)

		// Persist to DB
		if (!options.skipPersist) {
			await this.persistProfile(profile, options.userId ?? 0, modelBundle)
		}

		// Update L1 cache
		this.setMemoryCache(playlistId, profile.contentHash, profile)

		return profile
	}

	async profilePlaylistBatch(
		playlists: Array<{ playlist: Playlist; songs: Song[] }>,
		options: ProfilingOptions = {},
		onProgress?: ProfileBatchProgressCallback
	): Promise<BatchProfilingResult> {
		const results = new Map<number, ComputedPlaylistProfile>()
		const errors = new Map<number, string>()
		let cached = 0
		let computed = 0

		const progress: ProfileBatchProgress = {
			total: playlists.length,
			completed: 0,
			cached: 0,
			computed: 0,
			errors: 0,
		}

		// Process each playlist
		for (const { playlist, songs } of playlists) {
			try {
				const profile = await this.profilePlaylist(playlist, songs, options)
				results.set(toNumericId(playlist.id), profile)

				if (profile.fromCache) {
					cached++
					progress.cached++
				} else {
					computed++
					progress.computed++
				}
			} catch (error) {
				const message = error instanceof Error ? error.message : 'Unknown error'
				errors.set(toNumericId(playlist.id), message)
				progress.errors++
				logger.warn('Failed to profile playlist in batch', {
					playlistId: toNumericId(playlist.id),
					error: message,
				})
			}

			progress.completed++
			onProgress?.(progress)
		}

		return {
			results,
			errors,
			stats: {
				total: playlists.length,
				cached,
				computed,
				failed: errors.size,
			},
		}
	}

	async hasProfile(playlistId: number, options: ProfilingOptions = {}): Promise<boolean> {
		const modelBundle = options.modelBundle ?? getActiveModelBundle()
		const modelBundleHash = hashModelBundle(modelBundle)
		const kind: ProfileKind = 'content_v1'

		// Check memory cache
		const trackCache = this.memoryCache.get(playlistId)
		if (trackCache && trackCache.size > 0) {
			return true
		}

		// Check DB - get latest profile for this playlist
		const profiles = await this.profileRepository.getByPlaylistIds(
			[playlistId],
			kind,
			modelBundleHash
		)

		return profiles.has(playlistId)
	}

	async getProfile(
		playlistId: number,
		options: ProfilingOptions = {}
	): Promise<ComputedPlaylistProfile | null> {
		const modelBundle = options.modelBundle ?? getActiveModelBundle()
		const modelBundleHash = hashModelBundle(modelBundle)
		const kind: ProfileKind = 'content_v1'

		const profiles = await this.profileRepository.getByPlaylistIds(
			[playlistId],
			kind,
			modelBundleHash
		)

		const dbProfile = profiles.get(playlistId)
		if (!dbProfile) {
			return null
		}

		// Determine method from track count
		const method: ComputedPlaylistProfile['method'] =
			dbProfile.track_count >= 3 ? 'learned_from_songs' : 'from_description'

		return this.dbProfileToComputed(dbProfile, modelBundleHash, method)
	}

	async invalidate(playlistId: number): Promise<void> {
		// Clear L1 cache
		this.memoryCache.delete(playlistId)

		// Delete from DB
		await this.profileRepository.deleteByPlaylistId(playlistId)

		logger.debug('Invalidated profiles for playlist', { playlistId })
	}

	// ===========================================================================
	// Private: Profile Computation
	// ===========================================================================

	private async computeProfile(
		playlist: Playlist,
		songs: Song[],
		playlistText: VectorizationText,
		kind: ProfileKind,
		modelBundle: ModelBundle,
		method: ComputedPlaylistProfile['method']
	): Promise<ComputedPlaylistProfile> {
		const playlistId = toNumericId(playlist.id)
		const trackIds = songs.map(s => toNumericId(s.id))

		// Get track embeddings for centroid calculation
		let embedding: number[] = []
		if (songs.length > 0) {
			const sampleSize = Math.min(20, songs.length)
			const sampledSongs = songs.slice(0, sampleSize)

			const batchResult = await this.embeddingService.embedTrackBatch(
				sampledSongs.map(song => ({ song }))
			)

			const vectors = Array.from(batchResult.results.values()).map(r => r.embedding)
			if (vectors.length > 0) {
				embedding = this.calculateCentroid(vectors)
			}
		}

		// Calculate audio centroid from song analyses
		const audioCentroid = this.calculateAudioCentroid(songs)

		// Extract genre distribution (from song analyses, not Last.fm yet)
		const genreDistribution = this.extractGenreDistribution(songs)

		// Extract emotion distribution from song analyses
		const emotionDistribution = this.extractEmotionDistribution(songs)

		// Compute final content hash with all aggregates
		const contentHash = hashPlaylistProfile({
			playlistText,
			trackIds,
			genreDistribution:
				Object.keys(genreDistribution).length > 0 ? genreDistribution : undefined,
			emotionDistribution:
				Object.keys(emotionDistribution).length > 0 ? emotionDistribution : undefined,
			audioCentroid:
				Object.keys(audioCentroid).length > 0 ?
					this.audioCentroidToArray(audioCentroid)
				:	undefined,
		})

		const modelBundleHash = hashModelBundle(modelBundle)

		return {
			playlistId,
			kind,
			embedding,
			audioCentroid,
			genreDistribution,
			emotionDistribution,
			trackIds,
			trackCount: songs.length,
			contentHash,
			modelBundleHash,
			fromCache: false,
			method,
		}
	}

	private calculateCentroid(vectors: number[][]): number[] {
		if (vectors.length === 0) return []

		const dim = vectors[0].length
		const centroid = new Array(dim).fill(0)

		for (const vec of vectors) {
			for (let i = 0; i < dim; i++) {
				centroid[i] += vec[i]
			}
		}

		return centroid.map(v => v / vectors.length)
	}

	private calculateAudioCentroid(songs: Song[]): AudioCentroid {
		const features: ReccoBeatsAudioFeatures[] = []

		for (const song of songs) {
			if (song.analysis?.audio_features) {
				features.push(song.analysis.audio_features as ReccoBeatsAudioFeatures)
			}
		}

		if (features.length === 0) return {}

		const centroid: AudioCentroid = {}
		const keys: (keyof AudioCentroid)[] = [
			'energy',
			'valence',
			'danceability',
			'acousticness',
			'instrumentalness',
			'speechiness',
			'liveness',
			'tempo',
			'loudness',
		]

		for (const key of keys) {
			const values = features
				.map(f => f[key])
				.filter((v): v is number => typeof v === 'number' && !isNaN(v))

			if (values.length > 0) {
				centroid[key] = values.reduce((sum, v) => sum + v, 0) / values.length
			}
		}

		return centroid
	}

	private extractGenreDistribution(songs: Song[]): GenreDistribution {
		const distribution: GenreDistribution = {}

		for (const song of songs) {
			// Extract genres from musical_style in analysis
			const primary = song.analysis?.musical_style?.genre_primary
			const secondary = song.analysis?.musical_style?.genre_secondary

			if (primary) {
				distribution[primary] = (distribution[primary] || 0) + 1
			}
			if (secondary) {
				distribution[secondary] = (distribution[secondary] || 0) + 1
			}
		}

		return distribution
	}

	private extractEmotionDistribution(songs: Song[]): EmotionDistribution {
		const distribution: EmotionDistribution = {}

		for (const song of songs) {
			const mood = song.analysis?.emotional?.dominant_mood
			if (mood && typeof mood === 'string') {
				distribution[mood] = (distribution[mood] || 0) + 1
			}
		}

		return distribution
	}

	private audioCentroidToArray(centroid: AudioCentroid): number[] {
		// Fixed order for deterministic hashing
		return [
			centroid.energy ?? 0,
			centroid.valence ?? 0,
			centroid.danceability ?? 0,
			centroid.acousticness ?? 0,
			centroid.instrumentalness ?? 0,
			centroid.speechiness ?? 0,
			centroid.liveness ?? 0,
			centroid.tempo ?? 0,
			centroid.loudness ?? 0,
		]
	}

	// ===========================================================================
	// Private: DB Conversion
	// ===========================================================================

	private dbProfileToComputed(
		dbProfile: DbPlaylistProfile,
		modelBundleHash: string,
		method: ComputedPlaylistProfile['method']
	): ComputedPlaylistProfile {
		return {
			playlistId: dbProfile.playlist_id,
			kind: dbProfile.profile_kind as ProfileKind,
			embedding: this.parseDbEmbedding(dbProfile.embedding),
			audioCentroid: (dbProfile.audio_centroid as AudioCentroid) ?? {},
			genreDistribution: (dbProfile.genre_distribution as GenreDistribution) ?? {},
			emotionDistribution: (dbProfile.emotion_distribution as EmotionDistribution) ?? {},
			trackIds: dbProfile.track_ids ?? [],
			trackCount: dbProfile.track_count,
			contentHash: dbProfile.content_hash,
			modelBundleHash,
			fromCache: true,
			method,
		}
	}

	private parseDbEmbedding(dbValue: string | number[] | null): number[] {
		if (!dbValue) return []
		if (Array.isArray(dbValue)) return dbValue

		// pgvector format: "[0.1,0.2,0.3]"
		const cleaned = dbValue.replace(/^\[|\]$/g, '')
		if (!cleaned) return []
		return cleaned.split(',').map(Number)
	}

	private formatDbEmbedding(embedding: number[]): string {
		return `[${embedding.join(',')}]`
	}

	// ===========================================================================
	// Private: Persistence
	// ===========================================================================

	private async persistProfile(
		profile: ComputedPlaylistProfile,
		userId: number,
		modelBundle: ModelBundle
	): Promise<void> {
		try {
			const insert: PlaylistProfileInsert = {
				playlist_id: profile.playlistId,
				user_id: userId,
				profile_kind: profile.kind,
				model_bundle_hash: profile.modelBundleHash,
				dims: modelBundle.embedding.dims,
				content_hash: profile.contentHash,
				embedding: this.formatDbEmbedding(profile.embedding),
				audio_centroid: profile.audioCentroid as Json,
				genre_distribution: profile.genreDistribution as Json,
				emotion_distribution: profile.emotionDistribution as Json,
				track_count: profile.trackCount,
				track_ids: profile.trackIds,
			}

			await this.profileRepository.upsert(insert)
		} catch (error) {
			logger.error('Failed to persist profile', error as Error, {
				playlistId: profile.playlistId,
			})
			// Don't throw - profile was computed successfully, just persistence failed
		}
	}

	// ===========================================================================
	// L1 Memory Cache Management
	// ===========================================================================

	private getFromMemoryCache(
		playlistId: number,
		contentHash: string
	): ComputedPlaylistProfile | null {
		const playlistCache = this.memoryCache.get(playlistId)
		if (!playlistCache) return null
		return playlistCache.get(contentHash) ?? null
	}

	private setMemoryCache(
		playlistId: number,
		contentHash: string,
		profile: ComputedPlaylistProfile
	): void {
		// Evict if at capacity
		if (this.memoryCache.size >= this.memoryCacheMaxSize) {
			// Simple LRU: delete first entry
			const firstKey = this.memoryCache.keys().next().value
			if (firstKey !== undefined) {
				this.memoryCache.delete(firstKey)
			}
		}

		let playlistCache = this.memoryCache.get(playlistId)
		if (!playlistCache) {
			playlistCache = new Map()
			this.memoryCache.set(playlistId, playlistCache)
		}
		playlistCache.set(contentHash, profile)
	}
}
