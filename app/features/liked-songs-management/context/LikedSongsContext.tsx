import React, { createContext, useState, useContext, useCallback, ReactNode } from 'react';
import { TrackWithAnalysis } from '~/lib/models/Track';
import { useSubmit } from 'react-router';
import { AnalysisJob } from '~/lib/services/analysis/AnalysisJobService';

interface LikedSongsContextType {
  likedSongs: TrackWithAnalysis[];
  setLikedSongs: (songs: TrackWithAnalysis[]) => void;
  rowSelection: Record<string, boolean>;
  setRowSelection: (value: Record<string, boolean>) => void;
  selectedTracks: () => TrackWithAnalysis[];
  analyzeSelectedTracks: () => void;
  analyzeTracks: (options: { trackId?: number, useSelected?: boolean, useAll?: boolean }) => void;
  currentJob: AnalysisJob | null;
  setCurrentJob: (job: AnalysisJob | null) => void;
  isAnalyzing: boolean;
}

// Create the context with default values
const LikedSongsContext = createContext<LikedSongsContextType>({
  likedSongs: [],
  setLikedSongs: () => { },
  rowSelection: {},
  setRowSelection: () => { },
  selectedTracks: () => [],
  analyzeSelectedTracks: () => { },
  analyzeTracks: () => { },
  currentJob: null,
  setCurrentJob: () => { },
  isAnalyzing: false,
});

interface LikedSongsProviderProps {
  children: ReactNode;
  initialSongs?: TrackWithAnalysis[];
}

export const LikedSongsProvider: React.FC<LikedSongsProviderProps> = ({
  children,
  initialSongs = [],
}) => {
  const [likedSongs, setLikedSongs] = useState<TrackWithAnalysis[]>(initialSongs);
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [currentJob, setCurrentJob] = useState<AnalysisJob | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const submit = useSubmit();

  // Derive selected tracks from row selection
  const selectedTracks = useCallback(() => {
    return Object.keys(rowSelection).map(key => {
      const index = parseInt(key, 10);
      return likedSongs[index];
    });
  }, [likedSongs, rowSelection]);

  // Function to analyze tracks - can handle individual, selected, or all tracks
  const analyzeTracks = useCallback((options: { trackId?: string, useSelected?: boolean, useAll?: boolean } = {}) => {
    let trackIds: string[] = [];

    // Single track analysis
    if (options.trackId) {
      trackIds = [options.trackId];
    }
    // Selected tracks analysis
    else if (options.useSelected) {
      trackIds = selectedTracks().map(track => track.track.id);
      if (trackIds.length === 0) {
        console.warn('No tracks selected for analysis');
        return;
      }
    }
    // All tracks analysis
    else if (options.useAll) {
      trackIds = likedSongs.map(song => song.track.id);
      if (trackIds.length === 0) {
        console.warn('No tracks available for analysis');
        return;
      }
    }

    if (trackIds.length === 0) {
      console.warn('No tracks specified for analysis');
      return;
    }

    setIsAnalyzing(true);

    // Use fetch to send a JSON request instead of form data
    fetch('/actions/analyze-liked-songs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ trackIds }),
    })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          console.log('Analysis job created successfully, ID:', data.jobId);
          // Set the job ID to trigger polling and status updates
          setCurrentJob({ id: data.jobId, status: 'pending', tracksProcessed: 0, trackCount: trackIds.length, tracksSucceeded: 0, tracksFailed: 0 });
        } else {
          console.error('Error creating analysis job:', data.error);
          setIsAnalyzing(false);
        }
      })
      .catch(error => {
        console.error('Error submitting analysis request:', error);
        setIsAnalyzing(false);
      });
  }, [selectedTracks, submit, likedSongs]);

  // Legacy method for backward compatibility
  const analyzeSelectedTracks = useCallback(() => {
    analyzeTracks({ useSelected: true });
  }, [analyzeTracks]);

  const value = {
    likedSongs,
    setLikedSongs,
    rowSelection,
    setRowSelection,
    selectedTracks,
    analyzeSelectedTracks,
    analyzeTracks,
    currentJob,
    setCurrentJob,
    isAnalyzing,
  };

  return (
    <LikedSongsContext.Provider value={value}>
      {children}
    </LikedSongsContext.Provider>
  );
};

// Custom hook to use the context
export const useLikedSongs = () => {
  const context = useContext(LikedSongsContext);

  if (context === undefined) {
    throw new Error('useLikedSongs must be used within a LikedSongsProvider');
  }

  return context;
};
