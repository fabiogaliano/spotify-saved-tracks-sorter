import { useEffect, useMemo } from 'react';
import { Playlist } from '~/lib/models/Playlist';
import { mapPlaylistToUIFormat } from '../utils';
import { usePlaylistUIContext } from '../store/playlist-ui-store';
import { usePlaylists } from '../queries/playlist-queries';

interface UsePlaylistManagementProps {
  playlists: Playlist[];
}

export type PlaylistDetailViewTabs = 'is_flagged' | 'others';

export function usePlaylistManagement({ playlists: initialPlaylists }: UsePlaylistManagementProps) {
  const {
    selectedPlaylist,
    selectedTab,
    searchQuery,
    updateSelectedPlaylist,
    updateSelectedTab,
    setSearchQuery,
  } = usePlaylistUIContext();

  // Use React Query to get playlists (with initialData from loader)
  const { data: playlists } = usePlaylists(initialPlaylists);

  const mappedPlaylists = useMemo(() => {
    return (playlists || []).map(playlist => mapPlaylistToUIFormat(playlist));
  }, [playlists]);

  const filteredTabPlaylists = useMemo(() => {
    return mappedPlaylists.filter(playlist =>
      selectedTab === 'is_flagged' ? playlist.aiEnabled : !playlist.aiEnabled
    );
  }, [mappedPlaylists, selectedTab]);

  // Auto-select first playlist when tab changes or playlists update
  useEffect(() => {
    if (filteredTabPlaylists.length === 0) return;

    const selectedPlaylistId = localStorage.getItem(`selectedPlaylistId_${selectedTab}`);
    if (selectedPlaylistId) {
      const playlistExists = filteredTabPlaylists.some(p => p.id.toString() === selectedPlaylistId);

      if (playlistExists) {
        updateSelectedPlaylist(selectedPlaylistId);
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
    updateSelectedPlaylist,
    updateSelectedTab,
    setSearchQuery,
  };
}
