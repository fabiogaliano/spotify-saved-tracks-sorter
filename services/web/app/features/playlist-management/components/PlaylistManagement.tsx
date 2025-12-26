import { useEffect, useState } from 'react';
import { RefreshCw, Sparkles } from 'lucide-react';
import { Playlist } from '~/lib/models/Playlist';
import PlaylistDetailsView from './content/PlaylistOverview';
import TracksList from './content/TracksList';
import PlaylistSelector from './sidebar/PlaylistSelector';
import { NotificationBanner } from './ui';
import ManagementToolbar from './toolbar/ManagementToolbar';
import PlaylistAnalysisModal from './modals/PlaylistAnalysisModal';
import { useFetcher } from 'react-router';
import { useJobSubscription } from '~/features/liked-songs-management/hooks/useJobSubscription';
import { useWebSocket } from '~/lib/hooks/useWebSocket';
import { jobSubscriptionManager } from '~/lib/services/JobSubscriptionManager';
import { Button } from '~/shared/components/ui/button';
import { toast } from 'sonner';

import { usePlaylistManagement } from '../hooks/usePlaylistManagement';
import { useNotifications } from '../hooks/useNotifications';
import { usePlaylistTracks } from '../hooks/usePlaylistTracks';
import { useSyncPlaylists } from '../hooks/useSyncPlaylists';
import { PlaylistUIProvider } from '../store/playlist-ui-store';
import { PlaylistTrackUI } from '../types';
import { prefetchPlaylistImages } from '../queries/playlist-image-queries';
import { useQueryClient } from '@tanstack/react-query';
import { useUpdatePlaylistInfo } from '../queries/playlist-queries';
import { apiRoutes } from '~/lib/config/routes';

type PlaylistManagementProps = {
  playlists: Playlist[]
}

const PlaylistManagementContent = ({ playlists }: PlaylistManagementProps) => {
  const [pendingSelection, setPendingSelection] = useState<string | null>(null);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<{ status: string; progress?: number } | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [hasExistingAnalysis, setHasExistingAnalysis] = useState(false);

  const analysisFetcher = useFetcher();
  const trackAnalysisFetcher = useFetcher();
  const queryClient = useQueryClient();
  const [isAnalyzingTracks, setIsAnalyzingTracks] = useState(false);

  // WebSocket connection
  const wsUrl = `ws://localhost:3001/ws`;
  const { isConnected: wsConnected, lastMessage: wsMessage, connect, disconnect } = useWebSocket(wsUrl, {
    autoConnect: false,
    debug: false,
  });

  // Connect WebSocket on mount
  useEffect(() => {
    const timer = setTimeout(() => connect(), 100);
    return () => {
      clearTimeout(timer);
      disconnect();
    };
  }, [connect, disconnect]);

  // Update job subscription manager when job changes
  useEffect(() => {
    if (currentJobId) {
      jobSubscriptionManager.setCurrentJob(currentJobId);
    } else {
      jobSubscriptionManager.setCurrentJob(null);
    }
  }, [currentJobId]);

  // Process WebSocket messages
  useEffect(() => {
    if (!wsMessage) return;

    // Route messages through subscription manager
    jobSubscriptionManager.processMessage(wsMessage);
  }, [wsMessage]);

  // Subscribe to job updates
  // For playlist analysis, we track job progress differently since it's a single item
  useJobSubscription((update) => {
    // Playlist analysis has a single "track" so we just track overall status
    if (currentJobId && update.trackId === Number(selectedPlaylist)) {
      const newStatus = {
        status: update.status === 'COMPLETED' ? 'completed' :
          update.status === 'FAILED' ? 'failed' :
            update.status === 'IN_PROGRESS' ? 'processing' : 'pending',
        progress: update.status === 'COMPLETED' ? 100 :
          update.status === 'IN_PROGRESS' ? 50 : 0
      };
      setJobStatus(newStatus);

      // If completed, fetch the analysis results
      if (update.status === 'COMPLETED') {
        // Small delay to ensure data is saved
        setTimeout(() => {
          fetch(apiRoutes.playlists.analysis(selectedPlaylist!))
            .then(res => res.json())
            .then((data: any) => {
              if (data.success && data.analysis) {
                setAnalysisData(data.analysis);
                setHasExistingAnalysis(true);

                // Always show success toast
                toast.success('Playlist analyzed successfully!', {
                  duration: 5000,
                  dismissible: true,
                });

                // If modal is already open (re-analysis), keep it open
                // The modal will automatically update with new data
              }
              setIsAnalyzing(false);
              setCurrentJobId(null);
            })
            .catch((error: any) => {
              toast.error('Failed to fetch analysis results');
              setIsAnalyzing(false);
              setCurrentJobId(null);
            });
        }, 500);
      } else if (update.status === 'FAILED') {
        toast.error('Playlist analysis failed');
        setIsAnalyzing(false);
        setCurrentJobId(null);
      }
    }
  }, !!currentJobId);

  const {
    selectedPlaylist,
    selectedTab,
    searchQuery,
    filteredPlaylists,
    currentPlaylist,
    updateSelectedPlaylist,
    updateSelectedTab,
    setSearchQuery
  } = usePlaylistManagement({ playlists });

  // Prefetch all playlist images when component mounts or playlists change
  useEffect(() => {
    const spotifyIds = filteredPlaylists.map(p => p.spotifyId);
    if (spotifyIds.length > 0) {
      // Use React Query's prefetching
      prefetchPlaylistImages(queryClient, spotifyIds).catch(err => {
        console.warn('Failed to prefetch some playlist images:', err);
      });
    }
  }, [filteredPlaylists, queryClient]);

  // Handle selection of newly created playlist
  useEffect(() => {
    if (pendingSelection && filteredPlaylists.length > 0) {
      const newPlaylist = filteredPlaylists.find(p => p.spotifyId === pendingSelection);
      if (newPlaylist) {
        updateSelectedPlaylist(newPlaylist.id);
        setPendingSelection(null);
      }
    }
  }, [pendingSelection, filteredPlaylists, updateSelectedPlaylist]);

  const handlePlaylistCreated = (playlistSpotifyId: string) => {
    // First switch to AI-Enabled tab
    updateSelectedTab('is_flagged');

    // Then set pending selection - useEffect will handle it when data is ready
    setPendingSelection(playlistSpotifyId);
  };

  const { notification, showSuccess, showInfo, showError } = useNotifications();
  const { isSyncing } = useSyncPlaylists();

  const {
    tracks: rawPlaylistTracks,
    isLoading: isLoadingTracks,
    formatTrackData
  } = usePlaylistTracks(selectedPlaylist);

  const playlistTracks: PlaylistTrackUI[] = rawPlaylistTracks.map(formatTrackData);

  const updatePlaylistInfoMutation = useUpdatePlaylistInfo();

  const handleEditInfo = (name: string, description: string) => {
    if (!selectedPlaylist) return;

    updatePlaylistInfoMutation.mutate({
      playlistId: selectedPlaylist,
      description: description,
      name: name
    });
  };

  const handleToggleSmartSorting = (enabled: boolean) => {
    if (!selectedPlaylist) return;

    // Get current playlist to access its name and description
    const currentPlaylist = playlists?.find(p => p.id.toString() === selectedPlaylist);
    if (!currentPlaylist) return;

    updatePlaylistInfoMutation.mutate({
      playlistId: selectedPlaylist,
      name: currentPlaylist.name,
      description: currentPlaylist.description || '',
      smartSortingEnabled: enabled
    });
  };

  const handleRescanPlaylist = () => {
    showInfo('Rescanning playlist tracks...');
  };

  const handleAnalyzePlaylistTracks = () => {
    if (!rawPlaylistTracks || rawPlaylistTracks.length === 0) {
      toast.info('No tracks to analyze');
      return;
    }

    setIsAnalyzingTracks(true);

    // Format tracks for the API using raw data (has id, name, artist, spotify_track_id)
    const tracksForAnalysis = rawPlaylistTracks.map((t: any) => ({
      id: t.id,
      spotifyTrackId: t.spotify_track_id,
      artist: t.artist,
      name: t.name
    }));

    trackAnalysisFetcher.submit(
      { tracks: tracksForAnalysis, batchSize: 5 },
      {
        method: 'post',
        action: '/actions/track-analysis',
        encType: 'application/json'
      }
    );
  };

  const handleAnalyzePlaylist = () => {
    if (!selectedPlaylist) return;

    // Don't show modal when starting analysis
    setIsAnalyzing(true);
    // Don't clear analysis data if modal is open (re-analyzing)
    if (!showAnalysisModal) {
      setAnalysisData(null);
    }

    // Submit analysis job to queue
    analysisFetcher.submit(
      { playlistId: selectedPlaylist },
      { method: 'post', action: '/actions/playlist-analysis' }
    );
  };

  const handleViewAnalysis = async () => {
    if (!selectedPlaylist) return;

    setShowAnalysisModal(true);

    // Don't set isAnalyzing for viewing, only for actual analysis
    if (analysisData) {
      // Analysis already loaded, just show modal
      return;
    }

    try {
      const response = await fetch(apiRoutes.playlists.analysis(selectedPlaylist));
      const data = await response.json();

      if (data.success && data.analysis) {
        setAnalysisData(data.analysis);
      } else {
        setShowAnalysisModal(false);
        showInfo('No analysis found for this playlist');
      }
    } catch (error) {
      setShowAnalysisModal(false);
      showInfo('Failed to load analysis');
    }
  };

  const handleReanalyze = () => {
    // Re-analyze from within the modal
    handleAnalyzePlaylist();
  };

  // Handle analysis fetcher response
  useEffect(() => {
    if (analysisFetcher.data && analysisFetcher.state === 'idle') {
      const data = analysisFetcher.data as any;
      if (data.success && data.batchId) {
        setCurrentJobId(data.batchId);
        setJobId(data.batchId);
        // Show toast notification instead of banner
        toast.info('Playlist analysis started...', {
          duration: 5000,
          dismissible: true,
        });
      } else {
        toast.error(data.error || 'Failed to start analysis');
        setIsAnalyzing(false);
      }
    }
  }, [analysisFetcher.data, analysisFetcher.state]);


  // Handle track analysis fetcher response
  useEffect(() => {
    if (trackAnalysisFetcher.data && trackAnalysisFetcher.state === 'idle') {
      const data = trackAnalysisFetcher.data as any;
      if (data.success && data.batchId) {
        // Set the job ID so we can receive WebSocket notifications
        setCurrentJobId(data.batchId);
        toast.info(`Analyzing ${data.totalQueued || 'tracks'}...`, {
          duration: 5000,
          dismissible: true,
        });
      } else if (data.success) {
        toast.success(`${data.message || 'Tracks queued for analysis'}`);
        setIsAnalyzingTracks(false);
      } else {
        toast.error(data.error || 'Failed to start track analysis');
        setIsAnalyzingTracks(false);
      }
    }
  }, [trackAnalysisFetcher.data, trackAnalysisFetcher.state]);

  // Check for existing analysis when playlist changes (only for AI-enabled playlists)
  useEffect(() => {
    if (selectedPlaylist && currentPlaylist?.smartSortingEnabled) {
      fetch(apiRoutes.playlists.analysis(selectedPlaylist))
        .then(res => res.json())
        .then(data => {
          setHasExistingAnalysis(data.success && data.analysis);
        })
        .catch(() => {
          setHasExistingAnalysis(false);
        });
    } else {
      // Not an AI-enabled playlist, so no analysis exists
      setHasExistingAnalysis(false);
    }
  }, [selectedPlaylist, currentPlaylist?.smartSortingEnabled]);

  return (
    <div className="h-full flex flex-col">
      <div className="mb-6">
        <ManagementToolbar
          isSyncing={isSyncing}
          onPlaylistCreated={handlePlaylistCreated}
        />
      </div>

      {notification && (
        <div className="mb-4">
          <NotificationBanner type={notification.type} message={notification.message} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
        <PlaylistSelector
          filteredPlaylists={filteredPlaylists}
          selectedPlaylist={selectedPlaylist}
          selectedTab={selectedTab}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onTabChange={updateSelectedTab}
          onSelectPlaylist={updateSelectedPlaylist}
        />

        <div className="lg:col-span-9 flex flex-col gap-6 min-h-0 overflow-hidden">
          {currentPlaylist && (
            <>
              <PlaylistDetailsView
                currentPlaylist={currentPlaylist}
                hasAnalysis={hasExistingAnalysis}
                isAnalyzing={isAnalyzing}
                onToggleSmartSorting={handleToggleSmartSorting}
                onViewAnalysis={handleViewAnalysis}
                onAnalyzePlaylist={handleAnalyzePlaylist}
                onEditInfo={handleEditInfo}
              />
              <TracksList
                currentPlaylist={currentPlaylist}
                playlistTracks={playlistTracks}
                isLoading={isLoadingTracks}
                rescanAction={
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRescanPlaylist}
                    >
                      <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                      Rescan Playlist
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAnalyzePlaylistTracks}
                      disabled={isAnalyzingTracks || !rawPlaylistTracks?.length}
                    >
                      <Sparkles className={`h-3.5 w-3.5 mr-1.5 ${isAnalyzingTracks ? 'animate-pulse' : ''}`} />
                      {isAnalyzingTracks ? 'Analyzing...' : `Analyze Tracks (${rawPlaylistTracks?.length || 0})`}
                    </Button>
                  </div>
                }
              />
            </>
          )}
        </div>
      </div>

      {currentPlaylist && (
        <PlaylistAnalysisModal
          open={showAnalysisModal}
          onOpenChange={setShowAnalysisModal}
          playlistName={currentPlaylist.name}
          analysis={analysisData}
          isLoading={isAnalyzing}
          jobStatus={jobStatus}
          onReanalyze={handleReanalyze}
        />
      )}
    </div>
  );
};

const PlaylistManagement = ({ playlists }: PlaylistManagementProps) => {
  return (
    <PlaylistUIProvider>
      <PlaylistManagementContent playlists={playlists} />
    </PlaylistUIProvider>
  );
};

export default PlaylistManagement;