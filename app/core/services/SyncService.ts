import { SpotifyService } from './SpotifyService'
import type { TrackRepository } from '../domain/Track'
import type { PlaylistRepository } from '../domain/Playlist'
import { mapSpotifyTrackToTrackInsert, mapToSavedTrackInsert } from '../domain/Track'
import { mapSpotifyPlaylistToPlaylistInsert } from '../domain/Playlist'
import { AppError } from '~/core/errors/AppError'
import { logger } from '~/core/logging/Logger'
import { SYNC_STATUS } from '../repositories/TrackRepository'


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
  ) {}

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
      
      // Get all spotify track IDs
      const spotifyTrackIds = spotifyTracks.map(t => t.track.id)
      
      // Fetch existing tracks
      const existingTracks = await this.trackRepository.getTracksBySpotifyIds(spotifyTrackIds)
      const existingTrackMap = new Map(existingTracks.map(t => [t.spotify_track_id, t]))
      
      // Prepare new tracks for insertion
      const newTracks = spotifyTracks
        .filter(t => !existingTrackMap.has(t.track.id))
        .map(t => mapSpotifyTrackToTrackInsert(t))
      
      // Insert new tracks in batch
      const insertedTracks = newTracks.length > 0 
        ? await this.trackRepository.insertTracks(newTracks)
        : []
      
      // Create map of all tracks (existing + newly inserted)
      const allTracksMap = new Map(existingTracks.map(t => [t.spotify_track_id, t]))
      insertedTracks.forEach(t => allTracksMap.set(t.spotify_track_id, t))
      
      // Prepare saved track associations
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
      
      // Update sync status to failed
      await this.trackRepository.updateSyncStatus(userId, SYNC_STATUS.FAILED)
      
      throw new AppError(
        'Failed to sync tracks',
        'DB_SYNC_ERROR',
        500,
        { cause: error, userId }
      )
    }
  }

  async syncPlaylists(userId: number): Promise<SyncResult> {
    try {
      logger.info('sync playlists start', { userId })

      const spotifyPlaylists = await this.spotifyService.getPlaylists()
      const existingPlaylists = await this.playlistRepository.getPlaylists(userId)
      
      const existingPlaylistIds = new Set(existingPlaylists.map(p => p.spotify_playlist_id))
      const playlists = spotifyPlaylists.map(playlist => 
        mapSpotifyPlaylistToPlaylistInsert(playlist, userId)
      )
      
      logger.debug('save playlists', { 
        total: playlists.length,
        existing: existingPlaylistIds.size 
      })

      await this.playlistRepository.savePlaylists(playlists)

      const newPlaylists = playlists.filter(p => !existingPlaylistIds.has(p.spotify_playlist_id))

      logger.info('sync playlists success', { 
        userId,
        totalPlaylists: playlists.length,
        newPlaylists: newPlaylists.length 
      })

      return {
        type: 'playlists',
        totalProcessed: playlists.length,
        newItems: newPlaylists.length,
        success: true,
        message: `Successfully synced ${newPlaylists.length} new playlists`
      }
    } catch (error) {
      logger.error('sync playlists failed', error as Error, { userId })
      throw new AppError(
        'Failed to sync playlists',
        'DB_SYNC_ERROR',
        500,
        { cause: error, userId }
      )
    }
  }
}
