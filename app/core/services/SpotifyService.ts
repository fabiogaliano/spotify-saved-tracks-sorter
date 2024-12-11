import { getSpotifyApi } from '~/core/api/spotify.api'
import type { SpotifyTrackDTO } from '../domain/Track'
import type { SpotifyPlaylistDTO } from '../domain/Playlist'

export class SpotifyService {
  async getLikedTracks(): Promise<SpotifyTrackDTO[]> {
    const spotifyApi = getSpotifyApi()
    const response = await spotifyApi.currentUser.tracks.savedTracks()
    return response.items as SpotifyTrackDTO[]
  }

  async getPlaylists(): Promise<SpotifyPlaylistDTO[]> {
    const spotifyApi = getSpotifyApi()
    const currentUser = await spotifyApi.currentUser.profile()
    const playlists = await spotifyApi.playlists.getUsersPlaylists(currentUser.id)
    
    // Filter for playlists that are owned by the user and have 'ai:' prefix in description
    return playlists.items.filter(p => 
      p.owner.id === currentUser.id && 
      p.description?.toLowerCase().startsWith('ai:')
    )
  }
}
