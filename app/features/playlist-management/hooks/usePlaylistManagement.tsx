import { useCallback, useEffect, useState } from 'react';
import { Playlist, PlaylistWithTracks } from '~/lib/models/Playlist';
import { mapPlaylistToUIFormat, mapTrackToUIFormat } from '../utils';
import { useNotificationStore } from '~/lib/stores/notificationStore';

interface UsePlaylistManagementProps {
  aiEnabledPlaylistsWithTracks: PlaylistWithTracks[];
  otherPlaylists: Promise<Playlist[]>;
}

export type PlaylistDetailViewTabs = 'is_flagged' | 'others';

export function usePlaylistManagement({
  aiEnabledPlaylistsWithTracks,
  otherPlaylists
}: UsePlaylistManagementProps) {
  /*
  * handle selected tab and playlist
  */
  const [selectedTab, setSelectedTab] = useState<PlaylistDetailViewTabs>(() => {
    if (typeof window === 'undefined') return 'is_flagged';
    return (localStorage.getItem('selectedTab') as PlaylistDetailViewTabs) || 'is_flagged';
  });
  const updateSelectedTab = useCallback((tab: PlaylistDetailViewTabs) => {
    setSelectedTab(tab);
    localStorage.setItem('selectedTab', tab);
  }, []);


  const [selectedPlaylist, setSelectedPlaylist] = useState<string | null>(null);
  const updateSelectedPlaylist = useCallback((playlistId: string | null) => {
    if (playlistId) {
      setSelectedPlaylist(playlistId);
      localStorage.setItem(`selectedPlaylistId_${selectedTab}`, playlistId);
    }
  }, [selectedTab]);


  const [searchQuery, setSearchQuery] = useState('');
  const [otherPlaylistsData, setOtherPlaylistsData] = useState<Playlist[]>([]);
  const notify = useNotificationStore();

  // load non-flagged playlists (others)
  useEffect(() => {
    const loadOtherPlaylists = async () => {
      try {
        const playlists = await otherPlaylists;
        setOtherPlaylistsData(playlists);
      } catch (error) {
        notify.error('Failed to load other playlists!');
      }
    };

    loadOtherPlaylists();
  }, [otherPlaylists, notify]);


  // initialize playlists and handle tab changes
  useEffect(() => {
    const currentTabPlaylists = selectedTab === 'is_flagged' ? aiEnabledPlaylistsWithTracks : otherPlaylistsData;
    if (currentTabPlaylists.length === 0) return;

    const selectedPlaylistId = localStorage.getItem(`selectedPlaylistId_${selectedTab}`);
    if (selectedPlaylistId) {
      const playlistExists = currentTabPlaylists.some(p => p.id.toString() === selectedPlaylistId);

      if (playlistExists) {
        setSelectedPlaylist(selectedPlaylistId);
      } else {
        const firstPlaylistId = currentTabPlaylists[0].id.toString();
        updateSelectedPlaylist(firstPlaylistId);
      }
    } else {
      const firstPlaylistId = currentTabPlaylists[0].id.toString();
      updateSelectedPlaylist(firstPlaylistId);
    }
  }, [selectedTab, aiEnabledPlaylistsWithTracks, otherPlaylistsData, updateSelectedPlaylist]);


  const aiPlaylistsData = aiEnabledPlaylistsWithTracks.map(playlist =>
    mapPlaylistToUIFormat(playlist, true)
  );

  const otherPlaylistsMapped = otherPlaylistsData.map(playlist =>
    mapPlaylistToUIFormat(playlist)
  );

  const filteredPlaylists = (selectedTab === 'is_flagged' ? aiPlaylistsData : otherPlaylistsMapped).filter(playlist => {
    if (!searchQuery) return true;

    const query = searchQuery.toLowerCase();
    return (
      playlist.name.toLowerCase().includes(query) ||
      playlist.description.toLowerCase().includes(query)
    );
  });

  // Get the tracks for the currently selected playlist (only available for AI-enabled playlists)
  const currentPlaylistWithTracks = selectedPlaylist && selectedTab === 'is_flagged'
    ? aiEnabledPlaylistsWithTracks.find(p => p.id.toString() === selectedPlaylist)
    : null;

  // Format tracks for UI
  const playlistTracks = currentPlaylistWithTracks
    ? currentPlaylistWithTracks.tracks.map(mapTrackToUIFormat)
    : [];

  const currentPlaylist = selectedPlaylist
    ? (selectedTab === 'is_flagged' ? aiPlaylistsData : otherPlaylistsMapped).find(p => p.id === selectedPlaylist) || null
    : null;

  return {
    // State
    selectedPlaylist,
    selectedTab,
    searchQuery,
    otherPlaylistsData,
    aiPlaylistsData,
    otherPlaylistsMapped,
    filteredPlaylists,
    currentPlaylist,
    currentPlaylistWithTracks,
    playlistTracks,

    // Actions
    updateSelectedPlaylist,
    updateSelectedTab,
    setSearchQuery,
  };
}
