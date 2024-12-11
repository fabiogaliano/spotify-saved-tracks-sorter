import { SpotifyService } from './SpotifyService'
import type { TrackRepository } from '../domain/Track'
import type { PlaylistRepository } from '../domain/Playlist'
import { mapSpotifyTrackToTrackInsert, mapToSavedTrackInsert } from '../domain/Track'
import { mapSpotifyPlaylistToPlaylistInsert } from '../domain/Playlist'
import { AppError } from '~/core/errors/AppError'
import { logger } from '~/core/logging/Logger'

export interface SyncResult {
  type: 'tracks' | 'playlists'
  totalProcessed: number
  newItems: number
  error?: string
}

export class SyncService {
  constructor(
    private spotifyService: SpotifyService,
    private trackRepository: TrackRepository,
    private playlistRepository: PlaylistRepository
  ) {}

  async syncSavedTracks(userId: number): Promise<SyncResult> {
    try {
      logger.info('Starting saved tracks sync', { userId })
      const spotifyTracks = await this.spotifyService.getLikedTracks()
      let newTracks = 0
      
      logger.info(`Processing ${spotifyTracks.length} tracks`, { userId })
      
      // Process each track
      for (const spotifyTrack of spotifyTracks) {
        try {
          // First, ensure the track exists in the general tracks table
          let track = await this.trackRepository.getTrackBySpotifyId(spotifyTrack.track.id)
          
          if (!track) {
            // Insert the track if it doesn't exist
            logger.debug('Inserting new track', { 
              spotifyId: spotifyTrack.track.id,
              name: spotifyTrack.track.name 
            })
            const trackInsert = mapSpotifyTrackToTrackInsert(spotifyTrack)
            track = await this.trackRepository.insertTrack(trackInsert)
            newTracks++
          }
          
          // Then create the saved track association
          const savedTrackInsert = mapToSavedTrackInsert(
            track.id,
            userId,
            spotifyTrack.added_at
          )
          
          await this.trackRepository.saveSavedTrack(savedTrackInsert)
        } catch (error) {
          logger.error('Failed to process track', error as Error, {
            spotifyId: spotifyTrack.track.id,
            name: spotifyTrack.track.name
          })
          // Continue processing other tracks
        }
      }

      logger.info('Completed saved tracks sync', { 
        userId,
        totalTracks: spotifyTracks.length,
        newTracks 
      })

      return {
        type: 'tracks',
        totalProcessed: spotifyTracks.length,
        newItems: newTracks
      }
    } catch (error) {
      logger.error('Failed to sync tracks', error as Error, { userId })
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
      logger.info('Starting playlists sync', { userId })
      const spotifyPlaylists = await this.spotifyService.getPlaylists()
      const existingPlaylists = await this.playlistRepository.getPlaylists(userId)
      
      const existingPlaylistIds = new Set(existingPlaylists.map(p => p.spotify_playlist_id))
      const playlists = spotifyPlaylists.map(playlist => 
        mapSpotifyPlaylistToPlaylistInsert(playlist, userId)
      )
      
      logger.debug('Saving playlists', { 
        totalPlaylists: playlists.length,
        existingPlaylists: existingPlaylistIds.size
      })

      await this.playlistRepository.savePlaylists(playlists)

      const newPlaylists = playlists.filter(p => !existingPlaylistIds.has(p.spotify_playlist_id))

      logger.info('Completed playlists sync', {
        userId,
        totalPlaylists: playlists.length,
        newPlaylists: newPlaylists.length
      })

      return {
        type: 'playlists',
        totalProcessed: playlists.length,
        newItems: newPlaylists.length
      }
    } catch (error) {
      logger.error('Failed to sync playlists', error as Error, { userId })
      throw new AppError(
        'Failed to sync playlists',
        'DB_SYNC_ERROR',
        500,
        { cause: error, userId }
      )
    }
  }
}
