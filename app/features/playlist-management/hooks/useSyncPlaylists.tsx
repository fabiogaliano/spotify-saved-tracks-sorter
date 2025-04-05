import { useEffect } from 'react'
import { useFetcher } from 'react-router'
import { useNotificationStore } from '~/lib/stores/notificationStore'

/**
 * Custom hook for handling playlist synchronization operations
 */
export function useSyncPlaylists() {
	const syncFetcher = useFetcher()
	const isSyncing = syncFetcher.state !== 'idle'
	const notify = useNotificationStore()

	// Handle sync response
	useEffect(() => {
		if (syncFetcher.data && syncFetcher.state === 'idle') {
			const data = syncFetcher.data as any

			if (data.success) {
				notify.success(data.message || 'Playlists synced successfully')
			} else {
				notify.error(data.error || 'Failed to sync playlists')
			}
		}
	}, [syncFetcher.data, syncFetcher.state, notify])

	return {
		syncFetcher,
		isSyncing,
	}
}
