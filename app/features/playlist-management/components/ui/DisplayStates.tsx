import React from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';
import { Button } from '~/shared/components/ui/button';
import { ScrollArea } from '~/shared/components/ui/scroll-area';
import { PlaylistUIFormat } from '../playlist-viewer/types';
import { PlaylistTrackUI } from '../playlist-viewer/types';
import { TableElements } from './TableElements';

export const LoadingTracksState: React.FC<{ currentPlaylist: PlaylistUIFormat }> = ({ currentPlaylist }) => (
  <div className="flex flex-col items-center justify-center p-12 h-[calc(100vh-500px)]">
    <div className="bg-card rounded-full p-5 mb-4">
      <RefreshCcw className="h-10 w-10 text-muted-foreground/60 animate-spin" />
    </div>
    <h3 className="text-xl font-medium text-foreground mb-2">Loading Tracks</h3>
    <p className="text-muted-foreground max-w-md text-center mb-6">
      Fetching tracks for this playlist...
    </p>
    {currentPlaylist?.songCount === 0 && (
      <p className="text-yellow-500 text-sm">
        This playlist appears to be empty.
      </p>
    )}
  </div>
);

export const NotStartedSyncState: React.FC<{
  syncPlaylistTracks: (playlistId: string) => void;
  currentPlaylistId: string;
  isSyncing: boolean;
  playlistIsEmpty?: boolean;
}> = ({ syncPlaylistTracks, currentPlaylistId, isSyncing, playlistIsEmpty = false }) => (
  <div className="flex flex-col items-center justify-center p-12 h-[calc(100vh-500px)]">
    <div className="bg-card rounded-full p-5 mb-4">
      <RefreshCcw className="h-10 w-10 text-muted-foreground/60" />
    </div>
    <h3 className="text-xl font-medium text-foreground mb-2">Tracks Not Synced</h3>
    <p className="text-muted-foreground max-w-md text-center mb-6">
      {playlistIsEmpty
        ? "This playlist appears to be empty. No tracks to sync."
        : "This playlist's tracks haven't been synced yet. Sync now to view and manage tracks in this playlist."}
    </p>
    {!playlistIsEmpty && (
      <Button
        onClick={() => syncPlaylistTracks(currentPlaylistId)}
        disabled={isSyncing}
        className="bg-green-600 hover:bg-green-700 text-foreground border-0 transition-colors gap-2"
      >
        <RefreshCcw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
        {isSyncing ? 'Syncing...' : 'Sync Playlist Tracks'}
      </Button>
    )}
  </div>
);

export const FailedSyncEmptyState: React.FC<{
  syncPlaylistTracks: (playlistId: string) => void;
  currentPlaylistId: string;
  isSyncing: boolean;
}> = ({ syncPlaylistTracks, currentPlaylistId, isSyncing }) => (
  <div className="flex flex-col items-center justify-center p-12 h-[calc(100vh-500px)]">
    <div className="bg-red-900/30 rounded-full p-5 mb-4">
      <AlertTriangle className="h-10 w-10 text-red-500" />
    </div>
    <h3 className="text-xl font-medium text-foreground mb-2">Sync Failed</h3>
    <p className="text-muted-foreground max-w-md text-center mb-6">
      There was an error syncing tracks for this playlist. Please try again.
    </p>
    <Button
      onClick={() => syncPlaylistTracks(currentPlaylistId)}
      disabled={isSyncing}
      className="bg-red-700 hover:bg-red-800 text-foreground border-0 transition-colors gap-2"
    >
      <RefreshCcw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
      Retry Sync
    </Button>
  </div>
);

export const FailedSyncWithTracksState: React.FC<{
  syncPlaylistTracks: (playlistId: string) => void;
  currentPlaylistId: string;
  isSyncing: boolean;
  playlistTracks: PlaylistTrackUI[];
}> = ({ syncPlaylistTracks, currentPlaylistId, isSyncing, playlistTracks }) => (
  <>
    {/* Blurred overlay with error message */}
    <div className="absolute inset-0 backdrop-blur-sm bg-background/40 z-10 flex flex-col items-center justify-center p-6">
      <div className="bg-red-900/80 rounded-lg p-6 max-w-md text-center border border-red-700">
        <AlertTriangle className="h-10 w-10 text-red-400 mx-auto mb-3" />
        <h3 className="text-xl font-medium text-foreground mb-2">Sync Failed</h3>
        <p className="text-foreground mb-4">
          There was an error syncing tracks for this playlist. Please try again.
        </p>
        <Button
          onClick={() => syncPlaylistTracks(currentPlaylistId)}
          disabled={isSyncing}
          className="bg-red-700 hover:bg-red-800 text-foreground border-0 transition-colors gap-2"
        >
          <RefreshCcw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
          Retry Sync
        </Button>
      </div>
    </div>

    {/* Blurred table in background */}
    <ScrollArea className="h-[calc(100vh-500px)] hover-show-scrollbar">
      <div className="p-4 overflow-x-auto">
        <div className="min-w-[480px]">
          <TableElements.PlaylistTable playlistTracks={playlistTracks} />
        </div>
      </div>
    </ScrollArea>
  </>
);

export const TracksTableState: React.FC<{ playlistTracks: PlaylistTrackUI[] }> = ({ playlistTracks }) => (
  <ScrollArea className="h-[calc(100vh-500px)] hover-show-scrollbar">
    <div className="p-4 overflow-x-auto">
      <div className="min-w-[480px]">
        <TableElements.PlaylistTable playlistTracks={playlistTracks} />
      </div>
    </div>
  </ScrollArea>
);
