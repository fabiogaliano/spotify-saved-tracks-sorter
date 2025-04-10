import { useFetcher } from 'react-router';
import { useEffect, useRef, useCallback } from 'react';
import { useNotificationStore } from '~/lib/stores/notificationStore';
import { usePlaylistTracksContext } from '../context/PlaylistTracksContext';

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
  const lastSyncedPlaylistId = useRef<string | null>(null);
  const { loadPlaylistTracks } = usePlaylistTracksContext();

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
          
          // Load the tracks for the playlist that was just synced
          if (lastSyncedPlaylistId.current) {
            loadPlaylistTracks(lastSyncedPlaylistId.current, true);
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

  const syncPlaylistTracks = useCallback((playlistId: string | number) => {
    const playlistIdStr = playlistId.toString();
    lastSyncedPlaylistId.current = playlistIdStr;
    syncFetcher.submit(
      { playlistId: playlistIdStr },
      {
        method: 'post',
        action: '/actions/sync-playlist-tracks'
      }
    );
  }, [syncFetcher]);

  return {
    syncFetcher,
    isSyncing,
    syncPlaylistTracks
  };
}
