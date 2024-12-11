import { getSpotifyApi } from '~/core/api/spotify.api'
import type { SpotifyTrackDTO } from '../domain/Track'
import type { SpotifyPlaylistDTO } from '../domain/Playlist'
import { SpotifyApiError } from '../errors'
import { logger } from '../logging'

export class SpotifyService {
  async getLikedTracks(): Promise<SpotifyTrackDTO[]> {
    try {
      logger.info('Fetching liked tracks from Spotify')
      const spotifyApi = getSpotifyApi()
      const response = await spotifyApi.currentUser.tracks.savedTracks()
      logger.debug('Fetched liked tracks', { count: response.items.length })
      return response.items as SpotifyTrackDTO[]
    } catch (error) {
      logger.error('Failed to fetch liked tracks', error as Error)
      throw new SpotifyApiError('Failed to fetch liked tracks', 500, { error })
    }
  }

  async getPlaylists(): Promise<SpotifyPlaylistDTO[]> {
    try {
      logger.info('Fetching user playlists from Spotify')
      const spotifyApi = getSpotifyApi()
      const currentUser = await spotifyApi.currentUser.profile()
      const playlists = await spotifyApi.playlists.getUsersPlaylists(currentUser.id)
      
      // Filter for playlists that are owned by the user and have 'ai:' prefix in description
      const filteredPlaylists = playlists.items.filter(p => 
        p.owner.id === currentUser.id && 
        p.description?.toLowerCase().startsWith('ai:')
      )

      logger.debug('Fetched playlists', { 
        totalPlaylists: playlists.items.length,
        filteredPlaylists: filteredPlaylists.length,
        userId: currentUser.id 
      })

      return filteredPlaylists
    } catch (error) {
      logger.error('Failed to fetch playlists', error as Error)
      throw new SpotifyApiError('Failed to fetch playlists', 500, { error })
    }
  }
}
