import { useEffect, useRef } from 'react'
import { useFetcher } from 'react-router'
import { PlaylistSyncResult } from '~/lib/services/SyncService'
import { useNotificationStore } from '~/lib/stores/notificationStore'

/**
 * Custom hook for handling playlist synchronization operations
 */
export function useSyncPlaylists() {
  const syncFetcher = useFetcher()
  const isSyncing = syncFetcher.state !== 'idle'
  const notify = useNotificationStore()
  const loadingToastId = useRef<string | number | null>(null)
  const prevState = useRef(syncFetcher.state)

  useEffect(() => {
    // Only show loading toast when transitioning from idle to submitting/loading
    if (prevState.current === 'idle' &&
      (syncFetcher.state === 'submitting' || syncFetcher.state === 'loading')) {
      // Dismiss any existing loading toast first
      if (loadingToastId.current) {
        notify.dismiss(loadingToastId.current)
      }
      // Create new loading toast and store the ID
      loadingToastId.current = notify.loading('Syncing playlists...')
    }

    // When data is received and we're back to idle state
    if (prevState.current !== 'idle' && syncFetcher.state === 'idle') {
      // Dismiss loading toast if it exists
      if (loadingToastId.current) {
        notify.dismiss(loadingToastId.current)
        loadingToastId.current = null
      }

      if (syncFetcher.data) {
        const data = syncFetcher.data as PlaylistSyncResult

        if (data.success) {
          const stats = data.details?.stats;


          if (data.details?.noPlaylists) {
            notify.success('No playlists to sync')
            return;
          }

          if (!stats) {
            notify.success('Playlists synced successfully')
            return;
          }

          let message = '';

          if (stats.newPlaylists > 0) {
            const newAiPlaylists = Math.min(stats.newPlaylists, stats.aiPlaylistsChecked);

            if (newAiPlaylists > 0) {
              if (newAiPlaylists === stats.newPlaylists) {
                message = `Synced ${newAiPlaylists} new AI playlists`;
              } else {
                message = `Synced ${stats.newPlaylists} new playlists (${newAiPlaylists} AI playlists)`;
              }
            } else {
              message = `Synced ${stats.newPlaylists} new playlists`;

              if (stats.aiPlaylistsChecked > 0) {
                message += ` and verified existing AI playlists`;
              }
            }
          } else {
            if (stats.aiPlaylistsChecked > 0) {
              message = `Verified ${stats.aiPlaylistsChecked} AI playlists`;
            } else {
              message = 'All playlists are up to date';
            }
          }

          notify.success(message)
        } else {
          notify.error(data.error || 'Failed to sync playlists')
        }
      } else if (syncFetcher.data === undefined && syncFetcher.formData) {
        notify.error('Server timeout. Please try again.')
      }
    }

    prevState.current = syncFetcher.state
  }, [syncFetcher.data, syncFetcher.state, syncFetcher.formData, notify])

  const triggerSync = () => {
    syncFetcher.submit({}, {
      method: 'post',
      action: '/actions/sync-playlists'
    })
  }

  return {
    syncFetcher,
    isSyncing,
    triggerSync
  }
}
