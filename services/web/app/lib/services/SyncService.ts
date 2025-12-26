import { SpotifyService } from './SpotifyService'
import { TrackService } from './TrackService'
import { logger } from '~/lib/logging/Logger'
import { SYNC_STATUS } from '~/lib/repositories/TrackRepository'
import { PlaylistService } from './PlaylistService'
import { savedTrackRepository } from '~/lib/repositories/SavedTrackRepository'
import type { Playlist, SpotifyPlaylistDTO } from '~/lib/models/Playlist'
import type { TrackWithAnalysis } from '~/lib/models/Track'

// Base interface for all sync operations
export interface SyncResult {
  type: string
  totalProcessed: number
  newItems: number
  success: boolean
  message?: string
  details?: SyncDetails
  newTracks?: TrackWithAnalysis[] // The newly added tracks with analysis data
}

export type SyncDetails = {
  noPlaylists?: boolean
};

export interface PlaylistSyncDetails extends SyncDetails {
  playlists?: {
    deleted: Array<{ id: number, name: string }>,
    created: Array<{ id: number, name: string }>,
    updated: Array<{ id: number, name: string }>
  },
  autoSyncedTracks?: null | {
    tracksChanged: Array<{
      id: number,
      name: string,
      added: number,
      removed: number,
      addedTracks: Array<{ name: string, artist: string }>,
      removedTracks: Array<{ id: number, name?: string }>
    }>,
    totalTracksAdded: number,
    totalTracksRemoved: number
  },
  stats: {
    newPlaylists: number,
    updatedPlaylists: number,
    aiPlaylistsChecked: number,
    tracksAdded: number,
    tracksRemoved: number
  }
}

// Playlist-specific sync result
export interface PlaylistSyncResult extends SyncResult {
  details?: PlaylistSyncDetails
};

export class SyncService {
  constructor(
    private spotifyService: SpotifyService,
    private trackService: TrackService,
    private playlistService: PlaylistService
  ) { }

  async syncSavedTracks(userId: number): Promise<SyncResult> {
    try {
      await this.trackService.updateSyncStatus(userId, SYNC_STATUS.IN_PROGRESS)

      // Fetch ALL liked tracks from Spotify (no filter) to enable removal detection
      const spotifyTracks = await this.spotifyService.getLikedTracks()
      const spotifyTrackIds = new Set(spotifyTracks.map(t => t.track.id))

      // Get existing saved tracks from DB
      const dbSavedTracks = await savedTrackRepository.getSavedTrackSpotifyIds(userId)
      const dbSpotifyIds = new Set(dbSavedTracks.map(t => t.spotifyTrackId))

      // Find tracks to remove (in DB but not in Spotify)
      const tracksToRemove = dbSavedTracks.filter(t => !spotifyTrackIds.has(t.spotifyTrackId))
      let removedCount = 0
      if (tracksToRemove.length > 0) {
        removedCount = await savedTrackRepository.removeUnlikedTracks(
          userId,
          tracksToRemove.map(t => t.trackId)
        )
        logger.info('removed unliked tracks', { userId, count: removedCount })
      }

      // Find new tracks to add (in Spotify but not in DB)
      const newSpotifyTracks = spotifyTracks.filter(t => !dbSpotifyIds.has(t.track.id))

      if (newSpotifyTracks.length === 0 && removedCount === 0) {
        await this.trackService.updateSyncStatus(userId, SYNC_STATUS.COMPLETED)
        return {
          type: 'tracks',
          totalProcessed: spotifyTracks.length,
          newItems: 0,
          success: true,
          message: 'Library is up to date',
          newTracks: []
        }
      }

      // Process and save new tracks
      let newSavedTracks: TrackWithAnalysis[] = []
      if (newSpotifyTracks.length > 0) {
        const { totalProcessed, newTracks, processedTracks } = await this.trackService.processSpotifyTracks(newSpotifyTracks)
        newSavedTracks = await this.trackService.saveSavedTracksForUser(userId, newSpotifyTracks, processedTracks)
      }

      await this.trackService.updateSyncStatus(userId, SYNC_STATUS.COMPLETED)

      const messages: string[] = []
      if (newSavedTracks.length > 0) {
        messages.push(`added ${newSavedTracks.length} new song${newSavedTracks.length === 1 ? '' : 's'}`)
      }
      if (removedCount > 0) {
        messages.push(`removed ${removedCount} unliked song${removedCount === 1 ? '' : 's'}`)
      }

      return {
        type: 'tracks',
        totalProcessed: spotifyTracks.length,
        newItems: newSavedTracks.length,
        success: true,
        message: messages.length > 0 ? `Successfully ${messages.join(', ')}` : 'Library is up to date',
        newTracks: newSavedTracks
      }
    } catch (error) {
      await this.trackService.updateSyncStatus(userId, SYNC_STATUS.FAILED)

      throw new logger.AppError(
        'Failed to sync tracks',
        'DB_SYNC_ERROR',
        500,
        { cause: error, userId }
      )
    }
  }

  async syncPlaylists(userId: number): Promise<PlaylistSyncResult> {
    logger.info('sync playlists start', { userId });
    try {
      await this.playlistService.updateSyncStatus(userId, SYNC_STATUS.IN_PROGRESS);
      const lastSyncTime = await this.playlistService.getLastSyncTime(userId);

      const spotifyPlaylists = await this.spotifyService.getPlaylists();
      if (!spotifyPlaylists.length) {
        await this.playlistService.updateSyncStatus(userId, SYNC_STATUS.COMPLETED);
        return {
          type: 'playlists',
          totalProcessed: 0,
          newItems: 0,
          success: true,
          details: {
            noPlaylists: true,
            stats: {
              newPlaylists: 0,
              updatedPlaylists: 0,
              aiPlaylistsChecked: 0,
              tracksAdded: 0,
              tracksRemoved: 0
            }
          }
        };
      }

      const existingPlaylists = await this.playlistService.getPlaylists(userId);

      // Pass lastSyncTime to processSpotifyPlaylists to use for optimizing updates
      const {
        totalProcessed,
        newPlaylists,
        updatedPlaylists,
        processedPlaylists,
        changes
      } = await this.playlistService.processSpotifyPlaylists(
        spotifyPlaylists,
        existingPlaylists,
        userId,
        lastSyncTime
      );

      // Check for playlists that should be auto-synced
      const playlistsForAutoSync = processedPlaylists.filter(
        playlist => playlist.description && playlist.description.startsWith("AI:")
      );

      // If we have any playlists for auto-sync, sync their tracks
      let autoSyncResults = null;
      if (playlistsForAutoSync.length > 0) {
        logger.info('auto syncing tracks for AI playlists', {
          count: playlistsForAutoSync.length,
          playlists: playlistsForAutoSync.map(p => ({ id: p.id, name: p.name }))
        });

        // Sync tracks for AI playlists automatically
        const playlistIds = playlistsForAutoSync.map(p => p.id);
        // Use the simplified method (only need user ID and playlist IDs)
        autoSyncResults = await this.syncPlaylistTracks(userId, playlistIds);
      }

      const tracksAdded = autoSyncResults?.details?.totalTracksAdded || 0;
      const tracksRemoved = autoSyncResults?.details?.totalTracksRemoved || 0;

      const syncDetails: PlaylistSyncDetails = {
        playlists: changes,
        autoSyncedTracks: autoSyncResults?.details ?? null,
        stats: {
          newPlaylists,
          updatedPlaylists,
          aiPlaylistsChecked: playlistsForAutoSync.length,
          tracksAdded,
          tracksRemoved
        }
      };

      await this.playlistService.updateSyncStatus(userId, SYNC_STATUS.COMPLETED);

      return {
        type: 'playlists',
        totalProcessed,
        newItems: newPlaylists,
        success: true,
        details: syncDetails
      };
    } catch (error) {
      await this.playlistService.updateSyncStatus(userId, SYNC_STATUS.FAILED);
      throw new logger.AppError(
        'Failed to sync playlists',
        'DB_SYNC_ERROR',
        500,
        { cause: error, userId }
      );
    }
  }

  async syncPlaylistTracks(
    userId: number,
    playlistIds?: number[] // Optional array of playlist IDs to sync. If not provided, syncs all user's playlists
  ): Promise<SyncResult & { details?: any }> {
    logger.info('sync playlist tracks start', {
      userId,
      specificPlaylists: Boolean(playlistIds),
      playlistIds
    });

    try {
      // Get the playlists we need to sync from the database
      let dbPlaylists: Playlist[];
      if (playlistIds && playlistIds.length > 0) {
        // Only get the specific playlists requested
        dbPlaylists = await this.playlistService.getPlaylistsByIds(playlistIds);
        logger.info('fetched specific playlists', { count: dbPlaylists.length, requestedIds: playlistIds });
      } else {
        // Get all user playlists
        dbPlaylists = await this.playlistService.getPlaylists(userId);
        logger.info('fetched all user playlists', { count: dbPlaylists.length });
      }

      if (dbPlaylists.length === 0) {
        return {
          type: 'playlist_tracks',
          totalProcessed: 0,
          newItems: 0,
          success: true,
          message: 'No playlists to sync tracks for',
          details: { noPlaylists: true }
        };
      }

      // For each selected playlist, sync its tracks
      let syncedTracksCount = 0;
      const playlistTrackChanges = [];

      for (const dbPlaylist of dbPlaylists) {
        // Update the tracks sync status for this playlist
        await this.playlistService.updatePlaylistTracksStatus(dbPlaylist.id, 'IN_PROGRESS');

        // Create a minimal Spotify playlist object with just the required information
        // This avoids needing to fetch the playlist from Spotify API again
        // The only thing we really need is the spotify_playlist_id, which we use
        // to fetch the tracks directly from Spotify API in the PlaylistService
        const spotifyPlaylist: SpotifyPlaylistDTO = {
          id: dbPlaylist.spotify_playlist_id,
          name: dbPlaylist.name,
          track_count: dbPlaylist.track_count
        } as SpotifyPlaylistDTO;

        // Get last sync time for this playlist's tracks
        const lastSyncTime = await this.playlistService.getPlaylistTracksLastSyncTime(dbPlaylist.id);

        // Determine if playlist needs track syncing based on:
        // 1. No previous sync time (first sync)
        // 2. Forced sync (playlistIds provided)
        const needsTrackSync =
          Boolean(playlistIds) || // Force sync if specific playlist IDs were provided
          !lastSyncTime;

        if (needsTrackSync) {
          try {
            const trackChanges = await this.playlistService.syncPlaylistTracks(spotifyPlaylist, dbPlaylist, userId);
            playlistTrackChanges.push(trackChanges);
            syncedTracksCount++;
            await this.playlistService.updatePlaylistTracksStatus(dbPlaylist.id, 'COMPLETED');
          } catch (error) {
            // Extract error message safely - handle non-Error objects from Spotify SDK
            const errorMessage = error instanceof Error
              ? error.message
              : (typeof error === 'object' && error !== null && 'message' in error)
                ? String((error as { message: unknown }).message)
                : 'Unknown error';

            const errorContext = {
              errorMessage,
              errorName: error instanceof Error ? error.name : typeof error,
              playlistName: dbPlaylist.name,
              playlistId: dbPlaylist.id,
              spotifyPlaylistId: dbPlaylist.spotify_playlist_id,
              userId
            };

            logger.error('Playlist track sync failed', error instanceof Error ? error : undefined, errorContext);
            await this.playlistService.updatePlaylistTracksStatus(dbPlaylist.id, 'FAILED');
            // Continue with other playlists instead of failing the entire sync
          }
        } else {
          // If no sync needed, still mark as completed
          await this.playlistService.updatePlaylistTracksStatus(dbPlaylist.id, 'COMPLETED');
        }
      }

      const totalTracksAdded = playlistTrackChanges.reduce((sum, change) => sum + change.addedCount, 0);
      const totalTracksRemoved = playlistTrackChanges.reduce((sum, change) => sum + change.removedCount, 0);

      const syncDetails = {
        tracksChanged: playlistTrackChanges.map(change => ({
          id: change.playlistId,
          name: change.playlistName,
          added: change.addedCount,
          removed: change.removedCount,
          addedTracks: change.addedTracks,
          removedTracks: change.removedTracks
        })),
        totalTracksAdded,
        totalTracksRemoved
      };

      // Log summary only (without individual track names to avoid verbose logs)
      logger.info('sync playlist tracks success', {
        userId,
        syncedPlaylists: syncedTracksCount,
        tracksAdded: totalTracksAdded,
        tracksRemoved: totalTracksRemoved,
        playlistsWithChanges: playlistTrackChanges
          .filter(c => c.addedCount > 0 || c.removedCount > 0)
          .map(c => ({ id: c.playlistId, name: c.playlistName, added: c.addedCount, removed: c.removedCount }))
      });

      // Build a more accurate message
      let syncMessage = '';
      if (syncedTracksCount === 0) {
        syncMessage = `No tracks needed syncing for ${dbPlaylists.length} playlists`;
      } else if (totalTracksAdded === 0 && totalTracksRemoved === 0) {
        syncMessage = `Verified tracks for ${syncedTracksCount} playlists (no changes needed)`;
      } else {
        syncMessage = `Successfully synced tracks for ${syncedTracksCount} playlists`;
        if (totalTracksAdded > 0 || totalTracksRemoved > 0) {
          syncMessage += ` (${totalTracksAdded} tracks added`;
          if (totalTracksRemoved > 0) {
            syncMessage += `, ${totalTracksRemoved} removed`;
          }
          syncMessage += ')';
        }
      }

      return {
        type: 'playlist_tracks',
        totalProcessed: dbPlaylists.length,
        newItems: totalTracksAdded,
        success: true,
        message: syncMessage,
        details: syncDetails
      };
    } catch (error) {
      throw new logger.AppError(
        'Failed to sync playlist tracks',
        'DB_SYNC_ERROR',
        500,
        { cause: error, userId }
      );
    }
  }
}