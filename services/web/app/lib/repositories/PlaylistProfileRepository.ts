/**
 * Playlist Profile Repository
 *
 * Provides DB-first access to persisted playlist profiles.
 * Part of Phase 3 (TS Access Layer) of Model Optimization.
 *
 * Key features:
 * - Composite key lookups (playlist_id + profile_kind + model_bundle_hash + content_hash)
 * - Structured aggregates (audio centroid, genre distribution, emotion distribution)
 * - Automatic invalidation via content_hash changes
 */
import { logger } from '~/lib/logging/Logger'
import type {
	PlaylistProfile,
	PlaylistProfileInsert,
	PlaylistProfileLookupKey,
	PlaylistProfileRepository,
} from '~/lib/models/Embedding'
import { getSupabase } from '~/lib/services/DatabaseService'

export class SupabasePlaylistProfileRepository implements PlaylistProfileRepository {
	async getByKey(key: PlaylistProfileLookupKey): Promise<PlaylistProfile | null> {
		try {
			const { data, error } = await getSupabase()
				.from('playlist_profiles')
				.select('*')
				.eq('playlist_id', key.playlist_id)
				.eq('profile_kind', key.profile_kind)
				.eq('model_bundle_hash', key.model_bundle_hash)
				.eq('content_hash', key.content_hash)
				.maybeSingle()

			if (error) {
				throw new logger.AppError('Failed to get profile by key', error.code, 0, {
					error,
					key,
				})
			}

			return data
		} catch (error) {
			logger.error('Error getting profile by key', error as Error, { key })
			throw error
		}
	}

	async getLatestByPlaylistId(playlistId: number): Promise<PlaylistProfile | null> {
		try {
			const { data, error } = await getSupabase()
				.from('playlist_profiles')
				.select('*')
				.eq('playlist_id', playlistId)
				.order('created_at', { ascending: false })
				.limit(1)
				.maybeSingle()

			if (error) {
				throw new logger.AppError('Failed to get latest profile', error.code, 0, {
					error,
					playlistId,
				})
			}

			return data
		} catch (error) {
			logger.error('Error getting latest profile', error as Error, { playlistId })
			throw error
		}
	}

	async getByPlaylistIds(
		playlistIds: number[],
		profileKind: string,
		modelBundleHash: string
	): Promise<Map<number, PlaylistProfile>> {
		if (playlistIds.length === 0) {
			return new Map()
		}

		try {
			const { data, error } = await getSupabase()
				.from('playlist_profiles')
				.select('*')
				.in('playlist_id', playlistIds)
				.eq('profile_kind', profileKind)
				.eq('model_bundle_hash', modelBundleHash)
				.order('created_at', { ascending: false })

			if (error) {
				throw new logger.AppError('Failed to batch get profiles', error.code, 0, {
					error,
					playlistIds: playlistIds.slice(0, 5),
					count: playlistIds.length,
				})
			}

			const result = new Map<number, PlaylistProfile>()
			for (const profile of data ?? []) {
				// Keep the most recent profile for each playlist
				if (!result.has(profile.playlist_id)) {
					result.set(profile.playlist_id, profile)
				}
			}

			logger.debug('Batch fetched profiles', {
				requested: playlistIds.length,
				found: result.size,
				profileKind,
			})

			return result
		} catch (error) {
			logger.error('Error batch getting profiles', error as Error, {
				playlistIdCount: playlistIds.length,
			})
			throw error
		}
	}

	async upsert(profile: PlaylistProfileInsert): Promise<PlaylistProfile> {
		try {
			const { data, error } = await getSupabase()
				.from('playlist_profiles')
				.upsert(profile, {
					onConflict: 'playlist_id,profile_kind,model_bundle_hash,content_hash',
				})
				.select()
				.single()

			if (error) {
				throw new logger.AppError('Failed to upsert profile', error.code, 0, {
					error,
					playlistId: profile.playlist_id,
				})
			}

			if (!data) {
				throw new Error('Upsert returned no data')
			}

			logger.debug('Upserted playlist profile', {
				playlistId: profile.playlist_id,
				kind: profile.profile_kind,
				trackCount: profile.track_count,
			})

			return data
		} catch (error) {
			logger.error('Error upserting profile', error as Error, {
				playlistId: profile.playlist_id,
			})
			throw error
		}
	}

	async deleteByPlaylistId(playlistId: number): Promise<void> {
		try {
			const { error } = await getSupabase()
				.from('playlist_profiles')
				.delete()
				.eq('playlist_id', playlistId)

			if (error) {
				throw new logger.AppError('Failed to delete profiles', error.code, 0, {
					error,
					playlistId,
				})
			}

			logger.debug('Deleted profiles for playlist', { playlistId })
		} catch (error) {
			logger.error('Error deleting profiles', error as Error, { playlistId })
			throw error
		}
	}

	/**
	 * Check if a valid profile exists for the given key (without fetching full data).
	 * Useful for cache-hit checks before expensive profile computation.
	 */
	async exists(key: PlaylistProfileLookupKey): Promise<boolean> {
		try {
			const { count, error } = await getSupabase()
				.from('playlist_profiles')
				.select('id', { count: 'exact', head: true })
				.eq('playlist_id', key.playlist_id)
				.eq('profile_kind', key.profile_kind)
				.eq('model_bundle_hash', key.model_bundle_hash)
				.eq('content_hash', key.content_hash)

			if (error) {
				throw new logger.AppError('Failed to check profile existence', error.code, 0, {
					error,
					key,
				})
			}

			return (count ?? 0) > 0
		} catch (error) {
			logger.error('Error checking profile existence', error as Error, { key })
			throw error
		}
	}

	/**
	 * Get all profiles for a user (across all playlists).
	 * Useful for cache warming and stats.
	 */
	async getByUserId(userId: number): Promise<PlaylistProfile[]> {
		try {
			const { data, error } = await getSupabase()
				.from('playlist_profiles')
				.select('*')
				.eq('user_id', userId)
				.order('created_at', { ascending: false })

			if (error) {
				throw new logger.AppError('Failed to get profiles by user', error.code, 0, {
					error,
					userId,
				})
			}

			return data ?? []
		} catch (error) {
			logger.error('Error getting profiles by user', error as Error, { userId })
			throw error
		}
	}

	/**
	 * Count profiles by model bundle hash.
	 * Useful for tracking backfill progress.
	 */
	async countByModelBundle(modelBundleHash: string): Promise<number> {
		try {
			const { count, error } = await getSupabase()
				.from('playlist_profiles')
				.select('id', { count: 'exact', head: true })
				.eq('model_bundle_hash', modelBundleHash)

			if (error) {
				throw new logger.AppError('Failed to count profiles', error.code, 0, {
					error,
					modelBundleHash,
				})
			}

			return count ?? 0
		} catch (error) {
			logger.error('Error counting profiles', error as Error, { modelBundleHash })
			throw error
		}
	}

	/**
	 * Invalidate (delete) profiles that depend on changed track embeddings.
	 * Called when track embeddings are updated.
	 */
	async invalidateByTrackIds(trackIds: number[]): Promise<number> {
		if (trackIds.length === 0) {
			return 0
		}

		try {
			// Find profiles that include any of the changed tracks
			const { data: profiles, error: fetchError } = await getSupabase()
				.from('playlist_profiles')
				.select('id, playlist_id, track_ids')
				.overlaps('track_ids', trackIds)

			if (fetchError) {
				throw new logger.AppError(
					'Failed to find affected profiles',
					fetchError.code,
					0,
					{
						error: fetchError,
						trackIds: trackIds.slice(0, 5),
					}
				)
			}

			if (!profiles || profiles.length === 0) {
				return 0
			}

			const profileIds = profiles.map(p => p.id)

			const { error: deleteError } = await getSupabase()
				.from('playlist_profiles')
				.delete()
				.in('id', profileIds)

			if (deleteError) {
				throw new logger.AppError('Failed to invalidate profiles', deleteError.code, 0, {
					error: deleteError,
					profileCount: profileIds.length,
				})
			}

			logger.info('Invalidated profiles due to track changes', {
				trackIds: trackIds.slice(0, 5),
				invalidatedCount: profileIds.length,
			})

			return profileIds.length
		} catch (error) {
			logger.error('Error invalidating profiles', error as Error, {
				trackIdCount: trackIds.length,
			})
			throw error
		}
	}
}

// Singleton instance
export const playlistProfileRepository = new SupabasePlaylistProfileRepository()
