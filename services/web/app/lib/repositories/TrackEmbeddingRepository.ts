/**
 * Track Embedding Repository
 *
 * Provides DB-first access to persisted track embeddings.
 * Part of Phase 3 (TS Access Layer) of Model Optimization.
 *
 * Key features:
 * - Composite key lookups (track_id + embedding_kind + model + version + content_hash)
 * - Batch operations for efficient backfills
 * - Upsert semantics for idempotent writes
 */
import { logger } from '~/lib/logging/Logger'
import type {
	TrackEmbedding,
	TrackEmbeddingInsert,
	TrackEmbeddingLookupKey,
	TrackEmbeddingRepository,
} from '~/lib/models/Embedding'
import { getSupabase } from '~/lib/services/DatabaseService'

export class SupabaseTrackEmbeddingRepository implements TrackEmbeddingRepository {
	async getByKey(key: TrackEmbeddingLookupKey): Promise<TrackEmbedding | null> {
		try {
			const { data, error } = await getSupabase()
				.from('track_embeddings')
				.select('*')
				.eq('track_id', key.track_id)
				.eq('embedding_kind', key.embedding_kind)
				.eq('model_name', key.model_name)
				.eq('model_version', key.model_version)
				.eq('content_hash', key.content_hash)
				.maybeSingle()

			if (error) {
				throw new logger.AppError('Failed to get embedding by key', error.code, 0, {
					error,
					key,
				})
			}

			return data
		} catch (error) {
			logger.error('Error getting embedding by key', error as Error, { key })
			throw error
		}
	}

	async getByTrackId(trackId: number): Promise<TrackEmbedding[]> {
		try {
			const { data, error } = await getSupabase()
				.from('track_embeddings')
				.select('*')
				.eq('track_id', trackId)
				.order('created_at', { ascending: false })

			if (error) {
				throw new logger.AppError('Failed to get embeddings by track', error.code, 0, {
					error,
					trackId,
				})
			}

			return data ?? []
		} catch (error) {
			logger.error('Error getting embeddings by track', error as Error, { trackId })
			throw error
		}
	}

	async getByTrackIds(
		trackIds: number[],
		embeddingKind: string,
		modelName: string,
		modelVersion: string
	): Promise<Map<number, TrackEmbedding>> {
		if (trackIds.length === 0) {
			return new Map()
		}

		try {
			const { data, error } = await getSupabase()
				.from('track_embeddings')
				.select('*')
				.in('track_id', trackIds)
				.eq('embedding_kind', embeddingKind)
				.eq('model_name', modelName)
				.eq('model_version', modelVersion)

			if (error) {
				throw new logger.AppError('Failed to batch get embeddings', error.code, 0, {
					error,
					trackIds: trackIds.slice(0, 5),
					count: trackIds.length,
				})
			}

			const result = new Map<number, TrackEmbedding>()
			for (const embedding of data ?? []) {
				// For each track, keep the most recent embedding (by content_hash)
				// In practice, there should only be one per track+kind+model+version
				if (!result.has(embedding.track_id)) {
					result.set(embedding.track_id, embedding)
				}
			}

			logger.debug('Batch fetched embeddings', {
				requested: trackIds.length,
				found: result.size,
				cacheHitRate: `${((result.size / trackIds.length) * 100).toFixed(1)}%`,
			})

			return result
		} catch (error) {
			logger.error('Error batch getting embeddings', error as Error, {
				trackIdCount: trackIds.length,
			})
			throw error
		}
	}

	async upsert(embedding: TrackEmbeddingInsert): Promise<TrackEmbedding> {
		try {
			const { data, error } = await getSupabase()
				.from('track_embeddings')
				.upsert(embedding, {
					onConflict: 'track_id,embedding_kind,model_name,model_version,content_hash',
				})
				.select()
				.single()

			if (error) {
				throw new logger.AppError('Failed to upsert embedding', error.code, 0, {
					error,
					trackId: embedding.track_id,
				})
			}

			if (!data) {
				throw new Error('Upsert returned no data')
			}

			logger.debug('Upserted embedding', {
				trackId: embedding.track_id,
				kind: embedding.embedding_kind,
				model: embedding.model_name,
			})

			return data
		} catch (error) {
			logger.error('Error upserting embedding', error as Error, {
				trackId: embedding.track_id,
			})
			throw error
		}
	}

	async upsertBatch(
		embeddings: TrackEmbeddingInsert[]
	): Promise<{ inserted: number; errors: number }> {
		if (embeddings.length === 0) {
			return { inserted: 0, errors: 0 }
		}

		try {
			// Supabase/PostgreSQL can handle batch upserts
			const { data, error } = await getSupabase()
				.from('track_embeddings')
				.upsert(embeddings, {
					onConflict: 'track_id,embedding_kind,model_name,model_version,content_hash',
				})
				.select('id')

			if (error) {
				throw new logger.AppError('Failed to batch upsert embeddings', error.code, 0, {
					error,
					count: embeddings.length,
				})
			}

			const inserted = data?.length ?? 0

			logger.info('Batch upserted embeddings', {
				attempted: embeddings.length,
				inserted,
			})

			return { inserted, errors: 0 }
		} catch (error) {
			logger.error('Error batch upserting embeddings', error as Error, {
				count: embeddings.length,
			})
			// Return partial failure
			return { inserted: 0, errors: embeddings.length }
		}
	}

	async deleteByTrackId(trackId: number): Promise<void> {
		try {
			const { error } = await getSupabase()
				.from('track_embeddings')
				.delete()
				.eq('track_id', trackId)

			if (error) {
				throw new logger.AppError('Failed to delete embeddings', error.code, 0, {
					error,
					trackId,
				})
			}

			logger.debug('Deleted embeddings for track', { trackId })
		} catch (error) {
			logger.error('Error deleting embeddings', error as Error, { trackId })
			throw error
		}
	}

	/**
	 * Check if an embedding exists for the given key (without fetching the full embedding).
	 * Useful for cache-hit checks before expensive embedding computation.
	 */
	async exists(key: TrackEmbeddingLookupKey): Promise<boolean> {
		try {
			const { count, error } = await getSupabase()
				.from('track_embeddings')
				.select('id', { count: 'exact', head: true })
				.eq('track_id', key.track_id)
				.eq('embedding_kind', key.embedding_kind)
				.eq('model_name', key.model_name)
				.eq('model_version', key.model_version)
				.eq('content_hash', key.content_hash)

			if (error) {
				throw new logger.AppError('Failed to check embedding existence', error.code, 0, {
					error,
					key,
				})
			}

			return (count ?? 0) > 0
		} catch (error) {
			logger.error('Error checking embedding existence', error as Error, { key })
			throw error
		}
	}

	/**
	 * Get count of embeddings for a given model configuration.
	 * Useful for progress tracking during backfills.
	 */
	async countByModel(
		embeddingKind: string,
		modelName: string,
		modelVersion: string
	): Promise<number> {
		try {
			const { count, error } = await getSupabase()
				.from('track_embeddings')
				.select('id', { count: 'exact', head: true })
				.eq('embedding_kind', embeddingKind)
				.eq('model_name', modelName)
				.eq('model_version', modelVersion)

			if (error) {
				throw new logger.AppError('Failed to count embeddings', error.code, 0, {
					error,
					embeddingKind,
					modelName,
					modelVersion,
				})
			}

			return count ?? 0
		} catch (error) {
			logger.error('Error counting embeddings', error as Error, {
				embeddingKind,
				modelName,
				modelVersion,
			})
			throw error
		}
	}
}

// Singleton instance
export const trackEmbeddingRepository = new SupabaseTrackEmbeddingRepository()
