import { NotificationMessage } from '~/features/playlist-management/components/helpers';
import { PlaylistManagementHeader, PlaylistDetailView, PlaylistSidebar } from '~/features/playlist-management/components';
import {
  usePlaylistManagement,
  useNotifications,
  useSyncPlaylists
} from '~/features/playlist-management/hooks';

import { Playlist, PlaylistWithTracks } from '~/lib/models/Playlist';


// todo: need to implement a way to fetch other playlist tracks
// first load doesnt load their songs
type PlaylistManagementProps = { aiEnabledPlaylistsWithTracks: PlaylistWithTracks[], otherPlaylists: Promise<Playlist[]> }

const PlaylistManagement = ({ aiEnabledPlaylistsWithTracks, otherPlaylists }: PlaylistManagementProps) => {
  const {
    selectedPlaylist,
    selectedTab,
    searchQuery,
    filteredPlaylists,
    currentPlaylist,
    playlistTracks,
    updateSelectedPlaylist,
    updateSelectedTab,
    setSearchQuery
  } = usePlaylistManagement({ aiEnabledPlaylistsWithTracks, otherPlaylists });


  const { notification, showSuccess, showInfo } = useNotifications();
  const { isSyncing } = useSyncPlaylists();


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

  return (
    <div className="h-full flex flex-col space-y-6">
      {/* Header with actions */}
      <PlaylistManagementHeader isSyncing={isSyncing} />

      {notification && (
        <NotificationMessage type={notification.type} message={notification.message} />
      )}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 h-full">
        <PlaylistSidebar
          filteredPlaylists={filteredPlaylists}
          selectedPlaylist={selectedPlaylist}
          selectedTab={selectedTab}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onTabChange={(value) => {
            updateSelectedTab(value);
          }}
          onSelectPlaylist={updateSelectedPlaylist}
        />

        <div className="md:col-span-8 lg:col-span-9 flex flex-col space-y-6">
          <PlaylistDetailView
            currentPlaylist={currentPlaylist}
            playlistTracks={playlistTracks}
            onEditDescription={handleEditDescription}
            onEnableAI={handleEnableAI}
            onRescanPlaylist={handleRescanPlaylist}
          />
        </div>
      </div>
    </div>
  );
};

export default PlaylistManagement;