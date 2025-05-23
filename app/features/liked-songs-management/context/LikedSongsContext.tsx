import React, { createContext, useState, useContext, useCallback, ReactNode, useEffect, useRef } from 'react';
import { TrackWithAnalysis, UIAnalysisStatus, TrackAnalysis } from '~/lib/models/Track';
import { useWebSocket } from '~/lib/hooks/useWebSocket';
import { jobSubscriptionManager, JobStatusUpdate } from '~/lib/services/JobSubscriptionManager';

// Define AnalysisJob type for batch job tracking
export interface AnalysisJob {
  id: string; // The batch job ID
  status: 'pending' | 'in_progress' | 'completed' | 'failed'; // Batch job status
  trackCount: number;
  trackStates: Map<number, 'queued' | 'in_progress' | 'completed' | 'failed'>; // Per-track status
  startedAt?: Date; // When the job started
  // Database-persisted stats - always present
  dbStats: {
    tracksProcessed: number;
    tracksSucceeded: number;
    tracksFailed: number;
  };
}

interface LikedSongsContextType {
  // State
  likedSongs: TrackWithAnalysis[];
  setLikedSongs: (songs: TrackWithAnalysis[]) => void;
  rowSelection: Record<string, boolean>;
  setRowSelection: (value: Record<string, boolean> | ((prev: Record<string, boolean>) => Record<string, boolean>)) => void;
  selectedTracks: () => TrackWithAnalysis[];

  // Analysis operations
  analyzeSelectedTracks: () => Promise<void>;
  analyzeTracks: (options: { trackId?: number, useSelected?: boolean, useAll?: boolean }) => Promise<void>;

  // Job tracking
  currentJob: AnalysisJob | null;
  isAnalyzing: boolean;

  // Computed properties from job state
  tracksProcessed: number;
  tracksSucceeded: number;
  tracksFailed: number;

  // Track status updates
  updateSongAnalysisDetails: (trackId: number, analysisData: TrackAnalysis | null, status: UIAnalysisStatus) => void;

  // WebSocket status
  isWebSocketConnected: boolean;
  webSocketLastMessage: any;
}

const LikedSongsContext = createContext<LikedSongsContextType>({
  // State
  likedSongs: [],
  setLikedSongs: () => { },
  rowSelection: {},
  setRowSelection: () => { },
  selectedTracks: () => [],

  // Analysis operations
  analyzeSelectedTracks: () => Promise.resolve(),
  analyzeTracks: () => Promise.resolve(),

  // Job tracking
  currentJob: null,
  isAnalyzing: false,

  // Computed properties
  tracksProcessed: 0,
  tracksSucceeded: 0,
  tracksFailed: 0,

  // Track status updates
  updateSongAnalysisDetails: () => { },

  // WebSocket status
  isWebSocketConnected: false,
  webSocketLastMessage: null,
});

interface LikedSongsProviderProps {
  children: ReactNode;
  initialSongs?: TrackWithAnalysis[];
  userId?: number;
}

export const LikedSongsProvider: React.FC<LikedSongsProviderProps> = ({
  children,
  initialSongs = [],
  userId,
}) => {
  // State management
  const [likedSongs, setLikedSongs] = useState<TrackWithAnalysis[]>(initialSongs);
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [currentJob, setCurrentJob] = useState<AnalysisJob | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Track if we've already initialized to prevent duplicate initialization
  const initializedRef = useRef(false);
  const jobRecoveryRef = useRef(false);

  // WebSocket connection
  const WEBSOCKET_URL = 'ws://localhost:3001/ws';
  const {
    isConnected: isWebSocketConnected,
    lastMessage: webSocketLastMessage,
    subscribeToTrack,
    connect: connectWebSocket,
    disconnect: disconnectWebSocket
  } = useWebSocket(WEBSOCKET_URL, { autoConnect: false });

  // Helper function to get computed values from job state
  const getJobCounts = useCallback((job: AnalysisJob | null) => {
    if (!job) {
      // Return zeros when no job - no persistent state
      return { processed: 0, succeeded: 0, failed: 0 };
    }

    // Always use database stats - all jobs have dbStats
    return {
      processed: job.dbStats.tracksProcessed,
      succeeded: job.dbStats.tracksSucceeded,
      failed: job.dbStats.tracksFailed
    };
  }, []);

  // Update a single song's analysis details
  const updateSongAnalysisDetails = useCallback((trackId: number, analysisData: TrackAnalysis | null, status: UIAnalysisStatus) => {
    setLikedSongs(prevSongs =>
      prevSongs.map(song =>
        song.track.id === trackId
          ? { ...song, analysis: analysisData, uiAnalysisStatus: status }
          : song
      )
    );
  }, [setLikedSongs]);

  // Effect to initialize songs with proper status from server
  useEffect(() => {
    if (initialSongs && initialSongs.length > 0 && !initializedRef.current) {
      // Songs now come with proper uiAnalysisStatus from the server
      // This includes 'failed' status for tracks that failed analysis
      console.log('Initializing songs with status:', initialSongs.slice(0, 5).map(s => ({ id: s.track.id, status: s.uiAnalysisStatus })));
      setLikedSongs(initialSongs);
      initializedRef.current = true;
    }
    // We only want to run this when initialSongs array itself changes, not on every render of setLikedSongs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSongs]);

  // Effect to recover active jobs when user loads the app
  useEffect(() => {
    const recoverActiveJob = async () => {
      if (!userId || jobRecoveryRef.current) return;

      try {
        console.log('Checking for active jobs for user:', userId);
        jobRecoveryRef.current = true;

        const response = await fetch(`/api/analysis/active-job?userId=${userId}`);

        if (response.ok) {
          const activeJob = await response.json();
          if (activeJob && activeJob.id) {
            console.log('Found active job to resume:', activeJob);

            // Convert trackStates from object back to Map (JSON serialization converts Maps to objects)
            console.log('Raw trackStates from server:', activeJob.trackStates);
            const trackStatesMap = new Map(
              Object.entries(activeJob.trackStates || {}).map(([key, value]) => [parseInt(key, 10), value])
            );
            console.log('Converted trackStates Map:', Array.from(trackStatesMap.entries()));

            const recoveredJob: AnalysisJob = {
              ...activeJob,
              trackStates: trackStatesMap,
              startedAt: new Date(activeJob.startedAt),
              dbStats: activeJob.dbStats // Always present from proper recovery
            };

            // Ensure job recovery is atomic - set job and update subscription manager together
            console.log('Setting recovered job atomically');
            setCurrentJob(recoveredJob);
            jobSubscriptionManager.setCurrentJob(recoveredJob.id);

            // Update UI track states to match the recovered job states
            console.log('Updating track states for recovered job. TrackStates Map size:', trackStatesMap.size);
            setLikedSongs(prevSongs =>
              prevSongs.map(song => {
                const trackJobState = trackStatesMap.get(song.track.id);
                if (trackJobState !== undefined) {
                  // Map job states to UI states
                  let uiStatus: UIAnalysisStatus;
                  switch (trackJobState) {
                    case 'queued':
                    case 'in_progress':
                      uiStatus = 'pending';
                      break;
                    case 'completed':
                      uiStatus = 'analyzed';
                      break;
                    case 'failed':
                      uiStatus = 'failed';
                      break;
                    default:
                      uiStatus = song.uiAnalysisStatus; // Keep existing status
                  }
                  console.log(`Track ${song.track.id}: ${trackJobState} → ${uiStatus}`);
                  return { ...song, uiAnalysisStatus: uiStatus };
                }
                return song;
              })
            );

            console.log('Job recovery completed successfully');
          } else {
            console.log('No active jobs found for user');
          }
        }

        // Reset recovery flag after successful completion (whether job found or not)
        jobRecoveryRef.current = false;
      } catch (error) {
        console.error('Error recovering active job:', error);
        // Reset recovery flag on error to allow retry
        jobRecoveryRef.current = false;
      }
    };

    recoverActiveJob();
  }, [userId]);

  // WebSocket connection management based on job status
  useEffect(() => {
    if (!currentJob) {
      // No job active, ensure WebSocket is disconnected
      if (isWebSocketConnected) {
        console.log('No active job, disconnecting from WebSocket');
        disconnectWebSocket();
      }
      return;
    }

    // Connect to WebSocket when a job starts, but only if we're not already connected
    if ((currentJob.status === 'pending' || currentJob.status === 'in_progress') && !isWebSocketConnected) {
      console.log('Job active, connecting to WebSocket');
      connectWebSocket();
    }
    // For completed jobs, keep WebSocket connected until job is cleared
    // The job will be cleared when a new job starts or manually cleared
  }, [currentJob?.status, isWebSocketConnected, connectWebSocket, disconnectWebSocket, currentJob?.id]);

  // Handle WebSocket messages for job status updates
  useEffect(() => {
    const handleJobStatusUpdate = (update: JobStatusUpdate) => {
      const { trackId, status } = update;

      if (!trackId) {
        console.warn('Received job status update without trackId');
        return;
      }

      console.log(`Job status update for track ${trackId}: ${status}`);

      // Map the worker status to UI status
      let uiStatus: UIAnalysisStatus = 'not_analyzed';
      let trackJobStatus: 'queued' | 'in_progress' | 'completed' | 'failed' = 'queued';

      switch (status) {
        case 'QUEUED':
          uiStatus = 'pending';
          trackJobStatus = 'queued';
          break;
        case 'IN_PROGRESS':
          uiStatus = 'pending';
          trackJobStatus = 'in_progress';
          break;
        case 'COMPLETED':
          uiStatus = 'analyzed';
          trackJobStatus = 'completed';
          break;
        case 'FAILED':
        case 'SKIPPED':
          uiStatus = 'failed';
          trackJobStatus = 'failed';
          break;
        default:
          return; // Unknown status, ignore
      }

      // Update the track status in the UI
      updateSongAnalysisDetails(trackId, null, uiStatus);

      // Update job status if this track is part of the current job
      if (currentJob?.trackStates.has(trackId)) {
        // Update both trackStates and dbStats atomically
        setCurrentJob(prevJob => {
          if (!prevJob || !prevJob.trackStates.has(trackId)) return prevJob;

          const newTrackStates = new Map(prevJob.trackStates);
          newTrackStates.set(trackId, trackJobStatus);

          let newDbStats = { ...prevJob.dbStats };

          // Update dbStats when tracks complete or fail
          if (trackJobStatus === 'completed' || trackJobStatus === 'failed') {
            // Only increment if this track wasn't already processed
            const prevStatus = prevJob.trackStates.get(trackId);
            if (prevStatus !== 'completed' && prevStatus !== 'failed') {
              newDbStats.tracksProcessed = newDbStats.tracksProcessed + 1;

              if (trackJobStatus === 'completed') {
                newDbStats.tracksSucceeded = newDbStats.tracksSucceeded + 1;
              } else {
                newDbStats.tracksFailed = newDbStats.tracksFailed + 1;
              }
            }
          }

          // Calculate if job is complete
          const allProcessed = Array.from(newTrackStates.values()).every(s => s === 'completed' || s === 'failed');

          return {
            ...prevJob,
            trackStates: newTrackStates,
            dbStats: newDbStats,
            status: allProcessed ? 'completed' : 'in_progress'
          };
        });
      }
    };

    // Subscribe to job updates through the subscription manager
    const unsubscribe = jobSubscriptionManager.subscribe(handleJobStatusUpdate);

    return unsubscribe;
  }, [currentJob, updateSongAnalysisDetails]);

  // Route WebSocket messages through the subscription manager
  useEffect(() => {
    if (webSocketLastMessage) {
      jobSubscriptionManager.processMessage(webSocketLastMessage);
    }
  }, [webSocketLastMessage]);

  // Update subscription manager and WebSocket subscriptions when job changes
  useEffect(() => {
    if (currentJob) {
      console.log(`Setting JobSubscriptionManager to job ${currentJob.id}`);
      jobSubscriptionManager.setCurrentJob(currentJob.id);

      // Subscribe to all track IDs in the job via WebSocket
      // Only subscribe if WebSocket is connected
      if (isWebSocketConnected) {
        for (const trackId of Array.from(currentJob.trackStates.keys())) {
          console.log(`Subscribing to track ${trackId}`);
          subscribeToTrack(String(trackId));
        }
      }
    } else {
      console.log('Clearing JobSubscriptionManager job');
      jobSubscriptionManager.setCurrentJob(null);
    }
  }, [currentJob?.id, isWebSocketConnected, subscribeToTrack]);

  // Derive selected tracks from row selection
  const selectedTracks = useCallback(() => {
    return Object.keys(rowSelection).map(key => {
      const index = parseInt(key, 10);
      return likedSongs[index];
    });
  }, [likedSongs, rowSelection]);

  // Function to analyze tracks - can handle individual, selected, or all tracks
  const analyzeTracks = useCallback((options: { trackId?: number, useSelected?: boolean, useAll?: boolean } = {}) => {
    let tracksToAnalyze: TrackWithAnalysis[] = [];

    if (options.trackId) {
      const singleTrack = likedSongs.find(song => song.track.id === options.trackId);
      if (singleTrack) {
        tracksToAnalyze = [singleTrack];
      }
    }
    // Selected tracks analysis
    else if (options.useSelected) {
      tracksToAnalyze = selectedTracks();
      if (tracksToAnalyze.length === 0) {
        console.warn('No tracks selected for analysis');
        return Promise.resolve();
      }
    }
    // All tracks analysis
    else if (options.useAll) {
      tracksToAnalyze = likedSongs;
      if (tracksToAnalyze.length === 0) {
        console.warn('No tracks available for analysis');
        return Promise.resolve();
      }
    }

    if (tracksToAnalyze.length === 0) {
      console.warn('No tracks specified for analysis');
      return Promise.resolve();
    }

    // Filter out tracks that have already been analyzed or failed
    const tracksNeedingAnalysis = tracksToAnalyze.filter(track =>
      track.uiAnalysisStatus !== 'analyzed' &&
      track.uiAnalysisStatus !== 'pending' &&
      track.uiAnalysisStatus !== 'failed'
    );

    console.log(`Filtered ${tracksToAnalyze.length} tracks → ${tracksNeedingAnalysis.length} need analysis`);

    if (tracksNeedingAnalysis.length === 0) {
      console.warn('All specified tracks are already analyzed or in progress');
      return Promise.resolve();
    }

    // Prevent multiple concurrent analysis requests
    if (isAnalyzing) {
      console.warn('Analysis already in progress, ignoring additional request');
      return Promise.resolve();
    }

    // Prevent new job creation while recovery is in progress
    if (jobRecoveryRef.current) {
      console.warn('Job recovery in progress, cannot start new analysis');
      return Promise.resolve();
    }

    setIsAnalyzing(true);

    const mappedTracksForApi = tracksNeedingAnalysis.map(twa => ({
      id: twa.track.id,
      spotifyTrackId: twa.track.spotify_track_id,
      artist: twa.track.artist,
      name: twa.track.name,
    }));

    const trackIdsBeingProcessed = tracksNeedingAnalysis.map(t => t.track.id);

    // Update songs to 'pending' status immediately
    setLikedSongs(prevSongs =>
      prevSongs.map(song =>
        trackIdsBeingProcessed.includes(song.track.id)
          ? { ...song, uiAnalysisStatus: 'pending' as UIAnalysisStatus }
          : song
      )
    );

    setIsAnalyzing(true);

    // Use fetch to send a JSON request instead of form data
    return fetch('/actions/analyze-liked-songs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tracks: mappedTracksForApi }),
    })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          console.log('Analysis submission successful:', data.message);

          // Create track states map - all start as 'queued'
          const trackStates = new Map<number, 'queued' | 'in_progress' | 'completed' | 'failed'>();
          trackIdsBeingProcessed.forEach(trackId => {
            trackStates.set(trackId, 'queued');
          });

          // Create new job with proper state
          const newJob: AnalysisJob = {
            id: data.batchId || crypto.randomUUID(),
            status: 'pending',
            trackCount: tracksNeedingAnalysis.length,
            trackStates,
            startedAt: new Date(),
            dbStats: {
              tracksProcessed: 0,
              tracksSucceeded: 0,
              tracksFailed: 0
            }
          };

          console.log(`Creating new job with ID: ${newJob.id}, track count: ${newJob.trackCount}, tracks: [${trackIdsBeingProcessed.join(', ')}]`);

          // Atomic job transition - clear old job and set new job simultaneously
          // This prevents UI state gaps where no job exists
          if (currentJob) {
            console.log(`Clearing previous job ${currentJob.id} before setting new job ${newJob.id}`);
          }
          jobSubscriptionManager.setCurrentJob(newJob.id);
          setCurrentJob(newJob);
          setIsAnalyzing(false);

          if (data.errors && data.errors.length > 0) {
            console.warn('Some tracks failed to enqueue:', data.errors);
          }
        } else {
          console.error('Error submitting analysis job:', data.error, data.details);
          setIsAnalyzing(false);
        }
      })
      .catch(error => {
        console.error('Error submitting analysis request:', error);
        setIsAnalyzing(false);
      });
  }, [selectedTracks, likedSongs, setLikedSongs]);

  // Legacy method for backward compatibility
  const analyzeSelectedTracks = useCallback(() => {
    return analyzeTracks({ useSelected: true });
  }, [analyzeTracks]);



  // Compute derived values from current job
  const counts = getJobCounts(currentJob);

  const value = {
    // State
    rowSelection,
    setRowSelection,
    likedSongs,
    setLikedSongs,
    selectedTracks,

    // Analysis operations
    analyzeSelectedTracks,
    analyzeTracks,

    // Job tracking
    currentJob,
    isAnalyzing,

    // Computed properties
    tracksProcessed: counts.processed,
    tracksSucceeded: counts.succeeded,
    tracksFailed: counts.failed,

    // Track status updates
    updateSongAnalysisDetails,

    // WebSocket status
    isWebSocketConnected,
    webSocketLastMessage,
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
