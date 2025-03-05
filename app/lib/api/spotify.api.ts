import { SpotifyApi } from '@fostertheweb/spotify-web-sdk'

if (process.env.SPOTIFY_CLIENT_ID === undefined) {
  throw new Error('SPOTIFY_CLIENT_ID environment variable is not set!')
}
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID

let spotifyInstance: SpotifyApi | null = null

interface SpotifySession {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export function initializeSpotifyApi(session: SpotifySession) {
  spotifyInstance = SpotifyApi.withAccessToken(SPOTIFY_CLIENT_ID, {
    access_token: session.accessToken,
    refresh_token: session.refreshToken,
    expires_in: session.expiresIn,
    token_type: 'Bearer',
  })

  if (!spotifyInstance) {
    throw new Error('Failed to initialize SpotifyApi instance')
  }
}

export function getSpotifyApi(): SpotifyApi {
  if (!spotifyInstance) {
    throw new Error('SpotifyApi instance is not initialized')
  }

  return spotifyInstance
}

export function clearSpotifyApi() {
  spotifyInstance = null
}
