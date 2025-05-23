import { useState, useEffect } from 'react';
import { useLikedSongs } from '../context';

/**
 * Custom hook to manage analysis data fetching and state
 */
export function useAnalysisData(trackId: number | null) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { updateSongAnalysisDetails } = useLikedSongs();

  // Fetch analysis data when trackId changes
  useEffect(() => {
    // Reset states when trackId changes
    setIsLoading(false);
    setError(null);
    
    // Don't fetch if no trackId is provided
    if (!trackId) return;
    
    const fetchAnalysisData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/analysis/${trackId}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch analysis data: ${response.statusText}`);
        }
        
        const analysisData = await response.json();
        // Update the context with the full analysis data
        updateSongAnalysisDetails(trackId, analysisData, 'analyzed');
        setIsLoading(false);
      } catch (err) {
        console.error(`Error fetching analysis for track ${trackId}:`, err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
        setIsLoading(false);
      }
    };
    
    fetchAnalysisData();
  }, [trackId, updateSongAnalysisDetails]);

  return { isLoading, error };
}
