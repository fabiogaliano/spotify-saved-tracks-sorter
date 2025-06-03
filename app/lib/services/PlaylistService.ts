import { playlistRepository } from '~/lib/repositories/PlaylistRepository'
import { trackRepository } from '~/lib/repositories/TrackRepository'
import { mapSpotifyPlaylistToPlaylistInsert, Playlist, SpotifyPlaylistDTO } from '~/lib/models/Playlist'
import { mapPlaylistTrackToTrackInsert, Track } from '~/lib/models/Track';
import type { PlaylistTrack, PlaylistWithTracks, TrackWithAddedAt } from '~/lib/models/Playlist';
import { SpotifyService } from '~/lib/services/SpotifyService';
import { SYNC_STATUS } from '~/lib/repositories/TrackRepository';
import type { Enums } from '~/types/database.types';
import { getSupabase } from '~/lib/services/DatabaseService';

import { logger } from '~/lib/logging/Logger';

export class PlaylistService {
  constructor(
    private spotifyService: SpotifyService
  ) { }

  async getPlaylists(userId: number): Promise<Playlist[]> {
    return playlistRepository.getPlaylists(userId)
  }

  async getUnflaggedPlaylists(userId: number): Promise<Playlist[]> {
    return playlistRepository.getUnflaggedPlaylists(userId)
  }

  async getFlaggedPlaylists(userId: number): Promise<Playlist[]> {
    return playlistRepository.getFlaggedPlaylists(userId)
  }

  async getPlaylistsByIds(playlistIds: number[]): Promise<Playlist[]> {
    return playlistRepository.getPlaylistsByIds(playlistIds)
  }

  async createAndSavePlaylist(name: string, description: string, userId: number): Promise<Playlist> {
    // Create playlist in Spotify
    const spotifyPlaylist = await this.spotifyService.createPlaylist(name, description)

    // Create DTO for database save
    const spotifyPlaylistDTO: SpotifyPlaylistDTO = {
      id: spotifyPlaylist.id,
      name: spotifyPlaylist.name,
      description: description,
      is_flagged: description.startsWith('AI:'),
      owner: { id: '' }, // Will be filled by the repository
      track_count: 0
    }

    // Save to database
    const playlistInsert = mapSpotifyPlaylistToPlaylistInsert(spotifyPlaylistDTO, userId)
    const savedPlaylists = await playlistRepository.savePlaylists([playlistInsert])
    const savedPlaylist = savedPlaylists[0]

    if (!savedPlaylist) {
      throw new Error('Failed to save playlist to database')
    }

    return savedPlaylist
  }

  async getAIEnabledPlaylistsWithTracks(userId: number): Promise<PlaylistWithTracks[]> {
    try {
      const aiEnabledPlaylists = await playlistRepository.getFlaggedPlaylists(userId);
      const userPlaylistTracks = await playlistRepository.getPlaylistTracksByUserId(userId);

      const playlistTracksMap = createPlaylistTracksMap(userPlaylistTracks);
      const trackMap = await createTrackLookupMap(userPlaylistTracks);

      const results = await buildPlaylistsWithTracks(aiEnabledPlaylists, playlistTracksMap, trackMap);

      return extractSuccessfulResults(results);
    } catch (error) {
      logger.error(`Error in getAIEnabledPlaylistsWithTracks: ${error}`);
      return [];
    }

    // Helper functions
    function createPlaylistTracksMap(playlistTracks: PlaylistTrack[]): PlaylistTracksMap {
      return playlistTracks.reduce((map, pt) => {
        if (!map.has(pt.playlist_id)) map.set(pt.playlist_id, [])

        map.get(pt.playlist_id)!.push({ trackId: pt.track_id, addedAt: pt.added_at });
        return map;
      }, new Map<PlaylistId, Array<{ trackId: TrackId, addedAt: AddedAt }>>());
    }

    async function createTrackLookupMap(playlistTracks: any[]): Promise<Map<TrackId, Track>> {
      const allTrackIds = [...new Set(playlistTracks.map(pt => pt.track_id))];
      const allTracks = await trackRepository.getTracksByIds(allTrackIds);
      return new Map(allTracks.map(track => [track.id, track]));
    }

    function mapPlaylistTracksToTracks(
      playlistTracks: Array<{ trackId: TrackId; addedAt: AddedAt }>,
      trackMap: Map<TrackId, Track>
    ): TrackWithAddedAt[] {
      return playlistTracks.flatMap(pt => {
        const track = trackMap.get(pt.trackId);
        if (!track) return [];
        const { created_at, ...baseTrack } = track;
        return [{ ...baseTrack, added_at: pt.addedAt }];
      });
    }

    async function buildPlaylistsWithTracks(
      playlists: Playlist[],
      playlistTracksMap: Map<PlaylistId, Array<{ trackId: TrackId, addedAt: AddedAt }>>,
      trackMap: Map<TrackId, Track>
    ): Promise<PromiseSettledResult<PlaylistWithTracks>[]> {
      return Promise.allSettled(
        playlists.map(async playlist => {
          try {
            const playlistTracks = playlistTracksMap.get(playlist.id) ?? [];
            const tracks = mapPlaylistTracksToTracks(playlistTracks, trackMap);

            return {
              ...playlist,
              tracks
            };
          } catch (error) {
            logger.error(`Error processing playlist ${playlist.id}: ${error}`);
            return {
              ...playlist,
              tracks: []
            };
          }
        })
      );
    }

    function extractSuccessfulResults(results: PromiseSettledResult<PlaylistWithTracks>[]): PlaylistWithTracks[] {
      return results
        .filter((result): result is PromiseFulfilledResult<PlaylistWithTracks> =>
          result.status === 'fulfilled')
        .map(result => result.value);
    }
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
    return playlistRepository.getPlaylistTracksLastSyncTime(playlistId)
  }

  async getPlaylistTracks(playlistId: number): Promise<TrackWithAddedAt[]> {
    try {
      // First, get all playlist-track associations for this playlist
      const { data, error } = await getSupabase()
        .from('playlist_tracks')
        .select('*')
        .eq('playlist_id', playlistId);

      if (error) throw error;
      const playlistTracks = data || [];

      if (playlistTracks.length === 0) {
        return [];
      }

      // Extract track IDs to fetch full track details
      const trackIds = playlistTracks.map(pt => pt.track_id);

      // Get the full track details
      const tracks = await trackRepository.getTracksByIds(trackIds);

      // Create a map for quick lookups
      const trackMap = new Map(tracks.map(track => [track.id, track]));

      // Create a map of track ID to added_at date
      const addedAtMap = new Map(playlistTracks.map(pt => [pt.track_id, pt.added_at]));

      // Use the same mapPlaylistTracksToTracks pattern as in getAIEnabledPlaylistsWithTracks
      const mappedTracks = tracks.flatMap(track => {
        const addedAt = addedAtMap.get(track.id);
        if (!addedAt) return [];

        const { created_at, ...baseTrack } = track;
        return [{
          ...baseTrack,
          added_at: addedAt
          // The Track model already has correct fields: name, artist, album
        }];
      });

      return mappedTracks;
    } catch (error) {
      logger.error(`Error getting tracks for playlist ${playlistId}: ${error}`);
      return [];
    }
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
  ): Promise<PlaylistTracksSyncResult> {
    const spotifyPlaylistTracks = await this.spotifyService.getPlaylistTracks(spotifyPlaylist.id);
    const existingPlaylistTracks = await playlistRepository.getPlaylistTracks(dbPlaylist.id);
    const existingTrackSpotifyIds = new Map(existingPlaylistTracks.map(t => [t.spotify_track_id, t]));

    // Get tracks that need to be added to the playlist
    const newPlaylistTrackLinks = spotifyPlaylistTracks
      .filter(spotifyTrack => !existingTrackSpotifyIds.has(spotifyTrack.track.id))
      .map(spotifyTrack => ({
        playlist_id: dbPlaylist.id,
        spotify_track_id: spotifyTrack.track.id,
        track_id: 0,// updated after track insert
        added_at: spotifyTrack.added_at
      }));

    if (newPlaylistTrackLinks.length > 0) {
      // first insert any new tracks into the tracks table
      const newTrackRecords = spotifyPlaylistTracks
        .filter(spotifyTrack => !existingTrackSpotifyIds.has(spotifyTrack.track.id))
        .map(spotifyTrack => mapPlaylistTrackToTrackInsert(spotifyTrack.track));

      // then get all track IDs to create playlist-track associations
      const dbTrackRecords = await trackRepository.getTracksBySpotifyIds(
        newTrackRecords.map(track => track.spotify_track_id)
      );

      // create the playlist-track links with proper track IDs
      const playlistTrackAssociations = newPlaylistTrackLinks.map(linkRecord => ({
        playlist_id: dbPlaylist.id,
        track_id: dbTrackRecords.find(dbTrack => dbTrack.spotify_track_id === linkRecord.spotify_track_id)?.id || 0,
        user_id: userId,
        added_at: linkRecord.added_at
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
}

type TrackId = PlaylistTrack['track_id'];
type AddedAt = PlaylistTrack['added_at'];
type PlaylistId = PlaylistTrack['playlist_id'];
type PlaylistTracksMap = Map<PlaylistId, Array<{ trackId: TrackId, addedAt: AddedAt }>>;

interface PlaylistTracksSyncResult {
  playlistId: number,
  playlistName: string,
  addedCount: number,
  removedCount: number,
  addedTracks: Array<{ name: string, artist: string }>,
  removedTracks: Array<{ id: number, name?: string }>
}

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