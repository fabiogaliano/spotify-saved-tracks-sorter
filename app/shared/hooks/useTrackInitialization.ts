import { useEffect } from 'react'
import type { SavedTrackRow, SavedTrackStore } from '~/lib/models/Track'
import { useTracksStore } from '~/lib/stores/tracksStore'

interface UseTrackInitializationParams {
  savedTracks: SavedTrackRow[] | null
}

export function useTrackInitialization({ savedTracks }: UseTrackInitializationParams) {
  const setTracks = useTracksStore(state => state.setTracks)

  useEffect(() => {
    if (typeof window === 'undefined') return

    if (savedTracks && savedTracks.length > 0) {
      const trackObjects: SavedTrackStore[] = savedTracks.map(
        (savedTrack: SavedTrackRow) => ({
          id: savedTrack.track.id,
          spotify_track_id: savedTrack.track.spotify_track_id,
          name: savedTrack.track.name,
          artist: savedTrack.track.artist,
          album: savedTrack.track.album,
          liked_at: savedTrack.liked_at,
          sorting_status: savedTrack.sorting_status || 'unsorted',
        })
      )
      setTracks(trackObjects)
    }
  }, [savedTracks, setTracks])
} 