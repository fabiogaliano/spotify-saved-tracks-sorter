import { useCallback, useMemo, useState } from 'react';
import { TrackWithAnalysis } from '~/lib/models/Track';
import { useLikedSongs, useAnalyzeTracks, useUpdateTrackAnalysis } from '../queries/liked-songs-queries';

interface UseLikedSongsManagementProps {
  initialSongs: TrackWithAnalysis[];
}

export function useLikedSongsManagement({ initialSongs }: UseLikedSongsManagementProps) {
  // React Query for server state
  const { data: likedSongs = [] } = useLikedSongs(initialSongs);
  
  // Local UI state for table selection
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Mutations
  const analyzeMutation = useAnalyzeTracks();
  const updateTrackAnalysis = useUpdateTrackAnalysis();
  
  // Computed values
  const filteredTracks = useMemo(() => {
    return likedSongs.filter((track: TrackWithAnalysis) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          track.track.name.toLowerCase().includes(query) ||
          track.track.artist.toLowerCase().includes(query) ||
          (track.track.album && track.track.album.toLowerCase().includes(query));
        if (!matchesSearch) return false;
      }
      
      // Status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'analyzed' && track.uiAnalysisStatus !== 'analyzed') return false;
        if (statusFilter === 'not_analyzed' && track.uiAnalysisStatus !== 'not_analyzed') return false;
        if (statusFilter === 'pending' && track.uiAnalysisStatus !== 'pending') return false;
        if (statusFilter === 'failed' && track.uiAnalysisStatus !== 'failed') return false;
      }
      
      return true;
    });
  }, [likedSongs, searchQuery, statusFilter]);
  
  // Selected tracks based on filtered data
  const selectedTracks = useCallback(() => {
    // IMPORTANT: rowSelection indices are based on the filtered/displayed data,
    // not the full likedSongs array. We need to map through filteredTracks.
    return filteredTracks.filter((_: TrackWithAnalysis, index: number) => rowSelection[index]);
  }, [filteredTracks, rowSelection]);
  
  // Statistics
  const stats = useMemo(() => {
    const analyzed = likedSongs.filter((t: TrackWithAnalysis) => t.uiAnalysisStatus === 'analyzed').length;
    const pending = likedSongs.filter((t: TrackWithAnalysis) => t.uiAnalysisStatus === 'pending').length;
    const failed = likedSongs.filter((t: TrackWithAnalysis) => t.uiAnalysisStatus === 'failed').length;
    const notAnalyzed = likedSongs.filter((t: TrackWithAnalysis) => t.uiAnalysisStatus === 'not_analyzed').length;
    
    return {
      total: likedSongs.length,
      analyzed,
      pending,
      failed,
      notAnalyzed,
      percentageAnalyzed: likedSongs.length > 0 ? Math.round((analyzed / likedSongs.length) * 100) : 0,
    };
  }, [likedSongs]);
  
  // Analysis actions
  const analyzeSelectedTracks = useCallback(async (batchSize?: 1 | 5 | 10) => {
    const tracks = selectedTracks();
    if (tracks.length === 0) return;
    
    const trackData = tracks.map((track: TrackWithAnalysis) => ({
      id: track.track.id,
      spotifyTrackId: track.track.spotify_track_id,
      artist: track.track.artist,
      name: track.track.name,
    }));
    
    await analyzeMutation.mutateAsync({ tracks: trackData, batchSize });
    
    // Clear selection after analysis starts
    setRowSelection({});
  }, [selectedTracks, analyzeMutation]);
  
  const analyzeTracks = useCallback(async (options: { 
    trackId?: number; 
    useSelected?: boolean; 
    useAll?: boolean; 
    batchSize?: 1 | 5 | 10;
  }) => {
    let tracksToAnalyze: TrackWithAnalysis[] = [];
    
    if (options.trackId) {
      const track = likedSongs.find((t: TrackWithAnalysis) => t.track.id === options.trackId);
      if (track) tracksToAnalyze = [track];
    } else if (options.useSelected) {
      tracksToAnalyze = selectedTracks();
    } else if (options.useAll) {
      tracksToAnalyze = likedSongs.filter((t: TrackWithAnalysis) => t.uiAnalysisStatus === 'not_analyzed');
    }
    
    if (tracksToAnalyze.length === 0) return;
    
    const trackData = tracksToAnalyze.map((track: TrackWithAnalysis) => ({
      id: track.track.id,
      spotifyTrackId: track.track.spotify_track_id,
      artist: track.track.artist,
      name: track.track.name,
    }));
    
    await analyzeMutation.mutateAsync({ tracks: trackData, batchSize: options.batchSize });
  }, [likedSongs, selectedTracks, analyzeMutation]);
  
  // Track analysis update
  const updateSongAnalysisDetails = useCallback((
    trackId: number, 
    analysisData: Record<string, unknown>, 
    status: string
  ) => {
    updateTrackAnalysis(trackId, analysisData, status);
  }, [updateTrackAnalysis]);
  
  return {
    // Data
    likedSongs,
    filteredTracks,
    
    // Selection state
    rowSelection,
    setRowSelection,
    selectedTracks,
    
    // Filters
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    
    // Statistics
    stats,
    
    // Analysis operations
    analyzeSelectedTracks,
    analyzeTracks,
    updateSongAnalysisDetails,
    
    // Loading states
    isAnalyzing: analyzeMutation.isPending,
  };
}