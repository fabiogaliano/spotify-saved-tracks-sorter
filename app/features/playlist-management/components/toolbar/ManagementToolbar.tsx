import React from 'react';
import { Button } from '~/shared/components/ui/button';
import { Plus, RefreshCw } from 'lucide-react';
import { useSyncPlaylists, useCreatePlaylist } from '../../queries/playlist-queries';
import CreateAIPlaylistModal from '../modals/CreateAIPlaylistModal';

interface ManagementToolbarProps {
  isSyncing: boolean;
  onPlaylistCreated?: (playlistSpotifyId: string) => void;
}

const ManagementToolbar: React.FC<ManagementToolbarProps> = ({ isSyncing, onPlaylistCreated }) => {
  const syncPlaylistsMutation = useSyncPlaylists();
  const createPlaylistMutation = useCreatePlaylist();

  const handleCreatePlaylist = async (name: string, description: string) => {
    try {
      const result = await createPlaylistMutation.mutateAsync({ name, description });
      // Use the mutation result directly
      if (onPlaylistCreated && result?.spotify_playlist_id) {
        // Call immediately - the cache is already updated
        onPlaylistCreated(result.spotify_playlist_id);
      }
    } catch (error) {
      // Error handling is done in the mutation
    }
  };

  const handleSyncPlaylists = () => {
    syncPlaylistsMutation.mutate();
  };

  return (
    <div className="flex flex-col md:flex-row justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-1">Playlist Management</h1>
        <p className="text-muted-foreground">Configure AI flags and manage your playlists</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          className="bg-secondary hover:bg-secondary/80 text-secondary-foreground border-0 transition-colors gap-2"
          onClick={handleSyncPlaylists}
          disabled={syncPlaylistsMutation.isPending}
        >
          <RefreshCw className={`h-4 w-4 ${syncPlaylistsMutation.isPending ? 'animate-spin' : ''}`} />
          {syncPlaylistsMutation.isPending ? 'Syncing...' : 'Sync Playlists'}
        </Button>

        <CreateAIPlaylistModal
          onCreatePlaylist={handleCreatePlaylist}
          isCreating={createPlaylistMutation.isPending}
        />
      </div>
    </div>
  );
};

export default ManagementToolbar;