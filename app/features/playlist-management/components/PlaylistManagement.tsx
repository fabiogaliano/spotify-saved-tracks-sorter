import { useEffect, useState } from 'react';
import { Playlist } from '~/lib/models/Playlist';
import PlaylistHeader from './content/PlaylistHeader';
import TracksList from './content/TracksList';
import PlaylistSelector from './sidebar/PlaylistSelector';
import { NotificationBanner } from './ui';
import ManagementToolbar from './toolbar/ManagementToolbar';

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

  // Handle empty playlists
  useEffect(() => {
    if (selectedPlaylist && currentPlaylist?.songCount === 0) {
      // No need to do anything special - React Query handles empty states
    }
  }, [selectedPlaylist, currentPlaylist]);

  return (
    <div className="h-full flex flex-col space-y-6">
      <ManagementToolbar 
        isSyncing={isSyncing} 
        onPlaylistCreated={handlePlaylistCreated} 
      />

      {notification && (
        <NotificationBanner type={notification.type} message={notification.message} />
      )}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 h-full">
        <PlaylistSelector
          filteredPlaylists={filteredPlaylists}
          selectedPlaylist={selectedPlaylist}
          selectedTab={selectedTab}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onTabChange={updateSelectedTab}
          onSelectPlaylist={updateSelectedPlaylist}
        />

        <div className="md:col-span-8 lg:col-span-9 flex flex-col space-y-6">
          {currentPlaylist && (
            <>
              <PlaylistHeader
                currentPlaylist={currentPlaylist}
                onEditDescription={handleEditDescription}
                onEnableAI={handleEnableAI}
                onRescanPlaylist={handleRescanPlaylist}
              />
              <TracksList
                currentPlaylist={currentPlaylist}
                playlistTracks={playlistTracks}
                isLoading={isLoadingTracks}
              />
            </>
          )}
        </div>
      </div>
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