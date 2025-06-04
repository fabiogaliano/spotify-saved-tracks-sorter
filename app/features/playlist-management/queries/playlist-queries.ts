import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PlaylistService } from '~/lib/services/PlaylistService';
import { SpotifyService } from '~/lib/services/SpotifyService';
import { SyncService } from '~/lib/services/SyncService';
import { TrackService } from '~/lib/services/TrackService';
import { Playlist } from '~/lib/models/Playlist';
import { useNotificationStore } from '~/lib/stores/notificationStore';

// Query keys factory for better organization
export const playlistKeys = {
  all: ['playlists'] as const,
  lists: () => [...playlistKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...playlistKeys.lists(), filters] as const,
  details: () => [...playlistKeys.all, 'detail'] as const,
  detail: (id: string) => [...playlistKeys.details(), id] as const,
  tracks: (id: string) => [...playlistKeys.detail(id), 'tracks'] as const,
};

// Types
interface CreatePlaylistParams {
  name: string;
  description: string;
}

interface SyncPlaylistsParams {
  userId: string;
  spotifyApi: any; // Replace with proper SpotifyApi type
}

interface LoadPlaylistTracksParams {
  playlistId: string;
}

// Hook to get playlists (this would typically come from a loader, but shown for completeness)
export function usePlaylists(initialData?: Playlist[]) {
  return useQuery({
    queryKey: playlistKeys.lists(),
    queryFn: async () => {
      // This function won't be called since we have initialData
      // The cache will be updated via setQueryData in mutations
      return initialData || [];
    },
    initialData,
    staleTime: Infinity, // Never consider data stale since it's managed via mutations
    gcTime: Infinity, // Keep in cache indefinitely
  });
}

// Hook to get tracks for a specific playlist
export function usePlaylistTracks(playlistId: string | null) {
  const notify = useNotificationStore();
  
  return useQuery({
    queryKey: playlistKeys.tracks(playlistId || ''),
    queryFn: async () => {
      if (!playlistId) throw new Error('No playlist ID provided');
      
      const formData = new FormData();
      formData.append('playlistId', playlistId);
      
      const response = await fetch('/actions/load-playlist-tracks', {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to load tracks');
      }
      
      return data.tracks || [];
    },
    enabled: !!playlistId,
    staleTime: 2 * 60 * 1000,
    retry: (failureCount, error: any) => {
      // Don't retry if playlist is empty or doesn't exist
      if (error?.message?.includes('empty')) return false;
      return failureCount < 2;
    },
  });
}

// Hook to create a new playlist
export function useCreatePlaylist() {
  const queryClient = useQueryClient();
  const notify = useNotificationStore();
  
  return useMutation({
    mutationFn: async ({ name, description }: CreatePlaylistParams) => {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('description', description);
      
      const response = await fetch('/actions/create-ai-playlist', {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to create playlist');
      }
      
      return data.playlist;
    },
    onSuccess: (newPlaylist) => {
      // Add the new playlist to the cache in the correct sort position (by updated_at DESC)
      queryClient.setQueryData(playlistKeys.lists(), (oldData: Playlist[] = []) => {
        const updatedData = [newPlaylist, ...oldData];
        // Sort by updated_at descending to match the repository sort order
        return updatedData.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      });
      notify.success(`Playlist "${newPlaylist.name}" created successfully!`);
    },
    onError: (error: Error) => {
      notify.error(error.message || 'Failed to create playlist');
    },
  });
}

// Hook to sync playlists
export function useSyncPlaylists() {
  const queryClient = useQueryClient();
  const notify = useNotificationStore();
  let loadingToastId: string | number | null = null;
  
  return useMutation({
    mutationFn: async () => {
      const response = await fetch('/actions/sync-playlists', {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to sync playlists');
      }
      
      return data;
    },
    onMutate: () => {
      // Show loading toast
      loadingToastId = notify.loading('Syncing playlists...');
    },
    onSuccess: (data) => {
      // Dismiss loading toast
      if (loadingToastId) {
        notify.dismiss(loadingToastId);
      }
      
      // Invalidate playlists to trigger refetch
      queryClient.invalidateQueries({ queryKey: playlistKeys.lists() });
      
      // Show success message based on response
      const stats = data.details?.stats;
      if (data.details?.noPlaylists) {
        notify.success('No playlists to sync');
      } else if (stats?.newPlaylists > 0) {
        notify.success(`Added ${stats.newPlaylists} new playlists`);
      } else {
        notify.success('All playlists are up to date');
      }
    },
    onError: (error: Error) => {
      // Dismiss loading toast
      if (loadingToastId) {
        notify.dismiss(loadingToastId);
      }
      notify.error(error.message || 'Failed to sync playlists');
    },
  });
}

// Hook to sync tracks for a specific playlist
export function useSyncPlaylistTracks() {
  const queryClient = useQueryClient();
  const notify = useNotificationStore();
  let loadingToastId: string | number | null = null;
  
  return useMutation({
    mutationFn: async (playlistId: string) => {
      const formData = new FormData();
      formData.append('playlistId', playlistId);
      
      const response = await fetch('/actions/sync-playlist-tracks', {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to sync playlist tracks');
      }
      
      return { data, playlistId };
    },
    onMutate: () => {
      loadingToastId = notify.loading('Syncing playlist tracks...');
    },
    onSuccess: ({ data, playlistId }) => {
      if (loadingToastId) {
        notify.dismiss(loadingToastId);
      }
      
      // Invalidate the specific playlist's tracks
      queryClient.invalidateQueries({ queryKey: playlistKeys.tracks(playlistId) });
      
      if (data.message) {
        notify.success(data.message);
      } else {
        notify.success('Playlist tracks synced successfully');
      }
    },
    onError: (error: Error) => {
      if (loadingToastId) {
        notify.dismiss(loadingToastId);
      }
      notify.error(error.message || 'Failed to sync playlist tracks');
    },
  });
}

// Hook to prefetch playlist tracks (for better UX)
export function usePrefetchPlaylistTracks() {
  const queryClient = useQueryClient();
  
  return (playlistId: string) => {
    queryClient.prefetchQuery({
      queryKey: playlistKeys.tracks(playlistId),
      queryFn: async () => {
        const formData = new FormData();
        formData.append('playlistId', playlistId);
        
        const response = await fetch('/actions/load-playlist-tracks', {
          method: 'POST',
          body: formData,
        });
        
        const data = await response.json();
        
        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to load tracks');
        }
        
        return data.tracks || [];
      },
      staleTime: 2 * 60 * 1000,
    });
  };
}