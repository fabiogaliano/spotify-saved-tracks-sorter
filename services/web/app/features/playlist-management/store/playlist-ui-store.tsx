import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type PlaylistDetailViewTabs = 'is_flagged' | 'others';

interface PlaylistUIState {
  selectedPlaylist: string | null;
  selectedTab: PlaylistDetailViewTabs;
  searchQuery: string;
}

interface PlaylistUIContextType extends PlaylistUIState {
  updateSelectedPlaylist: (playlistId: string | null, tab?: PlaylistDetailViewTabs) => void;
  updateSelectedTab: (tab: PlaylistDetailViewTabs) => void;
  setSearchQuery: (query: string) => void;
}

const PlaylistUIContext = createContext<PlaylistUIContextType | null>(null);

export const PlaylistUIProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [selectedTab, setSelectedTab] = useState<PlaylistDetailViewTabs>(() => {
    if (typeof window === 'undefined') return 'is_flagged';
    return (localStorage.getItem('selectedTab') as PlaylistDetailViewTabs) || 'is_flagged';
  });

  const [selectedPlaylist, setSelectedPlaylist] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const updateSelectedTab = useCallback((tab: PlaylistDetailViewTabs) => {
    setSelectedTab(tab);
    localStorage.setItem('selectedTab', tab);
  }, []);

  const updateSelectedPlaylist = useCallback((playlistId: string | null, tab?: PlaylistDetailViewTabs) => {
    if (playlistId) {
      setSelectedPlaylist(playlistId);
      const tabToUse = tab || selectedTab;
      localStorage.setItem(`selectedPlaylistId_${tabToUse}`, playlistId);
    }
  }, [selectedTab]);

  const value = {
    selectedPlaylist,
    selectedTab,
    searchQuery,
    updateSelectedPlaylist,
    updateSelectedTab,
    setSearchQuery,
  };

  return (
    <PlaylistUIContext.Provider value={value}>
      {children}
    </PlaylistUIContext.Provider>
  );
};

export const usePlaylistUIContext = () => {
  const context = useContext(PlaylistUIContext);
  if (!context) {
    throw new Error('usePlaylistUIContext must be used within a PlaylistUIProvider');
  }
  return context;
};