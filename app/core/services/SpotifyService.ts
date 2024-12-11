import { getSpotifyApi } from '~/core/api/spotify.api'
import type { SpotifyTrackDTO } from '~/core/domain/Track'
import type { SpotifyPlaylistDTO } from '~/core/domain/Playlist'
import { SpotifyApiError } from  '~/core/errors/ApiError'
import { logger } from '~/core/logging/Logger'

export class SpotifyService {
  async getLikedTracks(): Promise<SpotifyTrackDTO[]> {
    try {
      logger.info('fetch liked tracks')
      const spotifyApi = getSpotifyApi()
      const response = await spotifyApi.currentUser.tracks.savedTracks()
      logger.debug('liked tracks fetched', { count: response.items.length })
      return response.items as SpotifyTrackDTO[]
    } catch (error) {
      logger.error('fetch liked tracks failed', error as Error)
      throw new SpotifyApiError('Failed to fetch liked tracks', 500, { error })
    }
  }

  async getPlaylists(): Promise<SpotifyPlaylistDTO[]> {
    try {
      logger.info('fetch playlists')
      const spotifyApi = getSpotifyApi()
      const currentUser = await spotifyApi.currentUser.profile()
      const playlists = await spotifyApi.playlists.getUsersPlaylists(currentUser.id)
      
      // Filter for playlists that are owned by the user and have 'ai:' prefix in description
      const filteredPlaylists = playlists.items.filter(p => 
        p.owner.id === currentUser.id && 
        p.description?.toLowerCase().startsWith('ai:')
      )

      logger.debug('playlists fetched', { 
        totalPlaylists: playlists.items.length,
        filteredPlaylists: filteredPlaylists.length,
        userId: currentUser.id 
      })

      return filteredPlaylists
    } catch (error) {
      logger.error('fetch playlists failed', error as Error)
      throw new SpotifyApiError('Failed to fetch playlists', 500, { error })
    }
  }
}
