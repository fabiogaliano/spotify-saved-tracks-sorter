import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Playlist } from '~/lib/models/Playlist';
import PlaylistHeader from './content/PlaylistHeader';
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
import { mapPlaylistToUIFormat } from '../utils';

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
          fetch(`/api/playlist-analysis/${selectedPlaylist}`)
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

  const { notification, showSuccess, showInfo } = useNotifications();
  const { isSyncing } = useSyncPlaylists();
  
  // Use cleaned up tracks hook
  const { 
    tracks: rawPlaylistTracks, 
    isLoading: isLoadingTracks,
    formatTrackData
  } = usePlaylistTracks(selectedPlaylist);

  // Format track data using the hook's formatter
  const playlistTracks: PlaylistTrackUI[] = rawPlaylistTracks.map(formatTrackData);

  const handleEditDescription = () => {
    showSuccess('AI flag saved successfully!');
  };

  const handleEnableAI = (enabled: boolean) => {
    showSuccess(
      enabled
        ? 'AI sorting enabled for this playlist'
        : 'AI sorting disabled for this playlist',
      false
    );
    // TODO: Update playlist data - count chars available for description 
    // block api call if new description is too long
  };

  const handleRescanPlaylist = () => {
    showInfo('Rescanning playlist tracks...');
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
      { method: 'post', action: '/actions/analyze-playlist' }
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
      const response = await fetch(`/api/playlist-analysis/${selectedPlaylist}`);
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


  // Check for existing analysis when playlist changes
  useEffect(() => {
    if (selectedPlaylist) {
      fetch(`/api/playlist-analysis/${selectedPlaylist}`)
        .then(res => res.json())
        .then(data => {
          setHasExistingAnalysis(data.success && data.analysis);
        })
        .catch(() => {
          setHasExistingAnalysis(false);
        });
    }
  }, [selectedPlaylist]);

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
              <PlaylistHeader
                currentPlaylist={currentPlaylist}
                onEditDescription={handleEditDescription}
                onEnableAI={handleEnableAI}
                onAnalyzePlaylist={handleAnalyzePlaylist}
                onViewAnalysis={handleViewAnalysis}
                hasAnalysis={hasExistingAnalysis}
                isAnalyzing={isAnalyzing}
              />
              <TracksList
                currentPlaylist={currentPlaylist}
                playlistTracks={playlistTracks}
                isLoading={isLoadingTracks}
                rescanAction={
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRescanPlaylist}
                  >
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                    Rescan Playlist
                  </Button>
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