import { playlistRepository } from '~/lib/repositories/PlaylistRepository'
import { trackRepository } from '~/lib/repositories/TrackRepository'
import { mapSpotifyPlaylistToPlaylistInsert, Playlist, PlaylistInsert, SpotifyPlaylistDTO } from '~/lib/models/Playlist'
import { mapPlaylistTrackToTrackInsert, SavedTrackRow, SpotifyTrackDTO } from '~/lib/models/Track';
import type { PlaylistWithTracks } from '~/lib/models/Playlist';
import { SpotifyService } from '~/lib/services/SpotifyService';
import { SYNC_STATUS } from '~/lib/repositories/TrackRepository';
import type { Enums } from '~/types/database.types';

import { logger } from '~/lib/logging/Logger';

interface ProcessedPlaylists {
  totalProcessed: number,
  newPlaylists: number,
  updatedPlaylists: number,
  processedPlaylists: Playlist[],
  changes: {
    deleted: { id: number, name: string }[],
    created: { id: number, name: string }[],
    updated: { id: number, name: string }[]
  }
}
export class PlaylistService {
  constructor(
    private spotifyService?: SpotifyService
  ) { }

  async getPlaylists(userId: number): Promise<Playlist[]> {
    return playlistRepository.getPlaylists(userId)
  }

  async getPlaylistsByIds(playlistIds: number[]): Promise<Playlist[]> {
    return playlistRepository.getPlaylistsByIds(playlistIds)
  }

  async getUserPlaylistsWithTracks(userId: number, allTracks: SavedTrackRow[]): Promise<PlaylistWithTracks[]> {
    const userPlaylistTracks = await playlistRepository.getPlaylistTracksByUserId(userId);

    const playlistIds = [...new Set(userPlaylistTracks.map(pt => pt.playlist_id))];
    const playlists = await playlistRepository.getPlaylistsByIds(playlistIds);

    return playlists.map(playlist => {
      const trackIdsForPlaylist = userPlaylistTracks
        .filter(pt => pt.playlist_id === playlist.id)
        .map(pt => pt.track_id);

      const tracksInPlaylist = allTracks
        .filter(savedTrack => trackIdsForPlaylist.includes(savedTrack.track.id));

      return {
        ...playlist,
        tracks: tracksInPlaylist
      };
    });
  }

  async updateSyncStatus(userId: number, status: typeof SYNC_STATUS[keyof typeof SYNC_STATUS]): Promise<void> {
    await playlistRepository.updateSyncStatus(userId, status);
  }

  async updatePlaylistTracksStatus(playlistId: number, status: Enums<'playlist_tracks_sync_status_enum'>): Promise<void> {
    await playlistRepository.updatePlaylistTracksStatus(playlistId, status);
  }

  async getLastSyncTime(userId: number): Promise<string | null> {
    return playlistRepository.getLastSyncTime(userId);
  }

  async getPlaylistTracksLastSyncTime(playlistId: number): Promise<string | null> {
    return playlistRepository.getPlaylistTracksLastSyncTime(playlistId);
  }

  async processSpotifyPlaylists(
    spotifyPlaylists: SpotifyPlaylistDTO[],
    existingPlaylists: Playlist[],
    userId: number,
    lastSyncTime?: string | null
  ): Promise<ProcessedPlaylists> {
    const existingPlaylistMap = new Map(
      existingPlaylists.map(p => [p.spotify_playlist_id, p])
    );

    const deletedPlaylists = existingPlaylists.filter(
      existing => !spotifyPlaylists.some(p => p.id === existing.spotify_playlist_id)
    );

    if (deletedPlaylists.length > 0) {
      logger.info('removing deleted playlists', {
        count: deletedPlaylists.length,
        playlists: deletedPlaylists.map(p => ({ id: p.id, name: p.name }))
      });
      await playlistRepository.deletePlaylists(deletedPlaylists.map(p => p.id));
    }

    // Find playlists that need to be created or updated
    const playlistsToUpdate = spotifyPlaylists.filter(playlist => {
      const existing = existingPlaylistMap.get(playlist.id);

      // If playlist doesn't exist, it needs to be created
      if (!existing) return true;

      // Check if metadata has changed
      const metadataChanged =
        existing.name !== playlist.name ||
        existing.description !== playlist.description;

      // If we have a lastSyncTime and the playlist has a timestamp
      // we can check if it has been updated since the last sync
      if (lastSyncTime && existing.updated_at) {
        // Only update if metadata changed or the playlist was updated after the last sync
        return metadataChanged || new Date(existing.updated_at) > new Date(lastSyncTime);
      }

      // Without lastSyncTime, update if metadata changed
      return metadataChanged;
    });

    // Log info about the update with lastSyncTime details
    logger.info('playlists to update', {
      count: playlistsToUpdate.length,
      total: spotifyPlaylists.length,
      usingLastSyncTime: Boolean(lastSyncTime),
      lastSyncTime: lastSyncTime || 'none'
    });

    let savedPlaylists: Playlist[] = [];
    if (playlistsToUpdate.length > 0) {
      const playlists = playlistsToUpdate.map(playlist =>
        mapSpotifyPlaylistToPlaylistInsert(playlist, userId)
      );
      savedPlaylists = await playlistRepository.savePlaylists(playlists);

      // Update track counts for saved playlists
      const trackCountUpdates = savedPlaylists.map(savedPlaylist => {
        const spotifyPlaylist = playlistsToUpdate.find(p => p.id === savedPlaylist.spotify_playlist_id);
        if (!spotifyPlaylist) return null;
        return {
          id: savedPlaylist.id,
          track_count: spotifyPlaylist.track_count
        };
      }).filter((update): update is { id: number, track_count: number } => update !== null);

      if (trackCountUpdates.length > 0) {
        logger.info('updating track counts for new/updated playlists', { updates: trackCountUpdates });
        await playlistRepository.updatePlaylistTrackCounts(trackCountUpdates);
      }
    }

    // Combine existing (not deleted) and newly saved playlists
    const processedPlaylists = [
      ...existingPlaylists.filter(p => !deletedPlaylists.includes(p)),
      ...savedPlaylists
    ];

    const newCount = savedPlaylists.filter(p => !existingPlaylistMap.has(p.spotify_playlist_id)).length;
    const updatedCount = savedPlaylists.length - newCount;

    // Create simple change summary
    const changes = {
      deleted: deletedPlaylists.map(p => ({ id: p.id, name: p.name })),
      created: savedPlaylists
        .filter(p => !existingPlaylistMap.has(p.spotify_playlist_id))
        .map(p => ({ id: p.id, name: p.name })),
      updated: savedPlaylists
        .filter(p => existingPlaylistMap.has(p.spotify_playlist_id))
        .map(p => ({ id: p.id, name: p.name }))
    };

    return {
      totalProcessed: spotifyPlaylists.length,
      newPlaylists: newCount,
      updatedPlaylists: updatedCount,
      processedPlaylists,
      changes
    };
  }

  async syncPlaylistTracks(
    spotifyPlaylist: SpotifyPlaylistDTO,
    dbPlaylist: Playlist,
    userId: number
  ): Promise<{
    playlistId: number,
    playlistName: string,
    addedCount: number,
    removedCount: number,
    addedTracks: Array<{ name: string, artist: string }>,
    removedTracks: Array<{ id: number, name?: string }>
  }> {
    const spotifyPlaylistTracks = await this.getPlaylistTracks(spotifyPlaylist.id);
    const existingPlaylistTracks = await playlistRepository.getPlaylistTracks(dbPlaylist.id);
    const existingTrackSpotifyIds = new Map(existingPlaylistTracks.map(t => [t.spotify_track_id, t]));

    // Get tracks that need to be added to the playlist
    const newPlaylistTrackLinks = spotifyPlaylistTracks
      .filter(spotifyTrack => !existingTrackSpotifyIds.has(spotifyTrack.track.id))
      .map(spotifyTrack => ({
        playlist_id: dbPlaylist.id,
        spotify_track_id: spotifyTrack.track.id,
        track_id: 0 // Will be updated after track insert
      }));

    if (newPlaylistTrackLinks.length > 0) {
      // First insert any new tracks into the tracks table
      const newTrackRecords = spotifyPlaylistTracks
        .filter(spotifyTrack => !existingTrackSpotifyIds.has(spotifyTrack.track.id))
        .map(spotifyTrack => mapPlaylistTrackToTrackInsert(spotifyTrack.track));

      const insertedTracks = newTrackRecords.length > 0
        ? await trackRepository.insertTracks(newTrackRecords)
        : [];

      // Then get all track IDs to create playlist-track associations
      const dbTrackRecords = await trackRepository.getTracksBySpotifyIds(
        newTrackRecords.map(track => track.spotify_track_id)
      );

      // Create the playlist-track links with proper track IDs
      const playlistTrackAssociations = newPlaylistTrackLinks.map(linkRecord => ({
        playlist_id: dbPlaylist.id,
        track_id: dbTrackRecords.find(dbTrack => dbTrack.spotify_track_id === linkRecord.spotify_track_id)?.id || 0,
        user_id: userId,
        added_at: new Date().toISOString()
      }));

      await playlistRepository.savePlaylistTracks(playlistTrackAssociations);
    }

    // Remove tracks that are no longer in the playlist
    const currentSpotifyTrackIds = new Set(spotifyPlaylistTracks.map(t => t.track.id));
    const trackIdsToRemove = existingPlaylistTracks
      .filter(existingTrack => !currentSpotifyTrackIds.has(existingTrack.spotify_track_id))
      .map(existingTrack => existingTrack.track_id);

    if (trackIdsToRemove.length > 0) {
      await playlistRepository.removePlaylistTracks(dbPlaylist.id, trackIdsToRemove);
    }

    // Get basic info about added tracks
    const addedTracks: Array<{ name: string, artist: string }> = [];
    if (newPlaylistTrackLinks.length > 0) {
      // Get track details from Spotify data
      const addedSpotifyTracks = spotifyPlaylistTracks
        .filter(track => newPlaylistTrackLinks.some(link => link.spotify_track_id === track.track.id))
        .map(track => ({
          name: track.track.name,
          artist: track.track.artists[0]?.name || 'Unknown'
        }));

      addedTracks.push(...addedSpotifyTracks);
    }

    // For removed tracks, we only have the track IDs
    // We'll just return the IDs since getting the names would require additional DB queries
    const removedTracks = trackIdsToRemove.map(trackId => {
      return { id: trackId };
    });

    logger.debug('playlist tracks synced', {
      playlistId: dbPlaylist.id,
      added: newPlaylistTrackLinks.length,
      removed: trackIdsToRemove.length
    });

    return {
      playlistId: dbPlaylist.id,
      playlistName: dbPlaylist.name,
      addedCount: newPlaylistTrackLinks.length,
      removedCount: trackIdsToRemove.length,
      addedTracks,
      removedTracks
    };
  }

  // Use the SpotifyService to get playlist tracks
  private async getPlaylistTracks(playlistId: string): Promise<SpotifyTrackDTO[]> {
    if (this.spotifyService) {
      return this.spotifyService.getPlaylistTracks(playlistId);
    }
    // Fallback if spotifyService is not provided
    return [];
  }
}

export const playlistService = new PlaylistService()
