/**
 * Embedding & Profile Model Types
 *
 * Types for the vector persistence layer (Phase 2 of Model Optimization).
 * Uses auto-generated Supabase types from database.types.ts.
 */
import type { Tables, TablesInsert, TablesUpdate } from '~/types/database.types'

// =============================================================================
// Track Embeddings
// =============================================================================

export type TrackEmbedding = Tables<'track_embeddings'>
export type TrackEmbeddingInsert = TablesInsert<'track_embeddings'>
export type TrackEmbeddingUpdate = TablesUpdate<'track_embeddings'>

/** Key for looking up a specific embedding */
export interface TrackEmbeddingLookupKey {
	track_id: number
	embedding_kind: string
	model_name: string
	model_version: string
	content_hash: string
}

// =============================================================================
// Track Genres
// =============================================================================

export type TrackGenre = Tables<'track_genres'>
export type TrackGenreInsert = TablesInsert<'track_genres'>
export type TrackGenreUpdate = TablesUpdate<'track_genres'>

// =============================================================================
// Playlist Profiles
// =============================================================================

export type PlaylistProfile = Tables<'playlist_profiles'>
export type PlaylistProfileInsert = TablesInsert<'playlist_profiles'>
export type PlaylistProfileUpdate = TablesUpdate<'playlist_profiles'>

/** Key for looking up a specific profile */
export interface PlaylistProfileLookupKey {
	playlist_id: number
	profile_kind: string
	model_bundle_hash: string
	content_hash: string
}

// =============================================================================
// Match Context & Results
// =============================================================================

export type MatchContext = Tables<'match_contexts'>
export type MatchContextInsert = TablesInsert<'match_contexts'>
export type MatchContextUpdate = TablesUpdate<'match_contexts'>

export type MatchResultRow = Tables<'match_results'>
export type MatchResultInsert = TablesInsert<'match_results'>
export type MatchResultUpdate = TablesUpdate<'match_results'>

// =============================================================================
// Repository Interfaces
// =============================================================================

export interface TrackEmbeddingRepository {
	/** Get embedding by composite key */
	getByKey(key: TrackEmbeddingLookupKey): Promise<TrackEmbedding | null>

	/** Get all embeddings for a track */
	getByTrackId(trackId: number): Promise<TrackEmbedding[]>

	/** Get embeddings for multiple tracks (batch) */
	getByTrackIds(
		trackIds: number[],
		embeddingKind: string,
		modelName: string,
		modelVersion: string
	): Promise<Map<number, TrackEmbedding>>

	/** Upsert embedding (insert or update based on unique constraint) */
	upsert(embedding: TrackEmbeddingInsert): Promise<TrackEmbedding>

	/** Batch upsert embeddings */
	upsertBatch(
		embeddings: TrackEmbeddingInsert[]
	): Promise<{ inserted: number; errors: number }>

	/** Delete embeddings for a track */
	deleteByTrackId(trackId: number): Promise<void>
}

export interface TrackGenreRepository {
	/** Get genres for a track by source */
	getByTrackAndSource(trackId: number, source: string): Promise<TrackGenre | null>

	/** Get all genres for a track */
	getByTrackId(trackId: number): Promise<TrackGenre[]>

	/** Get genres for multiple tracks */
	getByTrackIds(trackIds: number[], source: string): Promise<Map<number, TrackGenre>>

	/** Upsert genres */
	upsert(genre: TrackGenreInsert): Promise<TrackGenre>

	/** Batch upsert genres */
	upsertBatch(genres: TrackGenreInsert[]): Promise<{ inserted: number; errors: number }>

	/** Delete genres for a track */
	deleteByTrackId(trackId: number): Promise<void>
}

export interface PlaylistProfileRepository {
	/** Get profile by composite key */
	getByKey(key: PlaylistProfileLookupKey): Promise<PlaylistProfile | null>

	/** Get the latest profile for a playlist */
	getLatestByPlaylistId(playlistId: number): Promise<PlaylistProfile | null>

	/** Get profiles for multiple playlists */
	getByPlaylistIds(
		playlistIds: number[],
		profileKind: string,
		modelBundleHash: string
	): Promise<Map<number, PlaylistProfile>>

	/** Upsert profile */
	upsert(profile: PlaylistProfileInsert): Promise<PlaylistProfile>

	/** Delete profiles for a playlist */
	deleteByPlaylistId(playlistId: number): Promise<void>
}

export interface MatchContextRepository {
	/** Get context by hash */
	getByContextHash(contextHash: string): Promise<MatchContext | null>

	/** Get context by ID */
	getById(id: number): Promise<MatchContext | null>

	/** Create context (returns existing if hash matches) */
	upsert(context: MatchContextInsert): Promise<MatchContext>

	/** Get all contexts for a user */
	getByUserId(userId: number): Promise<MatchContext[]>

	/** Delete context and all associated results */
	delete(id: number): Promise<void>

	/** Prune old contexts for a user, keeping only the most recent N */
	pruneOldContexts(userId: number, keepCount?: number): Promise<number>
}

export interface MatchResultRepository {
	/** Get all results for a context */
	getByContextId(contextId: number): Promise<MatchResultRow[]>

	/** Get results for a specific playlist within a context */
	getByContextAndPlaylist(
		contextId: number,
		playlistId: number
	): Promise<MatchResultRow[]>

	/** Get top-N results for a playlist */
	getTopNByContextAndPlaylist(
		contextId: number,
		playlistId: number,
		limit: number
	): Promise<MatchResultRow[]>

	/** Bulk insert results for a context */
	insertBatch(results: MatchResultInsert[]): Promise<{ inserted: number; errors: number }>

	/** Delete all results for a context */
	deleteByContextId(contextId: number): Promise<void>
}
