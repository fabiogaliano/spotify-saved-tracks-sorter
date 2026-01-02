/**
 * Match Cache Repositories
 *
 * Provides DB-first access to cached match contexts and results.
 * Part of Phase 3 (TS Access Layer) of Model Optimization.
 *
 * Key features:
 * - Context-based caching (avoid recompute when nothing changed)
 * - Bulk result storage for efficiency
 * - Automatic invalidation via context_hash
 *
 * Cache key structure (match_context):
 * - user_id: who ran the matching
 * - embedding_model_*: which embedding model was used
 * - reranker_model_*: which reranker (optional)
 * - emotion_model_*: which emotion model (optional)
 * - algorithm_version: matching algorithm version
 * - config_hash: hash of weights/thresholds
 * - playlist_set_hash: hash of playlists + their profiles
 * - candidate_set_hash: hash of candidates + their embeddings
 * - context_hash: combined hash for fast lookup
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
import { getSupabase } from '~/lib/services/DatabaseService'

// =============================================================================
// Match Context Repository
// =============================================================================

export class SupabaseMatchContextRepository implements MatchContextRepository {
	async getByContextHash(contextHash: string): Promise<MatchContext | null> {
		try {
			const { data, error } = await getSupabase()
				.from('match_contexts')
				.select('*')
				.eq('context_hash', contextHash)
				.maybeSingle()

			if (error) {
				throw new logger.AppError('Failed to get context by hash', error.code, 0, {
					error,
					contextHash,
				})
			}

			if (data) {
				logger.debug('Cache HIT for match context', {
					contextHash: contextHash.slice(0, 16),
				})
			}

			return data
		} catch (error) {
			logger.error('Error getting context by hash', error as Error, { contextHash })
			throw error
		}
	}

	async getById(id: number): Promise<MatchContext | null> {
		try {
			const { data, error } = await getSupabase()
				.from('match_contexts')
				.select('*')
				.eq('id', id)
				.maybeSingle()

			if (error) {
				throw new logger.AppError('Failed to get context by id', error.code, 0, {
					error,
					id,
				})
			}

			return data
		} catch (error) {
			logger.error('Error getting context by id', error as Error, { id })
			throw error
		}
	}

	async upsert(context: MatchContextInsert): Promise<MatchContext> {
		try {
			// First check if context exists (to log cache hit/miss)
			const existing = await this.getByContextHash(context.context_hash)
			if (existing) {
				logger.debug('Reusing existing match context', {
					contextId: existing.id,
					contextHash: context.context_hash.slice(0, 16),
				})
				return existing
			}

			// Insert new context
			const { data, error } = await getSupabase()
				.from('match_contexts')
				.insert(context)
				.select()
				.single()

			if (error) {
				// Handle race condition - context may have been created by another request
				if (error.code === '23505') {
					// unique_violation
					const existing = await this.getByContextHash(context.context_hash)
					if (existing) {
						return existing
					}
				}
				throw new logger.AppError('Failed to create context', error.code, 0, {
					error,
					contextHash: context.context_hash,
				})
			}

			if (!data) {
				throw new Error('Insert returned no data')
			}

			logger.info('Created new match context', {
				contextId: data.id,
				contextHash: context.context_hash.slice(0, 16),
				algorithmVersion: context.algorithm_version,
			})

			return data
		} catch (error) {
			logger.error('Error upserting context', error as Error, {
				contextHash: context.context_hash,
			})
			throw error
		}
	}

	async getByUserId(userId: number): Promise<MatchContext[]> {
		try {
			const { data, error } = await getSupabase()
				.from('match_contexts')
				.select('*')
				.eq('user_id', userId)
				.order('created_at', { ascending: false })

			if (error) {
				throw new logger.AppError('Failed to get contexts by user', error.code, 0, {
					error,
					userId,
				})
			}

			return data ?? []
		} catch (error) {
			logger.error('Error getting contexts by user', error as Error, { userId })
			throw error
		}
	}

	async delete(id: number): Promise<void> {
		try {
			// Results are deleted via CASCADE
			const { error } = await getSupabase().from('match_contexts').delete().eq('id', id)

			if (error) {
				throw new logger.AppError('Failed to delete context', error.code, 0, {
					error,
					id,
				})
			}

			logger.debug('Deleted match context', { contextId: id })
		} catch (error) {
			logger.error('Error deleting context', error as Error, { id })
			throw error
		}
	}

	/**
	 * Clean up old contexts for a user (keep only N most recent).
	 * Useful for preventing unbounded cache growth.
	 */
	async pruneOldContexts(userId: number, keepCount: number = 10): Promise<number> {
		try {
			// Get contexts to keep
			const { data: toKeep, error: fetchError } = await getSupabase()
				.from('match_contexts')
				.select('id')
				.eq('user_id', userId)
				.order('created_at', { ascending: false })
				.limit(keepCount)

			if (fetchError) {
				throw new logger.AppError(
					'Failed to fetch contexts for pruning',
					fetchError.code,
					0,
					{
						error: fetchError,
						userId,
					}
				)
			}

			const keepIds = (toKeep ?? []).map(c => c.id)

			if (keepIds.length === 0) {
				return 0
			}

			// Delete all others
			const { error: deleteError, count } = await getSupabase()
				.from('match_contexts')
				.delete({ count: 'exact' })
				.eq('user_id', userId)
				.not('id', 'in', `(${keepIds.join(',')})`)

			if (deleteError) {
				throw new logger.AppError('Failed to prune contexts', deleteError.code, 0, {
					error: deleteError,
					userId,
				})
			}

			if ((count ?? 0) > 0) {
				logger.info('Pruned old match contexts', { userId, pruned: count })
			}

			return count ?? 0
		} catch (error) {
			logger.error('Error pruning contexts', error as Error, { userId })
			throw error
		}
	}
}

// =============================================================================
// Match Result Repository
// =============================================================================

export class SupabaseMatchResultRepository implements MatchResultRepository {
	async getByContextId(contextId: number): Promise<MatchResultRow[]> {
		try {
			const { data, error } = await getSupabase()
				.from('match_results')
				.select('*')
				.eq('match_context_id', contextId)
				.order('score', { ascending: false })

			if (error) {
				throw new logger.AppError('Failed to get results by context', error.code, 0, {
					error,
					contextId,
				})
			}

			return data ?? []
		} catch (error) {
			logger.error('Error getting results by context', error as Error, { contextId })
			throw error
		}
	}

	async getByContextAndPlaylist(
		contextId: number,
		playlistId: number
	): Promise<MatchResultRow[]> {
		try {
			const { data, error } = await getSupabase()
				.from('match_results')
				.select('*')
				.eq('match_context_id', contextId)
				.eq('playlist_id', playlistId)
				.order('score', { ascending: false })

			if (error) {
				throw new logger.AppError(
					'Failed to get results by context and playlist',
					error.code,
					0,
					{
						error,
						contextId,
						playlistId,
					}
				)
			}

			return data ?? []
		} catch (error) {
			logger.error('Error getting results', error as Error, { contextId, playlistId })
			throw error
		}
	}

	async getTopNByContextAndPlaylist(
		contextId: number,
		playlistId: number,
		limit: number
	): Promise<MatchResultRow[]> {
		try {
			const { data, error } = await getSupabase()
				.from('match_results')
				.select('*')
				.eq('match_context_id', contextId)
				.eq('playlist_id', playlistId)
				.order('score', { ascending: false })
				.limit(limit)

			if (error) {
				throw new logger.AppError('Failed to get top-N results', error.code, 0, {
					error,
					contextId,
					playlistId,
					limit,
				})
			}

			return data ?? []
		} catch (error) {
			logger.error('Error getting top-N results', error as Error, {
				contextId,
				playlistId,
				limit,
			})
			throw error
		}
	}

	async insertBatch(
		results: MatchResultInsert[]
	): Promise<{ inserted: number; errors: number }> {
		if (results.length === 0) {
			return { inserted: 0, errors: 0 }
		}

		try {
			// Use upsert to handle potential duplicates gracefully
			const { data, error } = await getSupabase()
				.from('match_results')
				.upsert(results, {
					onConflict: 'match_context_id,track_id,playlist_id',
				})
				.select('id')

			if (error) {
				throw new logger.AppError('Failed to batch insert results', error.code, 0, {
					error,
					count: results.length,
				})
			}

			const inserted = data?.length ?? 0

			logger.debug('Batch inserted match results', {
				attempted: results.length,
				inserted,
			})

			return { inserted, errors: 0 }
		} catch (error) {
			logger.error('Error batch inserting results', error as Error, {
				count: results.length,
			})
			return { inserted: 0, errors: results.length }
		}
	}

	async deleteByContextId(contextId: number): Promise<void> {
		try {
			const { error } = await getSupabase()
				.from('match_results')
				.delete()
				.eq('match_context_id', contextId)

			if (error) {
				throw new logger.AppError('Failed to delete results', error.code, 0, {
					error,
					contextId,
				})
			}

			logger.debug('Deleted results for context', { contextId })
		} catch (error) {
			logger.error('Error deleting results', error as Error, { contextId })
			throw error
		}
	}

	/**
	 * Get result count for a context.
	 * Useful for validation after batch insert.
	 */
	async countByContextId(contextId: number): Promise<number> {
		try {
			const { count, error } = await getSupabase()
				.from('match_results')
				.select('id', { count: 'exact', head: true })
				.eq('match_context_id', contextId)

			if (error) {
				throw new logger.AppError('Failed to count results', error.code, 0, {
					error,
					contextId,
				})
			}

			return count ?? 0
		} catch (error) {
			logger.error('Error counting results', error as Error, { contextId })
			throw error
		}
	}

	/**
	 * Get grouped results by playlist for a context.
	 * Returns a map of playlist_id -> results array.
	 */
	async getGroupedByPlaylist(contextId: number): Promise<Map<number, MatchResultRow[]>> {
		try {
			const results = await this.getByContextId(contextId)
			const grouped = new Map<number, MatchResultRow[]>()

			for (const result of results) {
				const existing = grouped.get(result.playlist_id) ?? []
				existing.push(result)
				grouped.set(result.playlist_id, existing)
			}

			return grouped
		} catch (error) {
			logger.error('Error grouping results by playlist', error as Error, { contextId })
			throw error
		}
	}
}

// =============================================================================
// Singleton Instances
// =============================================================================

export const matchContextRepository = new SupabaseMatchContextRepository()
export const matchResultRepository = new SupabaseMatchResultRepository()
