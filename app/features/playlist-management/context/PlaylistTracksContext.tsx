import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect, useRef } from 'react';
import { useFetcher } from 'react-router';
import { Track } from '~/lib/models/Track';

interface LoadTracksResponse {
  success: boolean;
  tracks?: any[];
  error?: string;
}

type PlaylistStore = {
  [key: string]: {
    tracks: Track[];
    isLoading: boolean;
    error: string | null;
    loaded: boolean;
  };
};

export interface PlaylistTracksContextType {
  tracks: any[];
  currentPlaylistId: string | null;
  isLoading: boolean;
  hasLoaded: (id: string) => boolean;
  getTracksForPlaylist: (id: string) => any[];
  getLoadingStateForPlaylist: (id: string) => boolean;
  loadPlaylistTracks: (id: string, force?: boolean) => void;
  markPlaylistAsEmpty: (id: string) => void;
}

const PlaylistTracksContext = createContext<PlaylistTracksContextType | null>(null);

export const PlaylistTracksProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const tracksFetcher = useFetcher();
  const [currentPlaylistId, setCurrentPlaylistId] = useState<string | null>(null);
  const activePlaylistIdRef = useRef<string | null>(null);

  const [playlistStore, setPlaylistStore] = useState<PlaylistStore>({});
  const lastSubmittedPlaylistIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!currentPlaylistId) return;

    // This ensures we don't show loading state for empty playlists
    if (currentPlaylistId) {
      const playlistState = playlistStore[currentPlaylistId];
      if (playlistState?.isLoading && !playlistState.loaded) {
        // If this playlist has been loading for more than 5 seconds, mark it as loaded
        const timeoutId = setTimeout(() => {
          console.log('[PlaylistTracksContext] Force-marking playlist as loaded after timeout:', currentPlaylistId);
          setPlaylistStore(prev => {
            if (prev[currentPlaylistId]?.isLoading) {
              return {
                ...prev,
                [currentPlaylistId]: {
                  ...prev[currentPlaylistId],
                  isLoading: false,
                  tracks: [],
                  loaded: true,
                  error: null
                }
              };
            }
            return prev;
          });
        }, 5000);

        return () => clearTimeout(timeoutId);
      }
    }
  }, [currentPlaylistId, playlistStore]);

  useEffect(() => {
    const handleFetcherState = () => {
      const targetPlaylistId = tracksFetcher.formData?.get('playlistId') as string || lastSubmittedPlaylistIdRef.current;

      if (!targetPlaylistId) return;

      if (targetPlaylistId) {
        activePlaylistIdRef.current = targetPlaylistId;
      }

      if (tracksFetcher.state === 'loading' || tracksFetcher.state === 'submitting') {
        setPlaylistStore(prev => {
          const newState = { ...prev };
          newState[targetPlaylistId] = {
            ...(prev[targetPlaylistId] || { tracks: [], loaded: false }),
            isLoading: true,
            error: null
          };
          return newState;
        });
        return;
      }

      if (!tracksFetcher.data && tracksFetcher.state === 'idle') {
        setPlaylistStore(prev => {
          if (!prev[targetPlaylistId]) return prev;
          const newState = { ...prev };
          newState[targetPlaylistId] = {
            ...prev[targetPlaylistId],
            isLoading: false
          };
          return newState;
        });
        return;
      }

      if (tracksFetcher.data && targetPlaylistId) {
        const response = tracksFetcher.data as LoadTracksResponse;

        if (response.success && Array.isArray(response.tracks)) {
          setPlaylistStore(prev => {
            const newState = { ...prev };
            newState[targetPlaylistId] = {
              ...(prev[targetPlaylistId] || {}),
              tracks: response.tracks || [],
              isLoading: false,
              error: null,
              loaded: true
            };
            return newState;
          });
        } else if (response.error) {
          setPlaylistStore(prev => {
            const newState = { ...prev };
            newState[targetPlaylistId] = {
              ...(prev[targetPlaylistId] || {}),
              isLoading: false,
              error: response.error || null,
              loaded: true
            };
            return newState;
          });
        } else {
          setPlaylistStore(prev => {
            const newState = { ...prev };
            newState[targetPlaylistId] = {
              ...(prev[targetPlaylistId] || {}),
              isLoading: false,
              error: 'Unexpected response format from server',
              loaded: true
            };
            return newState;
          });
        }

        lastSubmittedPlaylistIdRef.current = null;
      }
    };

    handleFetcherState();
  }, [tracksFetcher.state, tracksFetcher.data]);

  const markPlaylistAsEmpty = useCallback((id: string) => {
    setCurrentPlaylistId(id);

    setPlaylistStore(prev => ({
      ...prev,
      [id]: {
        tracks: [],
        isLoading: false,
        error: null,
        loaded: true
      }
    }));
  }, []);

  const loadPlaylistTracks = useCallback((id: string, force: boolean = false) => {
    setCurrentPlaylistId(id);

    if (!playlistStore[id]) {
      setPlaylistStore(prev => ({
        ...prev,
        [id]: {
          tracks: [],
          isLoading: false,
          error: null,
          loaded: false
        }
      }));
    }

    // Skip if already loaded or loading
    if ((!force && playlistStore[id]?.loaded) || playlistStore[id]?.isLoading) {
      return;
    }

    setPlaylistStore(prev => ({
      ...prev,
      [id]: {
        ...(prev[id] || {}),
        isLoading: true,
        error: null
      }
    }));

    lastSubmittedPlaylistIdRef.current = id;

    const timeoutId = setTimeout(() => {
      setPlaylistStore(prev => {
        if (prev[id]?.isLoading) {
          return {
            ...prev,
            [id]: {
              ...(prev[id] || {}),
              isLoading: false,
              error: 'Request timed out',
              loaded: true
            }
          };
        }
        return prev;
      });
    }, 8000);

    tracksFetcher.submit(
      { playlistId: id },
      {
        method: 'post',
        action: '/actions/load-playlist-tracks'
      }
    );

    return () => clearTimeout(timeoutId);
  }, [tracksFetcher, playlistStore]);

  const getTracksForPlaylist = useCallback((playlistId: string) => {
    return playlistId ? playlistStore[playlistId]?.tracks || [] : [];
  }, [playlistStore]);

  const getLoadingStateForPlaylist = useCallback((playlistId: string) => {
    return playlistId ? playlistStore[playlistId]?.isLoading || false : false;
  }, [playlistStore]);

  const hasLoaded = useCallback((id: string) => {
    return playlistStore[id]?.loaded || false;
  }, [playlistStore]);

  const value = {
    tracks: currentPlaylistId ? playlistStore[currentPlaylistId]?.tracks || [] : [],
    currentPlaylistId,
    isLoading: currentPlaylistId ? playlistStore[currentPlaylistId]?.isLoading || false : false,
    hasLoaded,
    getTracksForPlaylist,
    getLoadingStateForPlaylist,
    loadPlaylistTracks,
    markPlaylistAsEmpty
  };

  return (
    <PlaylistTracksContext.Provider value={value}>
      {children}
    </PlaylistTracksContext.Provider>
  );
};

export const usePlaylistTracksContext = () => {
  const context = useContext(PlaylistTracksContext);
  if (!context) {
    throw new Error('usePlaylistTracksContext must be used within a PlaylistTracksProvider');
  }
  return context;
};
