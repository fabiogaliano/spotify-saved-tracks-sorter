import { useQueries, useQuery } from '@tanstack/react-query'

// Query key factory
export const playlistImageKeys = {
	all: ['playlist-images'] as const,
	detail: (playlistId: string) => ['playlist-images', playlistId] as const,
}

// Fetch function
async function fetchPlaylistImage(playlistId: string): Promise<string | null> {
	const response = await fetch(`/api/playlist-image/${playlistId}`)
	const data = await response.json()
	return data.imageUrl || null
}

// Single playlist image query
export function usePlaylistImage(spotifyPlaylistId: string) {
	return useQuery({
		queryKey: playlistImageKeys.detail(spotifyPlaylistId),
		queryFn: () => fetchPlaylistImage(spotifyPlaylistId),
		staleTime: 1000 * 60 * 60, // 1 hour
		gcTime: 1000 * 60 * 60 * 2, // 2 hours (was cacheTime in v4)
		retry: false, // Don't retry failed image loads
	})
}

// Multiple playlist images query (for prefetching)
export function usePlaylistImages(spotifyPlaylistIds: string[]) {
	return useQueries({
		queries: spotifyPlaylistIds.map(id => ({
			queryKey: playlistImageKeys.detail(id),
			queryFn: () => fetchPlaylistImage(id),
			staleTime: 1000 * 60 * 60, // 1 hour
			gcTime: 1000 * 60 * 60 * 2, // 2 hours
			retry: false,
		})),
	})
}

// Prefetch utility for React Query
export async function prefetchPlaylistImages(
	queryClient: any,
	playlistIds: string[]
): Promise<void> {
	await Promise.allSettled(
		playlistIds.map(id =>
			queryClient.prefetchQuery({
				queryKey: playlistImageKeys.detail(id),
				queryFn: () => fetchPlaylistImage(id),
				staleTime: 1000 * 60 * 60, // 1 hour
			})
		)
	)
}
