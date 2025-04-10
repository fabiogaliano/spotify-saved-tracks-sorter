import React from 'react';
import { Music } from 'lucide-react';
import { Card, CardContent, CardHeader } from '~/shared/components/ui/Card';
import { PlaylistUIFormat, PlaylistTrackUI } from './types';
import { IconContainer, SectionTitle } from '../ui/controls';
import { FailedSyncEmptyState, FailedSyncWithTracksState, LoadingTracksState, NotStartedSyncState, TracksTableState } from '../ui/DisplayStates';

interface TrackListProps {
  currentPlaylist: PlaylistUIFormat;
  playlistTracks: PlaylistTrackUI[];
  isLoading: boolean; // Used for both loading tracks and disabling sync buttons
  syncPlaylistTracks: (playlistId: string) => void;
}

const TrackList: React.FC<TrackListProps> = ({
  currentPlaylist,
  playlistTracks,
  isLoading,
  syncPlaylistTracks
}) => {
  const renderTrackContent = () => {
    if (currentPlaylist.tracksSyncStatus === 'NOT_STARTED') {
      return (
        <NotStartedSyncState
          syncPlaylistTracks={syncPlaylistTracks}
          currentPlaylistId={currentPlaylist.id}
          isSyncing={isLoading}
        />
      );
    }

    if (currentPlaylist.tracksSyncStatus === 'FAILED') {
      return currentPlaylist.songCount > 0 ? (
        <FailedSyncWithTracksState
          syncPlaylistTracks={syncPlaylistTracks}
          currentPlaylistId={currentPlaylist.id}
          isSyncing={isLoading}
          playlistTracks={playlistTracks}
        />
      ) : (
        <FailedSyncEmptyState
          syncPlaylistTracks={syncPlaylistTracks}
          currentPlaylistId={currentPlaylist.id}
          isSyncing={isLoading}
        />
      );
    }

    if (isLoading) {
      return <LoadingTracksState currentPlaylist={currentPlaylist} />;
    }

    return <TracksTableState playlistTracks={playlistTracks} />;
  };

  return (
    <Card className="bg-gray-900/80 border-gray-800 h-full">
      <CardHeader className="pb-2 border-b border-gray-800">
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
