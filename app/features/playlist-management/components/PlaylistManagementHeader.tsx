import React from 'react';
import { Button } from '~/shared/components/ui/button';
import { Plus, RefreshCw } from 'lucide-react';
import { useFetcher } from 'react-router';
import { useNotificationStore } from '~/lib/stores/notificationStore';

interface PlaylistManagementHeaderProps {
  isSyncing: boolean;
}

const PlaylistManagementHeader: React.FC<PlaylistManagementHeaderProps> = ({ isSyncing }) => {
  const syncFetcher = useFetcher();
  const notify = useNotificationStore();

  return (
    <div className="flex flex-col md:flex-row justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Playlist Management</h1>
        <p className="text-gray-300">Configure AI flags and manage your playlists</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700 hover:border-gray-600 transition-colors gap-2"
          onClick={() => {
            // Use promise-based notification that will automatically update
            notify.promise(
              () => {
                // Submit the form to the sync action
                syncFetcher.submit({}, {
                  method: 'post',
                  action: '/actions/sync-playlists'
                });

                // Return a promise that resolves when the fetcher is done
                return new Promise((resolve, reject) => {
                  const checkStatus = () => {
                    if (syncFetcher.state === 'idle' && syncFetcher.data) {
                      const data = syncFetcher.data as any;
                      if (data.success) {
                        resolve(data);
                      } else {
                        reject(new Error(data.error || 'Failed to sync playlists'));
                      }
                    } else if (syncFetcher.state === 'idle' && syncFetcher.data === undefined) {
                      // No data but idle means something went wrong
                      reject(new Error('No response received'));
                    } else {
                      // Still loading, check again in a moment
                      setTimeout(checkStatus, 500);
                    }
                  };

                  // Start checking status
                  checkStatus();
                });
              },
              {
                loading: 'Syncing playlists...',
                success: (data: any) => data.message || 'Playlists synced successfully',
                error: (err) => err.message || 'Failed to sync playlists'
              }
            );
          }}
          disabled={isSyncing}
        >
          <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Syncing...' : 'Sync Playlists'}
        </Button>

        <Button
          className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700 hover:border-gray-600 transition-colors gap-2"
        >
          <Plus className="h-4 w-4" /> Create AI Playlist
        </Button>
      </div>
    </div>
  );
};

export default PlaylistManagementHeader;
