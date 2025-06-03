import React from 'react';
import { Button } from '~/shared/components/ui/button';
import { Plus, RefreshCw } from 'lucide-react';
import { useSyncPlaylists } from '../../hooks/useSyncPlaylists';
import { useFetcher, useRevalidator } from 'react-router';
import CreateAIPlaylistModal from '../CreateAIPlaylistModal';
import { toast } from 'sonner';

interface ManagementToolbarProps {
  isSyncing: boolean;
  onPlaylistCreated?: (playlistSpotifyId: string) => void;
}

const ManagementToolbar: React.FC<ManagementToolbarProps> = ({ isSyncing, onPlaylistCreated }) => {
  const { triggerSync } = useSyncPlaylists();
  const fetcher = useFetcher();
  const revalidator = useRevalidator();

  const handleCreatePlaylist = (name: string, description: string) => {
    const formData = new FormData();
    formData.append('name', name);
    formData.append('description', description);

    fetcher.submit(formData, {
      method: 'POST',
      action: '/actions/create-ai-playlist'
    });
  };

  React.useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data?.success) {
      toast.success(`Playlist "${fetcher.data.playlist.name}" created successfully!`);
      revalidator.revalidate();
      // Auto-select the newly created playlist
      if (onPlaylistCreated) {
        onPlaylistCreated(fetcher.data.playlist.id);
      }
    } else if (fetcher.state === 'idle' && fetcher.data?.error) {
      toast.error(fetcher.data.error || 'Failed to create playlist');
    }
  }, [fetcher.state, fetcher.data, revalidator, onPlaylistCreated]);

  return (
    <div className="flex flex-col md:flex-row justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-1">Playlist Management</h1>
        <p className="text-muted-foreground">Configure AI flags and manage your playlists</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          className="bg-secondary hover:bg-secondary/80 text-secondary-foreground border-0 transition-colors gap-2"
          onClick={triggerSync}
          disabled={isSyncing}
        >
          <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Syncing...' : 'Sync Playlists'}
        </Button>

        <CreateAIPlaylistModal
          onCreatePlaylist={handleCreatePlaylist}
          isCreating={fetcher.state !== 'idle'}
        />
      </div>
    </div>
  );
};

export default ManagementToolbar;
