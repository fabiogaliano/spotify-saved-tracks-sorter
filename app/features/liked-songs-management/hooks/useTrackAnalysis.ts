import { useCallback } from 'react';
import { useLikedSongs } from '../context';

/**
 * Custom hook to handle track analysis operations
 * Encapsulates all analysis-related logic in one place
 */
export function useTrackAnalysis() {
  const { analyzeTracks } = useLikedSongs();

  // Handle analysis of a single track
  const analyzeTrack = useCallback(
    async (trackId: number) => {
      try {
        await analyzeTracks({ trackId });
        // The context will automatically start polling for status updates
      } catch (error) {
        console.error('Error analyzing track:', error);
      }
    },
    [analyzeTracks]
  );

  // Handle analysis of selected tracks
  const analyzeSelectedTracks = useCallback(
    () => {
      analyzeTracks({ useSelected: true });
      // The context will automatically start polling for status updates
    },
    [analyzeTracks]
  );

  // Handle analysis of all tracks
  const analyzeAllTracks = useCallback(
    () => {
      analyzeTracks({ useAll: true });
      // The context will automatically start polling for status updates
    },
    [analyzeTracks]
  );

  return {
    analyzeTrack,
    analyzeSelectedTracks,
    analyzeAllTracks
  };
}
