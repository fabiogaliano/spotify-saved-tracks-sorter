import { Market, MaxInt, SpotifyApi } from '@fostertheweb/spotify-web-sdk'

import { logger } from '~/lib/logging/Logger'
import type { SpotifyPlaylistDTO } from '~/lib/models/Playlist'
import type { SpotifyTrackDTO } from '~/lib/models/Track'

export class SpotifyService {
	private spotifyApi: SpotifyApi

	constructor(spotifyApi: SpotifyApi) {
		this.spotifyApi = spotifyApi
	}

	async getLikedTracks(since?: string | null): Promise<SpotifyTrackDTO[]> {
		try {
			const allTracks = await this.fetchPaginatedData({
				fetchFn: (limit, offset) =>
					this.spotifyApi.currentUser.tracks.savedTracks(limit, offset),
				limit: 50,
				filterFn: since ? track => new Date(track.added_at) > new Date(since) : undefined,
				shouldStopEarly:
					since ?
						(originalItems, filteredItems) => filteredItems.length < originalItems.length
					:	undefined,
			})

			return allTracks as SpotifyTrackDTO[]
		} catch (error) {
			throw new logger.AppError(
				'Failed to fetch liked tracks',
				'SPOTIFY_API_ERROR',
				500,
				{ operation: 'getLikedTracks', since, error }
			)
		}
	}

	async getPlaylists(): Promise<SpotifyPlaylistDTO[]> {
		const LIMIT: MaxInt<50> = 50
		let offset = 0
		const allPlaylists: SpotifyPlaylistDTO[] = []
		let shouldContinue = true

		try {
			const currentUser = await this.fetchWithRetry(() =>
				this.spotifyApi.currentUser.profile()
			)
			while (shouldContinue) {
				const playlists = await this.fetchWithRetry(() =>
					this.spotifyApi.playlists.getUsersPlaylists(currentUser.id, LIMIT, offset)
				)
				const filteredPlaylists = playlists.items
					.filter(p => p.owner.id === currentUser.id)
					.map(
						p =>
							({
								id: p.id,
								name: p.name,
								description: p.description,
								owner: { id: p.owner.id },
								track_count: p.tracks?.total ?? 0,
								is_flagged: !!p.description?.toLowerCase().startsWith('ai:'),
							}) satisfies SpotifyPlaylistDTO
					)

				allPlaylists.push(...filteredPlaylists)

				if (playlists.items.length < LIMIT) {
					shouldContinue = false
				}
				offset += LIMIT
			}

			return allPlaylists
		} catch (error) {
			throw new logger.AppError('Failed to fetch playlists', 'SPOTIFY_API_ERROR', 500, {
				error,
			})
		}
	}

	async getPlaylistTracks(playlistId: string): Promise<SpotifyTrackDTO[]> {
		const LIMIT: MaxInt<50> = 50
		let offset = 0
		const allTracks: SpotifyTrackDTO[] = []
		let shouldContinue = true

		try {
			const market = (await this.spotifyApi.currentUser.profile()).country as Market
			while (shouldContinue) {
				const response = await this.fetchWithRetry(() =>
					this.spotifyApi.playlists.getPlaylistItems(
						playlistId,
						market,
						'',
						LIMIT,
						offset
					)
				)

				allTracks.push(...(response.items as SpotifyTrackDTO[]))

				if (response.items.length < LIMIT) {
					shouldContinue = false
				}

				offset += LIMIT
			}

			return allTracks
		} catch (error) {
			throw new logger.AppError(
				'Failed to fetch playlist tracks',
				'SPOTIFY_API_ERROR',
				500,
				{ error }
			)
		}
	}

	/**
	 * Fetches paginated data from Spotify API with configurable filtering and stopping conditions
	 */
	private async fetchPaginatedData<T>({
		fetchFn,
		limit,
		filterFn,
		shouldStopEarly,
	}: {
		fetchFn: (limit: MaxInt<50>, offset: number) => Promise<{ items: T[] }>
		limit: MaxInt<50>
		filterFn?: (item: T) => boolean
		shouldStopEarly?: (originalItems: T[], filteredItems: T[]) => boolean
	}): Promise<T[]> {
		const allItems: T[] = []
		let offset = 0
		let shouldContinue = true

		while (shouldContinue) {
			const response = await this.fetchWithRetry(() => fetchFn(limit, offset))
			const originalItems = response.items

			const filteredItems = filterFn ? originalItems.filter(filterFn) : originalItems
			allItems.push(...filteredItems)

			if (shouldStopEarly && shouldStopEarly(originalItems, filteredItems)) {
				shouldContinue = false
			} else if (originalItems.length < limit) {
				shouldContinue = false
			}

			offset += limit
		}

		return allItems
	}

	/**
	 * Enhanced retry mechanism with configurable behavior
	 */
	private async fetchWithRetry<T>(
		fetchFunction: () => Promise<T>,
		options: {
			maxRetries?: number
			isRetryable?: (error: any) => boolean
			getDelayMs?: (error: any, attempt: number) => number
		} = {}
	): Promise<T> {
		const {
			maxRetries = 3,
			isRetryable = error => error.status === 429,
			getDelayMs = error => {
				const retryAfter = parseInt(error.headers?.get('Retry-After') || '1', 10)
				return retryAfter * 1000
			},
		} = options

		let attempt = 0

		while (attempt <= maxRetries) {
			try {
				return await fetchFunction()
			} catch (error) {
				if (isRetryable(error) && attempt < maxRetries) {
					await this.sleep(getDelayMs(error, attempt))
					attempt++
				} else {
					throw error
				}
			}
		}
		throw new Error(`Maximum retry attempts (${maxRetries}) reached`)
	}

	async createPlaylist(
		name: string,
		description: string
	): Promise<{ id: string; name: string }> {
		try {
			const currentUser = await this.fetchWithRetry(() =>
				this.spotifyApi.currentUser.profile()
			)
			const playlist = await this.fetchWithRetry(() =>
				this.spotifyApi.playlists.createPlaylist(currentUser.id, {
					name,
					description,
					public: false,
				})
			)

			return {
				id: playlist.id,
				name: playlist.name,
			}
		} catch (error) {
			throw new logger.AppError('Failed to create playlist', 'SPOTIFY_API_ERROR', 500, {
				operation: 'createPlaylist',
				name,
				description,
				error,
			})
		}
	}

	async updatePlaylist(
		playlistId: string,
		description: string,
		name: string
	): Promise<void> {
		try {
			await this.fetchWithRetry(() =>
				this.spotifyApi.playlists.changePlaylistDetails(playlistId, {
					description,
					name,
				})
			)
		} catch (error) {
			throw new logger.AppError(
				'Failed to update playlist description',
				'SPOTIFY_API_ERROR',
				500,
				{
					operation: 'updatePlaylistDescription',
					playlistId,
					description,
					error: {
						message: error instanceof Error ? error.message : String(error),
						status: (error as any)?.status,
					},
				}
			)
		}
	}

	async getPlaylistImage(playlistId: string): Promise<string | null> {
		try {
			const playlist = await this.fetchWithRetry(() =>
				this.spotifyApi.playlists.getPlaylist(playlistId, undefined)
			)

			// Check if playlist has images
			if (playlist.images && playlist.images.length > 0) {
				return playlist.images[0].url
			}

			return null
		} catch (error: any) {
			// If it's a 404, the playlist doesn't exist or user doesn't have access
			if (error?.status === 404) {
				logger.warn('Playlist not found or no access', { playlistId })
				return null
			}

			throw new logger.AppError(
				'Failed to get playlist image',
				'SPOTIFY_API_ERROR',
				error?.status || 500,
				{ operation: 'getPlaylistImage', playlistId, error: error?.message || error }
			)
		}
	}

	private sleep(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms))
	}
}
