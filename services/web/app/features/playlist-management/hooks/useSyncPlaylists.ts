import { useCallback } from 'react'

import { useSyncPlaylists as useSyncPlaylistsQuery } from '../queries/playlist-queries'

/**
 * Custom hook for handling playlist synchronization operations using React Query
 */
export function useSyncPlaylists() {
	const mutation = useSyncPlaylistsQuery()

	const triggerSync = useCallback(() => {
		mutation.mutate()
	}, [mutation])

	return {
		isSyncing: mutation.isPending,
		triggerSync,
	}
}
