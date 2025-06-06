import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TrackWithAnalysis } from '~/lib/models/Track';
import { useNotificationStore } from '~/lib/stores/notificationStore';

// Query keys factory for better organization
export const likedSongsKeys = {
  all: ['liked-songs'] as const,
  lists: () => [...likedSongsKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...likedSongsKeys.lists(), filters] as const,
  analysis: () => [...likedSongsKeys.all, 'analysis'] as const,
  analysisJob: (jobId: string) => [...likedSongsKeys.analysis(), 'job', jobId] as const,
  analysisStatus: () => [...likedSongsKeys.analysis(), 'status'] as const,
};

// Types
interface AnalyzeTracksParams {
  tracks: Array<{
    id: number;
    spotifyTrackId: string;
    artist: string;
    name: string;
  }>;
}

interface SyncLikedSongsResult {
  success: boolean;
  result: {
    added: number;
    removed: number;
    total: number;
  };
}

interface AnalysisJobResponse {
  success: boolean;
  message: string;
  batchId?: string;
  errors?: Array<{ trackId: number; error: string }>;
}

// Hook to get liked songs
export function useLikedSongs(initialData?: TrackWithAnalysis[]) {
  return useQuery({
    queryKey: likedSongsKeys.lists(),
    queryFn: async () => {
      const response = await fetch('/api/liked-songs');
      if (!response.ok) {
        throw new Error('Failed to fetch liked songs');
      }
      return response.json();
    },
    initialData,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });
}

// Hook to get analysis job status
export function useAnalysisJob(jobId: string | null) {
  const notify = useNotificationStore();
  
  return useQuery({
    queryKey: likedSongsKeys.analysisJob(jobId || ''),
    queryFn: async () => {
      if (!jobId) throw new Error('No job ID provided');
      
      const response = await fetch(`/api/analysis/active-job?jobId=${jobId}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch job status');
      }
      
      return data;
    },
    enabled: !!jobId,
    refetchInterval: (data) => {
      // Stop polling if job is completed or failed
      if (data?.status === 'completed' || data?.status === 'failed') {
        return false;
      }
      return 2000; // Poll every 2 seconds while job is active
    },
    staleTime: 0, // Always fetch fresh data for job status
    retry: (failureCount, error: any) => {
      // Don't retry if job doesn't exist
      if (error?.message?.includes('not found')) return false;
      return failureCount < 2;
    },
  });
}

// Hook to get general analysis status - checking active job endpoint instead
export function useAnalysisStatus() {
  return useQuery({
    queryKey: likedSongsKeys.analysisStatus(),
    queryFn: async () => {
      const response = await fetch('/api/analysis/active-job');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch analysis status');
      }
      
      // If no active job, return null
      if (!data) {
        return { hasActiveJob: false, currentJob: null };
      }
      
      // Convert trackStates back to Map and structure for component
      const trackStatesMap = new Map(Object.entries(data.trackStates || {}).map(([key, value]) => [parseInt(key, 10), value]));
      
      // Trust the server's job status completely
      // The server will mark jobs as complete when appropriate
      const isJobActive = data.status === 'pending' || data.status === 'in_progress';
      
      // Server only returns active jobs now, no completed ones
      
      const currentJob = {
        ...data,
        trackStates: trackStatesMap,
        startedAt: new Date(data.startedAt)
      };
      
      return {
        hasActiveJob: isJobActive, // Use actual job status, not hardcoded true
        currentJob
      };
    },
    // Don't use refetchInterval - rely on WebSocket for real-time updates
    refetchOnWindowFocus: false,
    staleTime: 30 * 1000, // 30 seconds - keep data fresh but don't poll
    retry: 2,
  });
}

// Hook to sync liked songs
export function useSyncLikedSongs() {
  const queryClient = useQueryClient();
  const notify = useNotificationStore();
  
  return useMutation({
    mutationFn: async (): Promise<SyncLikedSongsResult> => {
      const syncPromise = async () => {
        const response = await fetch('/actions/sync-liked-songs', {
          method: 'POST',
        });
        
        const data = await response.json();
        
        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to sync liked songs');
        }
        
        return data;
      };

      // Use toast.promise to handle loading/success/error states automatically
      const result = await notify.promise(syncPromise(), {
        loading: 'Syncing liked songs...',
        success: (data: SyncLikedSongsResult) => {
          const stats = data.result;
          if (stats.added > 0) {
            return `Successfully synced ${stats.added} new liked song${stats.added === 1 ? '' : 's'}`;
          } else {
            return 'Your liked songs are up to date';
          }
        },
        error: (error: Error) => error.message || 'Failed to sync liked songs',
      });

      return result;
    },
    onSuccess: () => {
      // Invalidate and refetch liked songs from React Query cache
      queryClient.invalidateQueries({ queryKey: likedSongsKeys.lists() });
    },
  });
}

// Hook to analyze tracks
export function useAnalyzeTracks() {
  const queryClient = useQueryClient();
  const notify = useNotificationStore();
  
  return useMutation({
    mutationFn: async (params: AnalyzeTracksParams): Promise<AnalysisJobResponse> => {
      const response = await fetch('/actions/analyze-liked-songs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to start analysis');
      }
      
      return data;
    },
    onMutate: (variables) => {
      // Immediately update tracks to 'pending' status in the cache
      const trackIds = variables.tracks.map(t => t.id);
      
      queryClient.setQueryData(likedSongsKeys.lists(), (oldData: TrackWithAnalysis[] = []) => {
        return oldData.map(track => 
          trackIds.includes(track.track.id)
            ? { ...track, uiAnalysisStatus: 'pending' as any }
            : track
        );
      });
      
      // Show loading notification
      const trackCount = variables.tracks.length;
      notify.loading(`Queuing ${trackCount} track${trackCount > 1 ? 's' : ''} for analysis...`);
      
      return { trackIds };
    },
    onSuccess: (data, variables) => {
      // Invalidate analysis status to pick up new job
      queryClient.invalidateQueries({ queryKey: likedSongsKeys.analysisStatus() });
      
      // Dismiss loading notification and show info message
      const trackCount = variables.tracks.length;
      notify.dismiss(); // Clear loading notification
      notify.info(`${trackCount} track${trackCount > 1 ? 's' : ''} queued for analysis`);
      
      // If there were partial errors, show additional info
      if (data.errors && data.errors.length > 0) {
        notify.warning(`${data.errors.length} tracks had issues and were skipped`);
      }
    },
    onError: (error: Error, variables, context) => {
      // Revert the optimistic update
      if (context?.trackIds) {
        queryClient.setQueryData(likedSongsKeys.lists(), (oldData: TrackWithAnalysis[] = []) => {
          return oldData.map(track => 
            context.trackIds.includes(track.track.id)
              ? { ...track, uiAnalysisStatus: 'not_analyzed' as any }
              : track
          );
        });
      }
      
      notify.dismiss(); // Clear loading notification
      notify.error(error.message || 'Failed to start analysis');
    },
  });
}

// Hook to update track analysis in cache
export function useUpdateTrackAnalysis() {
  const queryClient = useQueryClient();
  
  return (trackId: number, analysisData: any, status: string) => {
    queryClient.setQueryData(likedSongsKeys.lists(), (oldData: TrackWithAnalysis[] = []) => {
      return oldData.map(track => 
        track.track.id === trackId 
          ? { 
              ...track, 
              analysis: analysisData,
              uiAnalysisStatus: status as any 
            }
          : track
      );
    });
  };
}