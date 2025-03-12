import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type AnalysisStatus = 'idle' | 'queued' | 'analyzing' | 'analyzed' | 'error'

interface AnalysisState {
  trackStatuses: Record<string, AnalysisStatus>
  queuedTracks: Array<{
    id: string,
    spotify_track_id: string,
    artist: string,
    name: string
  }>
  currentlyAnalyzingId: string | null

  // Methods
  getTrackStatus: (trackId: string) => AnalysisStatus
  setTrackStatus: (trackId: string, status: AnalysisStatus) => void
  setQueuedTracks: (tracks: Array<any>) => void
  removeFromQueue: (trackId: string) => void
  getNextTrackToAnalyze: () => any | null
  setCurrentlyAnalyzing: (trackId: string | null) => void
  getCurrentlyAnalyzing: () => string | null
  resetAllStatuses: () => void
}

// Create the store with persistence
export const useAnalysisStatusStore = create<AnalysisState>(
  persist(
    (set, get) => ({
      trackStatuses: {},
      queuedTracks: [],
      currentlyAnalyzingId: null,

      getTrackStatus: (trackId: string) => {
        // First check if the track has a stored status of 'analyzed' or 'error'
        // These statuses should always override other checks
        const storedStatus = get().trackStatuses[trackId];
        if (storedStatus === 'analyzed' || storedStatus === 'error') {
          return storedStatus;
        }

        // If a track is currently being analyzed, prioritize that status
        if (get().currentlyAnalyzingId === trackId) {
          return 'analyzing';
        }

        // Check if the track is in the queue
        const isQueued = get().queuedTracks.some(track => track.id === trackId);
        if (isQueued) {
          return 'queued';
        }

        // Otherwise return the stored status or default to idle
        return storedStatus || 'idle';
      },

      setTrackStatus: (trackId: string, status: AnalysisStatus) => {
        // If the track is already analyzed, don't change it to any other status
        // except explicitly setting it to 'error' or 'idle'
        const currentStatus = get().trackStatuses[trackId];
        if (currentStatus === 'analyzed' && status !== 'error' && status !== 'idle') {
          console.log(`Preserving 'analyzed' status for track ${trackId}`);
          return;
        }

        set((state) => ({
          trackStatuses: {
            ...state.trackStatuses,
            [trackId]: status
          }
        }));

        // If a track is marked as analyzed or error, remove it from currently analyzing
        if ((status === 'analyzed' || status === 'error') && get().currentlyAnalyzingId === trackId) {
          get().setCurrentlyAnalyzing(null);
        }
      },

      setQueuedTracks: (tracks: Array<any>) => {
        set({ queuedTracks: tracks });
      },

      removeFromQueue: (trackId: string) => {
        set((state) => ({
          queuedTracks: state.queuedTracks.filter(track => track.id !== trackId)
        }));
      },

      getNextTrackToAnalyze: () => {
        const queue = get().queuedTracks;
        return queue.length > 0 ? queue[0] : null;
      },

      setCurrentlyAnalyzing: (trackId: string | null) => {
        // Log for debugging
        if (trackId === null) {
          console.log('Clearing currently analyzing track');
        } else {
          console.log(`Setting currently analyzing track: ${trackId}`);
        }
        set({ currentlyAnalyzingId: trackId });
      },

      getCurrentlyAnalyzing: () => {
        return get().currentlyAnalyzingId;
      },

      resetAllStatuses: () => {
        set({
          trackStatuses: {},
          queuedTracks: [],
          currentlyAnalyzingId: null
        });
      }
    }),
    {
      name: 'analysis-status-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        trackStatuses: state.trackStatuses,
        queuedTracks: state.queuedTracks,
        currentlyAnalyzingId: state.currentlyAnalyzingId
      })
    }
  )
)
