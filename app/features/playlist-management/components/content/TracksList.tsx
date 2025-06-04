import React from 'react';
import { Music } from 'lucide-react';
import { Card, CardContent, CardHeader } from '~/shared/components/ui/Card';
import { PlaylistUIFormat, PlaylistTrackUI } from '../../types';
import { IconContainer, SectionTitle } from '../ui';
import { FailedSyncEmptyState, FailedSyncWithTracksState, LoadingTracksState, NotStartedSyncState, TracksTableState } from '../ui/LoadingStates';
import { useSyncPlaylistTracks } from '../../hooks/useSyncPlaylistTracks';

interface TrackListProps {
  currentPlaylist: PlaylistUIFormat;
  playlistTracks: PlaylistTrackUI[];
  isLoading: boolean;
}

const TrackList: React.FC<TrackListProps> = ({
  currentPlaylist,
  playlistTracks,
  isLoading,
}) => {
  // Use the syncPlaylistTracks hook to get real-time syncing state
  const { isSyncing, syncPlaylistTracks: syncTracks } = useSyncPlaylistTracks();
  const renderTrackContent = () => {
    if (currentPlaylist.tracksSyncStatus === 'NOT_STARTED') {
      return (
        <NotStartedSyncState
          syncPlaylistTracks={syncTracks}
          currentPlaylistId={currentPlaylist.id}
          isSyncing={isSyncing}
          playlistIsEmpty={currentPlaylist.songCount === 0}
        />
      );
    }

    if (currentPlaylist.tracksSyncStatus === 'FAILED') {
      return currentPlaylist.songCount > 0 ? (
        <FailedSyncWithTracksState
          syncPlaylistTracks={syncTracks}
          currentPlaylistId={currentPlaylist.id}
          isSyncing={isSyncing}
          playlistTracks={playlistTracks}
        />
      ) : (
        <FailedSyncEmptyState
          syncPlaylistTracks={syncTracks}
          currentPlaylistId={currentPlaylist.id}
          isSyncing={isSyncing}
        />
      );
    }

    if (isLoading) {
      return <LoadingTracksState currentPlaylist={currentPlaylist} />;
    }

    return <TracksTableState playlistTracks={playlistTracks} />;
  };

  return (
    <Card className="bg-card border-border h-full">
      <CardHeader className="pb-2 border-b border-border">
        <SectionTitle
          icon={<IconContainer icon={Music} color="green" />}
          title="Playlist Tracks"
        />
      </CardHeader>

      <CardContent className="p-0 relative">
        {renderTrackContent()}
      </CardContent>
    </Card>
  );
};

export default TrackList;
