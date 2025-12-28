import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { apiRoutes } from '~/lib/config/routes'
import { PLAYLIST_AI_PREFIX } from '~/lib/constants/playlist.constants'
import { Playlist } from '~/lib/models/Playlist'
import { useNotificationStore } from '~/lib/stores/notificationStore'

// Query keys factory for better organization
export const playlistKeys = {
	all: ['playlists'] as const,
	lists: () => [...playlistKeys.all, 'list'] as const,
	list: (filters: Record<string, unknown>) => [...playlistKeys.lists(), filters] as const,
	details: () => [...playlistKeys.all, 'detail'] as const,
	detail: (id: string) => [...playlistKeys.details(), id] as const,
	tracks: (id: string) => [...playlistKeys.detail(id), 'tracks'] as const,
}

// Types
interface CreatePlaylistParams {
	name: string
	description: string
}

interface UpdatePlaylistInfoParams {
	playlistId: string
	description: string
	name: string
	smartSortingEnabled?: boolean // Optional parameter to toggle smart sorting flag
}

// Hook to get playlists (this would typically come from a loader, but shown for completeness)
export function usePlaylists(initialData?: Playlist[]) {
	return useQuery({
		queryKey: playlistKeys.lists(),
		queryFn: async () => {
			// This function won't be called since we have initialData
			// The cache will be updated via setQueryData in mutations
			return initialData || []
		},
		initialData,
		staleTime: Infinity, // Never consider data stale since it's managed via mutations
		gcTime: Infinity, // Keep in cache indefinitely
	})
}

// Hook to get tracks for a specific playlist
export function usePlaylistTracks(playlistId: string | null) {
	const notify = useNotificationStore()

	return useQuery({
		queryKey: playlistKeys.tracks(playlistId || ''),
		queryFn: async () => {
			if (!playlistId) throw new Error('No playlist ID provided')

			const formData = new FormData()
			formData.append('playlistId', playlistId)

			const response = await fetch(apiRoutes.playlists.loadTracks, {
				method: 'POST',
				body: formData,
			})

			const data = await response.json()

			if (!response.ok || !data.success) {
				throw new Error(data.error || 'Failed to load tracks')
			}

			return data.tracks || []
		},
		enabled: !!playlistId,
		staleTime: 2 * 60 * 1000,
		retry: (failureCount, error: any) => {
			// Don't retry if playlist is empty or doesn't exist
			if (error?.message?.includes('empty')) return false
			return failureCount < 2
		},
	})
}

// Hook to create a new playlist
export function useCreatePlaylist() {
	const queryClient = useQueryClient()
	const notify = useNotificationStore()

	return useMutation({
		mutationFn: async ({ name, description }: CreatePlaylistParams) => {
			const formData = new FormData()
			formData.append('name', name)
			formData.append('description', description)

			const response = await fetch(apiRoutes.playlists.create, {
				method: 'POST',
				body: formData,
			})

			const data = await response.json()

			if (!response.ok || !data.success) {
				throw new Error(data.error || 'Failed to create playlist')
			}

			return data.playlist
		},
		onSuccess: newPlaylist => {
			// Add the new playlist to the cache in the correct sort position (by updated_at DESC)
			queryClient.setQueryData<Playlist[]>(playlistKeys.lists(), oldData => {
				if (!oldData) return [newPlaylist]
				const updatedData = [newPlaylist, ...oldData]
				// Sort by updated_at descending to match the repository sort order
				return updatedData.sort(
					(a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
				)
			})
			notify.success(`Playlist "${newPlaylist.name}" created successfully!`)
		},
		onError: (error: Error) => {
			notify.error(error.message || 'Failed to create playlist')
		},
	})
}

// Hook to sync playlists
export function useSyncPlaylists() {
	const queryClient = useQueryClient()
	const notify = useNotificationStore()
	let loadingToastId: string | number | null = null

	return useMutation({
		mutationFn: async () => {
			const response = await fetch(apiRoutes.playlists.sync, {
				method: 'POST',
			})

			const data = await response.json()

			if (!response.ok || !data.success) {
				throw new Error(data.error || 'Failed to sync playlists')
			}

			return data
		},
		onMutate: () => {
			// Show loading toast
			loadingToastId = notify.loading('Syncing playlists...')
		},
		onSuccess: data => {
			// Dismiss loading toast
			if (loadingToastId) {
				notify.dismiss(loadingToastId)
			}

			// Invalidate playlists to trigger refetch
			queryClient.invalidateQueries({ queryKey: playlistKeys.lists() })

			// Show success message based on response
			const stats = data.details?.stats
			if (data.details?.noPlaylists) {
				notify.success('No playlists to sync')
			} else if (stats?.newPlaylists > 0) {
				notify.success(`Added ${stats.newPlaylists} new playlists`)
			} else {
				notify.success('All playlists are up to date')
			}
		},
		onError: (error: Error) => {
			// Dismiss loading toast
			if (loadingToastId) {
				notify.dismiss(loadingToastId)
			}
			notify.error(error.message || 'Failed to sync playlists')
		},
	})
}

// Hook to sync tracks for a specific playlist
export function useSyncPlaylistTracks() {
	const queryClient = useQueryClient()
	const notify = useNotificationStore()
	let loadingToastId: string | number | null = null

	return useMutation({
		mutationFn: async (playlistId: string) => {
			const formData = new FormData()
			formData.append('playlistId', playlistId)

			const response = await fetch(apiRoutes.playlists.syncTracks, {
				method: 'POST',
				body: formData,
			})

			const data = await response.json()

			if (!response.ok || !data.success) {
				throw new Error(data.error || 'Failed to sync playlist tracks')
			}

			return { data, playlistId }
		},
		onMutate: () => {
			loadingToastId = notify.loading('Syncing playlist tracks...')
		},
		onSuccess: ({ data, playlistId }) => {
			if (loadingToastId) {
				notify.dismiss(loadingToastId)
			}

			// Invalidate the specific playlist's tracks
			queryClient.invalidateQueries({ queryKey: playlistKeys.tracks(playlistId) })

			if (data.message) {
				notify.success(data.message)
			} else {
				notify.success('Playlist tracks synced successfully')
			}
		},
		onError: (error: Error) => {
			if (loadingToastId) {
				notify.dismiss(loadingToastId)
			}
			notify.error(error.message || 'Failed to sync playlist tracks')
		},
	})
}

// update playlist information with optimistic updates
export function useUpdatePlaylistInfo() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: async ({
			playlistId,
			description,
			name,
			smartSortingEnabled,
		}: UpdatePlaylistInfoParams) => {
			const updatePromise = async () => {
				let updatedDescription = description

				if (smartSortingEnabled !== undefined) {
					if (smartSortingEnabled && !updatedDescription.startsWith(PLAYLIST_AI_PREFIX)) {
						updatedDescription = `${PLAYLIST_AI_PREFIX}${updatedDescription}`
					} else if (
						!smartSortingEnabled &&
						updatedDescription.startsWith(PLAYLIST_AI_PREFIX)
					) {
						updatedDescription = updatedDescription.replace(PLAYLIST_AI_PREFIX, '')
					}
				}

				const formData = new FormData()
				formData.append('playlistId', playlistId)
				formData.append('description', updatedDescription)
				formData.append('name', name)

				// Include is_flagged if we're updating the smart sorting setting
				if (smartSortingEnabled !== undefined) {
					formData.append('is_flagged', smartSortingEnabled.toString())
				}

				const response = await fetch(apiRoutes.playlists.updateDescription, {
					method: 'POST',
					body: formData,
				})

				const data = await response.json()

				if (!response.ok || !data.success) {
					throw new Error(data.error || 'Failed to update playlist information')
				}

				return data.playlist
			}

			const isSmartSortingUpdate = smartSortingEnabled !== undefined
			const loadingMessage =
				isSmartSortingUpdate ?
					smartSortingEnabled ? 'Enabling smart sorting...'
					:	'Disabling smart sorting...'
				:	'Updating playlist information...'
			const successMessage =
				isSmartSortingUpdate ?
					smartSortingEnabled ? 'Smart sorting enabled!'
					:	'Smart sorting disabled!'
				:	'Playlist information updated successfully!'
			const errorHandler = (error: Error) =>
				error.message ||
				(isSmartSortingUpdate ?
					'Failed to update smart sorting'
				:	'Failed to update playlist information')

			const updatePromiseInstance = updatePromise()

			toast.promise(updatePromiseInstance, {
				loading: loadingMessage,
				success: successMessage,
				error: errorHandler,
			})

			return await updatePromiseInstance
		},
		onMutate: async ({ playlistId, description, name, smartSortingEnabled }) => {
			// Cancel any outgoing refetches
			await queryClient.cancelQueries({ queryKey: playlistKeys.lists() })

			const previousPlaylists = queryClient.getQueryData<Playlist[]>(playlistKeys.lists())

			queryClient.setQueryData<Playlist[]>(playlistKeys.lists(), old => {
				if (!old) return []
				return old.map(playlist => {
					if (playlist.id.toString() === playlistId) {
						let updatedDescription = description

						// Handle smart sorting flag changes if specified
						if (smartSortingEnabled !== undefined) {
							// If enabling smart sorting and description doesn't have AI prefix, add it
							if (
								smartSortingEnabled &&
								!updatedDescription.startsWith(PLAYLIST_AI_PREFIX)
							) {
								updatedDescription = `${PLAYLIST_AI_PREFIX}${updatedDescription}`
							}
							// If disabling smart sorting and description has AI prefix, remove it
							else if (
								!smartSortingEnabled &&
								updatedDescription.startsWith(PLAYLIST_AI_PREFIX)
							) {
								updatedDescription = updatedDescription.replace(PLAYLIST_AI_PREFIX, '')
							}
						}

						return {
							...playlist,
							name: name,
							description: updatedDescription,
							// Update is_flagged if smartSortingEnabled is specified
							...(smartSortingEnabled !== undefined && {
								is_flagged: smartSortingEnabled,
							}),
							updated_at: new Date().toISOString(),
						}
					}
					return playlist
				})
			})

			// Return a context object with the snapshotted value
			return { previousPlaylists }
		},
		onError: (error: Error, variables, context) => {
			if (context?.previousPlaylists) {
				queryClient.setQueryData(playlistKeys.lists(), context.previousPlaylists)
			}
		},
		onSuccess: updatedPlaylist => {
			// Update the cache with the actual server response
			queryClient.setQueryData<Playlist[]>(playlistKeys.lists(), old => {
				if (!old) return [updatedPlaylist]
				return old.map(playlist =>
					playlist.id === updatedPlaylist.id ? updatedPlaylist : playlist
				)
			})
		},
	})
}

export function usePrefetchPlaylistTracks() {
	const queryClient = useQueryClient()

	return (playlistId: string) => {
		queryClient.prefetchQuery({
			queryKey: playlistKeys.tracks(playlistId),
			queryFn: async () => {
				const formData = new FormData()
				formData.append('playlistId', playlistId)

				const response = await fetch(apiRoutes.playlists.loadTracks, {
					method: 'POST',
					body: formData,
				})

				const data = await response.json()

				if (!response.ok || !data.success) {
					throw new Error(data.error || 'Failed to load tracks')
				}

				return data.tracks || []
			},
			staleTime: 2 * 60 * 1000,
		})
	}
}
