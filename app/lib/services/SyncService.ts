import { SpotifyService } from './SpotifyService'
import type { TrackRepository } from '~/lib/models/Track'
import type { Playlist, PlaylistRepository, SpotifyPlaylistDTO } from '~/lib/models/Playlist'
import { mapSpotifyTrackDTOToTrackInsert, mapToSavedTrackInsert, mapPlaylistTrackToTrackInsert } from '~/lib/models/Track'
import { mapSpotifyPlaylistToPlaylistInsert } from '~/lib/models/Playlist'
import { logger } from '~/lib/logging/Logger'
import { SYNC_STATUS } from '~/lib/repositories/TrackRepository'


export interface SyncResult {
  type: string
  totalProcessed: number
  newItems: number
  success: boolean
  message: string
}

export class SyncService {
  constructor(
    private spotifyService: SpotifyService,
    private trackRepository: TrackRepository,
    private playlistRepository: PlaylistRepository
  ) { }

  async syncSavedTracks(userId: number): Promise<SyncResult> {
    try {
      logger.info('sync saved tracks start', { userId })

      await this.trackRepository.updateSyncStatus(userId, SYNC_STATUS.IN_PROGRESS)

      // get last sync time for incremental sync
      const lastSyncTime = await this.trackRepository.getLastSyncTime(userId)
      const spotifyTracks = await this.spotifyService.getLikedTracks(lastSyncTime)

      if (!spotifyTracks.length) {
        await this.trackRepository.updateSyncStatus(userId, SYNC_STATUS.COMPLETED)
        return {
          type: 'tracks',
          totalProcessed: 0,
          newItems: 0,
          success: true,
          message: 'No new tracks to sync'
        }
      }

      logger.info('process tracks', { trackCount: spotifyTracks.length })

      const spotifyTrackIds = spotifyTracks.map(t => t.track.id)

      const existingTracks = await this.trackRepository.getTracksBySpotifyIds(spotifyTrackIds)
      const existingTrackMap = new Map(existingTracks.map(t => [t.spotify_track_id, t]))

      const newTracks = spotifyTracks
        .filter(t => !existingTrackMap.has(t.track.id))
        .map(t => mapSpotifyTrackDTOToTrackInsert(t))

      const insertedTracks = newTracks.length > 0
        ? await this.trackRepository.insertTracks(newTracks)
        : []

      const allTracksMap = new Map(existingTracks.map(t => [t.spotify_track_id, t]))
      insertedTracks.forEach(t => allTracksMap.set(t.spotify_track_id, t))

      const savedTracks = spotifyTracks.map(spotifyTrack =>
        mapToSavedTrackInsert(
          allTracksMap.get(spotifyTrack.track.id)!.id,
          userId,
          spotifyTrack.added_at
        )
      )

      await this.trackRepository.saveSavedTracks(savedTracks)

      logger.info('sync saved tracks success', {
        userId,
        totalTracks: spotifyTracks.length,
        newTracks: insertedTracks.length
      })

      await this.trackRepository.updateSyncStatus(userId, SYNC_STATUS.COMPLETED)

      return {
        type: 'tracks',
        totalProcessed: spotifyTracks.length,
        newItems: insertedTracks.length,
        success: true,
        message: `Successfully synced ${insertedTracks.length} new tracks`
      }
    } catch (error) {
      logger.error('sync saved tracks failed', error as Error, { userId })

      await this.trackRepository.updateSyncStatus(userId, SYNC_STATUS.FAILED)

      throw new logger.AppError(
        'Failed to sync tracks',
        'DB_SYNC_ERROR',
        500,
        { cause: error, userId }
      )
    }
  }

  async syncPlaylists(userId: number): Promise<SyncResult> {
    logger.info('sync playlists start', { userId })
    try {
      await this.playlistRepository.updateSyncStatus(userId, SYNC_STATUS.IN_PROGRESS)
      const lastSyncTime = await this.playlistRepository.getLastSyncTime(userId)

      const spotifyPlaylists = await this.spotifyService.getPlaylists()
      const existingPlaylists = await this.playlistRepository.getPlaylists(userId)

      const existingPlaylistMap = new Map(
        existingPlaylists.map(p => [p.spotify_playlist_id, p])
      )

      const deletedPlaylistsCount = await this.handleDeletedPlaylists(existingPlaylists, spotifyPlaylists)

      const { newCount, updatedCount } = await this.syncNewAndUpdatedPlaylists(spotifyPlaylists, existingPlaylistMap, userId)
      const syncedTracksCount = await this.syncExistingPlaylistTracks(spotifyPlaylists, existingPlaylistMap, lastSyncTime, userId)

      await this.updateTrackCounts(spotifyPlaylists, existingPlaylistMap)

      logger.info('sync playlists success', {
        userId,
        totalPlaylists: spotifyPlaylists.length,
        newPlaylists: newCount,
        syncedTracks: syncedTracksCount,
        deletedPlaylists: deletedPlaylistsCount
      })

      await this.playlistRepository.updateSyncStatus(userId, SYNC_STATUS.COMPLETED)

      return {
        type: 'playlists',
        totalProcessed: spotifyPlaylists.length,
        newItems: newCount,
        success: true,
        message: `Successfully synced ${newCount} new playlists and updated tracks for ${syncedTracksCount} playlists`
      }
    } catch (error) {
      logger.error('sync playlists failed', error as Error, { userId })
      await this.playlistRepository.updateSyncStatus(userId, SYNC_STATUS.FAILED)
      throw new logger.AppError(
        'Failed to sync playlists',
        'DB_SYNC_ERROR',
        500,
        { cause: error, userId }
      )
    }
  }

  private async syncPlaylistTracks(spotifyPlaylist: SpotifyPlaylistDTO, dbPlaylist: Playlist, userId: number): Promise<void> {
    try {
      const spotifyPlaylistTracks = await this.spotifyService.getPlaylistTracks(spotifyPlaylist.id)
      const existingPlaylistTracks = await this.playlistRepository.getPlaylistTracks(dbPlaylist.id)
      const existingTrackSpotifyIds = new Map(existingPlaylistTracks.map(t => [t.spotify_track_id, t]))

      // Get tracks that need to be added to the playlist
      const newPlaylistTrackLinks = spotifyPlaylistTracks
        .filter(spotifyTrack => !existingTrackSpotifyIds.has(spotifyTrack.track.id))
        .map(spotifyTrack => ({
          playlist_id: dbPlaylist.id,
          spotify_track_id: spotifyTrack.track.id,
          track_id: 0 // Will be updated after track insert
        }))

      if (newPlaylistTrackLinks.length > 0) {
        // First insert any new tracks into the tracks table
        const newTrackRecords = spotifyPlaylistTracks
          .filter(spotifyTrack => !existingTrackSpotifyIds.has(spotifyTrack.track.id))
          .map(spotifyTrack => mapPlaylistTrackToTrackInsert(spotifyTrack.track))

        const insertedTracks = newTrackRecords.length > 0
          ? await this.trackRepository.insertTracks(newTrackRecords)
          : []

        // Then get all track IDs to create playlist-track associations
        const dbTrackRecords = await this.trackRepository.getTracksBySpotifyIds(
          newTrackRecords.map(track => track.spotify_track_id)
        )

        // Create the playlist-track links with proper track IDs
        const playlistTrackAssociations = newPlaylistTrackLinks.map(linkRecord => ({
          playlist_id: dbPlaylist.id,
          track_id: dbTrackRecords.find(dbTrack => dbTrack.spotify_track_id === linkRecord.spotify_track_id)?.id || 0,
          user_id: userId,
          added_at: new Date().toISOString()
        }))

        await this.playlistRepository.savePlaylistTracks(playlistTrackAssociations)
      }

      // Remove tracks that are no longer in the playlist
      const currentSpotifyTrackIds = new Set(spotifyPlaylistTracks.map(t => t.track.id))
      const trackIdsToRemove = existingPlaylistTracks
        .filter(existingTrack => !currentSpotifyTrackIds.has(existingTrack.spotify_track_id))
        .map(existingTrack => existingTrack.track_id)

      if (trackIdsToRemove.length > 0) {
        await this.playlistRepository.removePlaylistTracks(dbPlaylist.id, trackIdsToRemove)
      }

      logger.debug('playlist tracks synced', {
        playlistId: dbPlaylist.id,
        added: newPlaylistTrackLinks.length,
        removed: trackIdsToRemove.length
      })
    } catch (error) {
      logger.error('sync playlist tracks failed', error as Error)
      throw error
    }
  }

  private async handleDeletedPlaylists(
    existingPlaylists: Playlist[],
    spotifyPlaylists: SpotifyPlaylistDTO[]
  ): Promise<number> {
    const deletedPlaylists = existingPlaylists.filter(
      existing => !spotifyPlaylists.some(p => p.id === existing.spotify_playlist_id)
    )

    if (deletedPlaylists.length > 0) {
      logger.info('removing deleted playlists', {
        count: deletedPlaylists.length,
        playlists: deletedPlaylists.map(p => ({ id: p.id, name: p.name }))
      })
      await this.playlistRepository.deletePlaylists(deletedPlaylists.map(p => p.id))
    }
    return deletedPlaylists.length
  }

  private async updateTrackCounts(
    spotifyPlaylists: SpotifyPlaylistDTO[],
    existingPlaylistMap: Map<string, Playlist>
  ): Promise<void> {
    const trackCountUpdates = spotifyPlaylists
      .map(playlist => {
        const existingPlaylist = existingPlaylistMap.get(playlist.id)
        if (existingPlaylist && existingPlaylist.track_count !== playlist.track_count) {
          return {
            id: existingPlaylist.id,
            track_count: playlist.track_count
          }
        }
        return null
      })
      .filter((update): update is { id: number, track_count: number } => update !== null)

    if (trackCountUpdates.length > 0) {
      logger.info('updating track counts', { updates: trackCountUpdates })
      await this.playlistRepository.updatePlaylistTrackCounts(trackCountUpdates)
    }
  }

  private async syncNewAndUpdatedPlaylists(
    spotifyPlaylists: SpotifyPlaylistDTO[],
    existingPlaylistMap: Map<string, Playlist>,
    userId: number
  ): Promise<{ newCount: number, updatedCount: number }> {
    const playlistsToUpdate = spotifyPlaylists.filter(playlist =>
      this.needsUpdate(playlist, existingPlaylistMap.get(playlist.id))
    )

    if (playlistsToUpdate.length === 0) {
      return { newCount: 0, updatedCount: 0 }
    }

    const playlists = playlistsToUpdate.map(playlist =>
      mapSpotifyPlaylistToPlaylistInsert(playlist, userId)
    )
    const newCount = playlists.filter(p => !existingPlaylistMap.has(p.spotify_playlist_id)).length
    const savedPlaylists = await this.playlistRepository.savePlaylists(playlists)

    // Update track counts for saved playlists
    const trackCountUpdates = savedPlaylists.map(savedPlaylist => {
      const spotifyPlaylist = playlistsToUpdate.find(p => p.id === savedPlaylist.spotify_playlist_id)
      if (!spotifyPlaylist) return null
      return {
        id: savedPlaylist.id,
        track_count: spotifyPlaylist.track_count
      }
    }).filter((update): update is { id: number, track_count: number } => update !== null)

    if (trackCountUpdates.length > 0) {
      logger.info('updating track counts for new/updated playlists', { updates: trackCountUpdates })
      await this.playlistRepository.updatePlaylistTrackCounts(trackCountUpdates)
    }

    await Promise.all(savedPlaylists.map(async playlist => {
      const spotifyPlaylist = playlistsToUpdate.find(p => p.id === playlist.spotify_playlist_id)
      if (!spotifyPlaylist) return

      logger.info('syncing tracks for new playlist', {
        playlistId: playlist.id,
        spotifyId: playlist.spotify_playlist_id,
        name: playlist.name
      })
      await this.syncPlaylistTracks(spotifyPlaylist, playlist, userId)
    }))

    return { newCount, updatedCount: playlistsToUpdate.length - newCount }
  }

  private async syncExistingPlaylistTracks(
    spotifyPlaylists: SpotifyPlaylistDTO[],
    existingPlaylistMap: Map<string, Playlist>,
    lastSyncTime: string | null,
    userId: number
  ): Promise<number> {
    const playlistsNeedingTrackSync = spotifyPlaylists.filter(playlist => {
      const existing = existingPlaylistMap.get(playlist.id)
      return existing && this.needsTrackSync(playlist, existing, lastSyncTime)
    })

    for (const playlist of playlistsNeedingTrackSync) {
      const dbPlaylist = existingPlaylistMap.get(playlist.id)
      if (dbPlaylist) {
        await this.syncPlaylistTracks(playlist, dbPlaylist, userId)
      }
    }

    return playlistsNeedingTrackSync.length
  }

  private needsUpdate(playlist: SpotifyPlaylistDTO, existing: Playlist | undefined): boolean {
    return !existing ||
      existing.name !== playlist.name ||
      existing.description !== (playlist.description || '') ||
      existing.track_count !== playlist.track_count
  }

  private needsTrackSync(playlist: SpotifyPlaylistDTO, existing: Playlist | undefined, lastSyncTime: string | null): boolean {
    return !existing ||
      existing.track_count !== (playlist.tracks?.total ?? 0) ||
      (lastSyncTime && existing.updated_at ? new Date(existing.updated_at) < new Date(lastSyncTime) : false)
  }
}
