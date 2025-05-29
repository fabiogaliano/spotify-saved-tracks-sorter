import React from 'react';
import { Button } from '~/shared/components/ui/button';
import { Plus, RefreshCw } from 'lucide-react';
import { useSyncPlaylists } from '../../hooks/useSyncPlaylists';

interface ManagementToolbarProps {
  isSyncing: boolean;
}

const ManagementToolbar: React.FC<ManagementToolbarProps> = ({ isSyncing }) => {
  const { triggerSync } = useSyncPlaylists();

  return (
    <div className="flex flex-col md:flex-row justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-1">Playlist Management</h1>
        <p className="text-muted-foreground">Configure AI flags and manage your playlists</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          className="bg-card border-border text-foreground hover:bg-secondary hover:border-border transition-colors gap-2"
          onClick={triggerSync}
          disabled={isSyncing}
        >
          <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Syncing...' : 'Sync Playlists'}
        </Button>

        <Button
          className="bg-card border-border text-foreground hover:bg-secondary hover:border-border transition-colors gap-2"
        >
          <Plus className="h-4 w-4" /> Create AI Playlist
        </Button>
      </div>
    </div>
  );
};

export default ManagementToolbar;
