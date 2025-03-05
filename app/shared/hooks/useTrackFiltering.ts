import type { SavedTrackRow } from '~/lib/models/Track'
import type { Track as TrackTableItem } from '~/shared/components/tracks/types'

interface UseTrackFilteringParams {
  savedTracks: SavedTrackRow[] | null
  showStatus: 'all' | 'unsorted' | 'sorted' | 'ignored'
  userId?: number
}

export function useTrackFiltering({ savedTracks, showStatus, userId }: UseTrackFilteringParams) {
  const filterTracks = (): TrackTableItem[] => {
    if (!savedTracks) return []

    return savedTracks
      .filter(
        (track: SavedTrackRow) =>
          showStatus === 'all' || track.sorting_status === showStatus
      )
      .map(
        (track: SavedTrackRow): TrackTableItem => ({
          id: track.track.spotify_track_id,
          name: track.track.name,
          artist: track.track.artist,
          album: track.track.album || '',
          likedAt: track.liked_at,
          sortingStatus: track.sorting_status || 'unsorted',
          userId,
        })
      )
  }

  return { filteredTracks: filterTracks() }
} 