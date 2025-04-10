import { useCallback, useEffect, useState, useMemo } from 'react';
import { Playlist } from '~/lib/models/Playlist';
import { mapPlaylistToUIFormat } from '../utils';
import { PlaylistTrackUI } from '../components/playlist-viewer/types';

interface UsePlaylistManagementProps {
  playlists: Playlist[];
}

export type PlaylistDetailViewTabs = 'is_flagged' | 'others';

export function usePlaylistManagement({
  playlists
}: UsePlaylistManagementProps) {
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

  const mappedPlaylists = useMemo(() => {
    return playlists.map(playlist =>
      mapPlaylistToUIFormat(playlist)
    );
  }, [playlists]);

  const filteredTabPlaylists = useMemo(() => {
    return mappedPlaylists.filter(playlist =>
      selectedTab === 'is_flagged' ? playlist.aiEnabled : !playlist.aiEnabled
    );
  }, [mappedPlaylists, selectedTab]);

  useEffect(() => {
    if (filteredTabPlaylists.length === 0) return;

    const selectedPlaylistId = localStorage.getItem(`selectedPlaylistId_${selectedTab}`);
    if (selectedPlaylistId) {
      const playlistExists = filteredTabPlaylists.some(p => p.id.toString() === selectedPlaylistId);

      if (playlistExists) {
        setSelectedPlaylist(selectedPlaylistId);
      } else {
        const firstPlaylistId = filteredTabPlaylists[0].id.toString();
        updateSelectedPlaylist(firstPlaylistId);
      }
    } else {
      const firstPlaylistId = filteredTabPlaylists[0].id.toString();
      updateSelectedPlaylist(firstPlaylistId);
    }
  }, [selectedTab, filteredTabPlaylists, updateSelectedPlaylist]);


  const filteredPlaylists = useMemo(() => {
    return mappedPlaylists
      .filter(playlist => selectedTab === 'is_flagged' ? playlist.aiEnabled : !playlist.aiEnabled)
      .filter(playlist => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
          playlist.name.toLowerCase().includes(query) ||
          playlist.description.toLowerCase().includes(query)
        );
      });
  }, [mappedPlaylists, selectedTab, searchQuery]);

  const currentPlaylistWithTracks = null;
  const playlistTracks: PlaylistTrackUI[] = [];

  const currentPlaylist = useMemo(() => {
    if (!selectedPlaylist) return null;
    return mappedPlaylists.find(p => p.id === selectedPlaylist) || null;
  }, [selectedPlaylist, mappedPlaylists]);

  return {
    selectedPlaylist,
    selectedTab,
    searchQuery,
    filteredPlaylists,
    currentPlaylist,
    currentPlaylistWithTracks,
    playlistTracks,

    updateSelectedPlaylist,
    updateSelectedTab,
    setSearchQuery,
  };
}
