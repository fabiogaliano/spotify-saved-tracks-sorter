import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { SavedTrackStore } from '~/lib/models/Track'

interface TracksState {
  tracks: SavedTrackStore[]
  isLoaded: boolean

  setTracks: (tracks: SavedTrackStore[]) => void
  getTrackById: (id: number) => SavedTrackStore | undefined
  getTrackBySpotifyId: (spotifyId: string) => SavedTrackStore | undefined
  addTrack: (track: SavedTrackStore) => void
  updateTrack: (track: SavedTrackStore) => void
  clearTracks: () => void
  setLoaded: (loaded: boolean) => void
}

// Using the curried version of create to handle middleware properly
const useTracksStore = create<TracksState>()(
  persist(
    (set, get) => ({
      tracks: [],
      isLoaded: false,

      setTracks: (tracks: SavedTrackStore[]) => {
        set({ tracks, isLoaded: true })
      },

      getTrackById: (id: number) => {
        return get().tracks.find(track => track.id === id)
      },

      getTrackBySpotifyId: (spotifyId: string) => {
        return get().tracks.find(track => track.spotify_track_id === spotifyId)
      },

      addTrack: (track: SavedTrackStore) => {
        set((state) => ({
          tracks: [...state.tracks, track]
        }))
      },

      updateTrack: (track: SavedTrackStore) => {
        set((state) => ({
          tracks: state.tracks.map(t =>
            t.id === track.id ? track : t
          )
        }))
      },

      clearTracks: () => {
        set({ tracks: [], isLoaded: false })
      },

      setLoaded: (loaded: boolean) => {
        set({ isLoaded: loaded })
      }
    }),
    {
      name: 'tracks-storage',
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
      partialize: (state) => ({
        tracks: state.tracks,
        isLoaded: state.isLoaded
      }),
      // Skip hydration if in server environment to prevent hydration mismatches
      skipHydration: true
    }
  )
)

export { useTracksStore }
