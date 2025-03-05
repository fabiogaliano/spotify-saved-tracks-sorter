import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type TrackStatus = 'ignored' | 'unsorted' | 'sorted'

interface TrackState {
  status: TrackStatus
}

interface TrackSortingState {
  tracks: Record<string, TrackState>
  getTrackStatus: (trackId: string) => TrackStatus
  setTrackStatus: (trackId: string, status: TrackStatus) => void
  getSortedTrackIds: () => string[]
  getSortedTracksCount: () => number
  clearAllTracks: () => void
}

// Create the store with persistence - using type assertion to fix TS error
export const useTrackSortingStore = create<TrackSortingState>()(
  persist(
    (set, get) => ({
      tracks: {},

      getTrackStatus: (trackId: string) => {
        return get().tracks[trackId]?.status || 'unsorted'
      },

      setTrackStatus: (trackId: string, status: TrackStatus) => {
        set((state) => ({
          tracks: {
            ...state.tracks,
            [trackId]: { status }
          }
        }))
      },

      getSortedTrackIds: () => {
        const { tracks } = get()
        return Object.entries(tracks)
          .filter(([_, state]) => state.status === 'sorted')
          .map(([trackId]) => trackId)
      },

      getSortedTracksCount: () => {
        return get().getSortedTrackIds().length
      },

      clearAllTracks: () => {
        set({ tracks: {} })
      }
    }),
    {
      name: 'track-sorting-storage', // unique name for localStorage
      storage: createJSONStorage(() => {
        // Use localStorage only on the client side
        if (typeof window !== 'undefined') {
          return localStorage
        }
        // Return a mock storage for SSR
        return {
          getItem: () => null,
          setItem: () => { },
          removeItem: () => { }
        }
      }),
      // Only persist the tracks object
      partialize: (state) => ({ tracks: state.tracks }),
      // Skip hydration if in server environment to prevent hydration mismatches
      skipHydration: true
    }
  )
)
