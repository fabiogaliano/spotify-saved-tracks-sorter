import { SpotifyService } from './SpotifyService'
import type { TrackRepository } from '../domain/Track'
import type { PlaylistRepository } from '../domain/Playlist'
import { mapSpotifyTrackToTrackInsert, mapToSavedTrackInsert } from '../domain/Track'
import { mapSpotifyPlaylistToPlaylistInsert } from '../domain/Playlist'

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
      const spotifyTracks = await this.spotifyService.getLikedTracks()
      let newTracks = 0
      
      // Process each track
      for (const spotifyTrack of spotifyTracks) {
        // First, ensure the track exists in the general tracks table
        let track = await this.trackRepository.getTrackBySpotifyId(spotifyTrack.track.id)
        
        if (!track) {
          // Insert the track if it doesn't exist
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
      }

      return {
        type: 'tracks',
        totalProcessed: spotifyTracks.length,
        newItems: newTracks
      }
    } catch (error) {
      console.error('Error syncing tracks:', error)
      return {
        type: 'tracks',
        totalProcessed: 0,
        newItems: 0,
        error: error instanceof Error ? error.message : 'Failed to sync tracks'
      }
    }
  }

  async syncPlaylists(userId: number): Promise<SyncResult> {
    try {
      const spotifyPlaylists = await this.spotifyService.getPlaylists()
      const existingPlaylists = await this.playlistRepository.getPlaylists(userId)
      
      const existingPlaylistIds = new Set(existingPlaylists.map(p => p.spotify_playlist_id))
      const playlists = spotifyPlaylists.map(playlist => 
        mapSpotifyPlaylistToPlaylistInsert(playlist, userId)
      )
      
      await this.playlistRepository.savePlaylists(playlists)

      const newPlaylists = playlists.filter(p => !existingPlaylistIds.has(p.spotify_playlist_id))

      return {
        type: 'playlists',
        totalProcessed: playlists.length,
        newItems: newPlaylists.length
      }
    } catch (error) {
      console.error('Error syncing playlists:', error)
      return {
        type: 'playlists',
        totalProcessed: 0,
        newItems: 0,
        error: error instanceof Error ? error.message : 'Failed to sync playlists'
      }
    }
  }
}
