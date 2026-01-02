/**
 * Track Genre Repository
 *
 * Provides DB-first access to persisted genre information from Last.fm.
 * Part of Phase 3 (TS Access Layer) of Model Optimization.
 *
 * Key features:
 * - Source-based lookups (Last.fm album vs artist level)
 * - Batch operations for efficient backfills
 * - Genre distribution aggregation helpers
 */
import { logger } from '~/lib/logging/Logger'
import type {
	TrackGenre,
	TrackGenreInsert,
	TrackGenreRepository,
} from '~/lib/models/Embedding'
import { getSupabase } from '~/lib/services/DatabaseService'

export class SupabaseTrackGenreRepository implements TrackGenreRepository {
	async getByTrackAndSource(trackId: number, source: string): Promise<TrackGenre | null> {
		try {
			const { data, error } = await getSupabase()
				.from('track_genres')
				.select('*')
				.eq('track_id', trackId)
				.eq('source', source)
				.order('created_at', { ascending: false })
				.limit(1)
				.maybeSingle()

			if (error) {
				throw new logger.AppError(
					'Failed to get genre by track and source',
					error.code,
					0,
					{
						error,
						trackId,
						source,
					}
				)
			}

			return data
		} catch (error) {
			logger.error('Error getting genre', error as Error, { trackId, source })
			throw error
		}
	}

	async getByTrackId(trackId: number): Promise<TrackGenre[]> {
		try {
			const { data, error } = await getSupabase()
				.from('track_genres')
				.select('*')
				.eq('track_id', trackId)
				.order('created_at', { ascending: false })

			if (error) {
				throw new logger.AppError('Failed to get genres by track', error.code, 0, {
					error,
					trackId,
				})
			}

			return data ?? []
		} catch (error) {
			logger.error('Error getting genres by track', error as Error, { trackId })
			throw error
		}
	}

	async getByTrackIds(
		trackIds: number[],
		source: string
	): Promise<Map<number, TrackGenre>> {
		if (trackIds.length === 0) {
			return new Map()
		}

		try {
			const { data, error } = await getSupabase()
				.from('track_genres')
				.select('*')
				.in('track_id', trackIds)
				.eq('source', source)

			if (error) {
				throw new logger.AppError('Failed to batch get genres', error.code, 0, {
					error,
					trackIds: trackIds.slice(0, 5),
					count: trackIds.length,
					source,
				})
			}

			const result = new Map<number, TrackGenre>()
			for (const genre of data ?? []) {
				// Keep the first (most recent by ordering) for each track
				if (!result.has(genre.track_id)) {
					result.set(genre.track_id, genre)
				}
			}

			logger.debug('Batch fetched genres', {
				requested: trackIds.length,
				found: result.size,
				source,
			})

			return result
		} catch (error) {
			logger.error('Error batch getting genres', error as Error, {
				trackIdCount: trackIds.length,
				source,
			})
			throw error
		}
	}

	async upsert(genre: TrackGenreInsert): Promise<TrackGenre> {
		try {
			const { data, error } = await getSupabase()
				.from('track_genres')
				.upsert(genre, {
					onConflict: 'track_id,source,content_hash',
				})
				.select()
				.single()

			if (error) {
				throw new logger.AppError('Failed to upsert genre', error.code, 0, {
					error,
					trackId: genre.track_id,
					source: genre.source,
				})
			}

			if (!data) {
				throw new Error('Upsert returned no data')
			}

			logger.debug('Upserted genre', {
				trackId: genre.track_id,
				source: genre.source,
				genreCount: genre.genres?.length ?? 0,
			})

			return data
		} catch (error) {
			logger.error('Error upserting genre', error as Error, {
				trackId: genre.track_id,
				source: genre.source,
			})
			throw error
		}
	}

	async upsertBatch(
		genres: TrackGenreInsert[]
	): Promise<{ inserted: number; errors: number }> {
		if (genres.length === 0) {
			return { inserted: 0, errors: 0 }
		}

		try {
			const { data, error } = await getSupabase()
				.from('track_genres')
				.upsert(genres, {
					onConflict: 'track_id,source,content_hash',
				})
				.select('id')

			if (error) {
				throw new logger.AppError('Failed to batch upsert genres', error.code, 0, {
					error,
					count: genres.length,
				})
			}

			const inserted = data?.length ?? 0

			logger.info('Batch upserted genres', {
				attempted: genres.length,
				inserted,
			})

			return { inserted, errors: 0 }
		} catch (error) {
			logger.error('Error batch upserting genres', error as Error, {
				count: genres.length,
			})
			return { inserted: 0, errors: genres.length }
		}
	}

	async deleteByTrackId(trackId: number): Promise<void> {
		try {
			const { error } = await getSupabase()
				.from('track_genres')
				.delete()
				.eq('track_id', trackId)

			if (error) {
				throw new logger.AppError('Failed to delete genres', error.code, 0, {
					error,
					trackId,
				})
			}

			logger.debug('Deleted genres for track', { trackId })
		} catch (error) {
			logger.error('Error deleting genres', error as Error, { trackId })
			throw error
		}
	}

	/**
	 * Aggregate genre distributions across multiple tracks.
	 * Returns a map of genre -> count/weight for playlist profiling.
	 */
	async aggregateGenresForTracks(
		trackIds: number[],
		source: string = 'lastfm'
	): Promise<Record<string, number>> {
		if (trackIds.length === 0) {
			return {}
		}

		try {
			const genres = await this.getByTrackIds(trackIds, source)
			const distribution: Record<string, number> = {}

			for (const genre of genres.values()) {
				if (genre.genres_with_scores) {
					// Use weighted scores if available
					for (const [genreName, score] of Object.entries(
						genre.genres_with_scores as Record<string, number>
					)) {
						distribution[genreName] = (distribution[genreName] ?? 0) + score
					}
				} else {
					// Fall back to unweighted (count = 1 per genre)
					for (const genreName of genre.genres) {
						distribution[genreName] = (distribution[genreName] ?? 0) + 1
					}
				}
			}

			// Normalize by number of tracks
			const trackCount = genres.size
			if (trackCount > 0) {
				for (const genreName of Object.keys(distribution)) {
					distribution[genreName] = distribution[genreName] / trackCount
				}
			}

			return distribution
		} catch (error) {
			logger.error('Error aggregating genres', error as Error, {
				trackIdCount: trackIds.length,
				source,
			})
			throw error
		}
	}

	/**
	 * Get count of tracks with genre data for a given source.
	 * Useful for progress tracking during backfills.
	 */
	async countBySource(source: string): Promise<number> {
		try {
			const { count, error } = await getSupabase()
				.from('track_genres')
				.select('track_id', { count: 'exact', head: true })
				.eq('source', source)

			if (error) {
				throw new logger.AppError('Failed to count genres', error.code, 0, {
					error,
					source,
				})
			}

			return count ?? 0
		} catch (error) {
			logger.error('Error counting genres', error as Error, { source })
			throw error
		}
	}
}

// Singleton instance
export const trackGenreRepository = new SupabaseTrackGenreRepository()
