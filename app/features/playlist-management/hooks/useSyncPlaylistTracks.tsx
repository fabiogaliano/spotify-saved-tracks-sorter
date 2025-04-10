import { useFetcher } from 'react-router';
import { useEffect, useRef } from 'react';
import { useNotificationStore } from '~/lib/stores/notificationStore';

interface PlaylistTracksSyncResult {
  success: boolean;
  error?: string;
  message?: string;
  details?: any;
  type?: string;
  totalProcessed?: number;
  newItems?: number;
}

export function useSyncPlaylistTracks() {
  const syncFetcher = useFetcher();
  const isSyncing = syncFetcher.state !== 'idle';
  const notify = useNotificationStore();
  const loadingToastId = useRef<string | number | null>(null);
  const prevState = useRef(syncFetcher.state);

  useEffect(() => {
    // Only show loading toast when transitioning from idle to submitting/loading
    if (prevState.current === 'idle' &&
      (syncFetcher.state === 'submitting' || syncFetcher.state === 'loading')) {
      // Dismiss any existing loading toast first
      if (loadingToastId.current) {
        notify.dismiss(loadingToastId.current);
      }
      // Create new loading toast and store the ID
      loadingToastId.current = notify.loading('Syncing playlist tracks...');
    }

    // When data is received and we're back to idle state
    if (prevState.current !== 'idle' && syncFetcher.state === 'idle') {
      // Dismiss loading toast if it exists
      if (loadingToastId.current) {
        notify.dismiss(loadingToastId.current);
        loadingToastId.current = null;
      }

      if (syncFetcher.data) {
        const data = syncFetcher.data as PlaylistTracksSyncResult;

        if (data.success) {
          if (data.details?.noPlaylists) {
            notify.success('No tracks to sync');
            return;
          }

          if (data.message) {
            notify.success(data.message);
          } else {
            notify.success('Playlist tracks synced successfully');
          }
        } else {
          notify.error(data.error || 'Failed to sync playlist tracks');
        }
      } else if (syncFetcher.data === undefined && syncFetcher.formData) {
        notify.error('Server timeout. Please try again.');
      }
    }

    prevState.current = syncFetcher.state;
  }, [syncFetcher.data, syncFetcher.state, syncFetcher.formData, notify]);

  const syncPlaylistTracks = (playlistId: string | number) => {
    syncFetcher.submit(
      { playlistId: playlistId.toString() },
      {
        method: 'post',
        action: '/actions/sync-playlist-tracks'
      }
    );
  };

  return {
    syncFetcher,
    isSyncing,
    syncPlaylistTracks
  };
}
