import { useEffect } from 'react';

import { Playlist } from '~/lib/models/Playlist';

import PlaylistInfo from './playlist-viewer/PlaylistInfo';
import TrackList from './playlist-viewer/TrackList';
import PlaylistSelector from './playlist-selector/PlaylistSelector';
import { NotificationMessage } from './ui/controls';
import ManagementToolbar from './toolbar/ManagementToolbar';

import { usePlaylistManagement } from '../hooks/usePlaylistManagement';
import { useNotifications } from '../hooks/useNotifications';
import { useSyncPlaylists } from '../hooks/useSyncPlaylists';
import { usePlaylistTracks } from '../hooks/usePlaylistTracks'

type PlaylistManagementProps = { playlists: Playlist[] }

const PlaylistManagement = ({ playlists }: PlaylistManagementProps) => {
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

  const handlePlaylistCreated = (playlistSpotifyId: string) => {
    // Find the playlist in our list by Spotify ID and select it
    const newPlaylist = playlists.find(p => p.spotify_playlist_id === playlistSpotifyId);
    if (newPlaylist) {
      updateSelectedPlaylist(newPlaylist.id.toString());
      // Switch to AI-Enabled tab since new playlists are AI playlists
      updateSelectedTab('is_flagged');
    }
  };

  const { notification, showSuccess, showInfo } = useNotifications();
  const { isSyncing } = useSyncPlaylists();
  const { getTracksForPlaylist, getLoadingStateForPlaylist, loadPlaylistTracks, markPlaylistAsEmpty, formatTrackData } = usePlaylistTracks();


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
    // AI Sorting Enable
    // TODO: Update playlist data - count chars available for description 
    // block api call if new description is too long
  };

  const handleRescanPlaylist = () => {
    showInfo('Rescanning playlist tracks...');
  };

  useEffect(() => {
    if (selectedPlaylist) {
      if (currentPlaylist?.songCount === 0) {
        markPlaylistAsEmpty(selectedPlaylist);
      } else {
        loadPlaylistTracks(selectedPlaylist);
      }
    }
  }, [selectedPlaylist, currentPlaylist, loadPlaylistTracks, markPlaylistAsEmpty]);

  const rawPlaylistTracks = getTracksForPlaylist(selectedPlaylist || '');
  const playlistTracks = rawPlaylistTracks.map(track => formatTrackData(track));
  const isLoadingTracks = getLoadingStateForPlaylist(selectedPlaylist || '');

  return (
    <div className="h-full flex flex-col space-y-6">
      <ManagementToolbar isSyncing={isSyncing} onPlaylistCreated={handlePlaylistCreated} />

      {notification && (
        <NotificationMessage type={notification.type} message={notification.message} />
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
              <PlaylistInfo
                currentPlaylist={currentPlaylist}
                onEditDescription={handleEditDescription}
                onEnableAI={handleEnableAI}
                onRescanPlaylist={handleRescanPlaylist}
              />
              <TrackList
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

export default PlaylistManagement;
