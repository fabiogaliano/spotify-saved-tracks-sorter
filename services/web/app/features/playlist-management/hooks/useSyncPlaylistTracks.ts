import { useCallback } from 'react';
import { useSyncPlaylistTracks as useSyncPlaylistTracksQuery } from '../queries/playlist-queries';

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
  const mutation = useSyncPlaylistTracksQuery();

  const syncPlaylistTracks = useCallback((playlistId: string | number) => {
    const playlistIdStr = playlistId.toString();
    mutation.mutate(playlistIdStr);
  }, [mutation]);

  return {
    isSyncing: mutation.isPending,
    syncPlaylistTracks
  };
}