import { Authenticator, Strategy } from 'remix-auth'
import { SpotifyStrategy } from 'remix-auth-spotify'
import { sessionStorage } from './session.server'
import { userService } from '~/lib/services/UserService'

// This is the structure that remix-auth-spotify expects
export type SpotifySession = {
  accessToken: string
  refreshToken: string
  expiresAt: number
  tokenType: string
  user: {
    id: string
    email: string
    name: string
    image?: string
  }
  // We extend it with our app-specific data
  appUser: {
    id: number
    hasSetupCompleted: boolean
  }
}

if (!process.env.SPOTIFY_CLIENT_ID) {
  throw new Error('Missing SPOTIFY_CLIENT_ID env')
}

if (!process.env.SPOTIFY_CLIENT_SECRET) {
  throw new Error('Missing SPOTIFY_CLIENT_SECRET env')
}

if (!process.env.SPOTIFY_CALLBACK_URL) {
  throw new Error('Missing SPOTIFY_CALLBACK_URL env')
}

const scopes = [
  'user-read-email',
  'user-read-private',
  'playlist-read-private',
  'playlist-modify-private',
  'playlist-modify-public',
  'user-library-read',
  'user-library-modify',
].join(' ')

export const spotifyStrategy = new SpotifyStrategy(
  {
    clientID: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    callbackURL: process.env.SPOTIFY_CALLBACK_URL,
    sessionStorage,
    scope: scopes,
  },
  async ({ accessToken, refreshToken, extraParams, profile }) => {
    // Get or create the user in our database when authenticating
    const appUser = await userService.getOrCreateUser(profile.id, profile.emails[0].value)

    // Debug logging for token expiration issue (only in debug mode)
    if (process.env.AUTH_DEBUG === 'true') {
      console.log('[AUTH DEBUG] Initial auth callback:', {
        hasExtraParams: !!extraParams,
        expiresIn: extraParams?.expiresIn,
        tokenType: extraParams?.tokenType,
        expiresInType: typeof extraParams?.expiresIn,
        calculatedExpiresAt: extraParams?.expiresIn ? Date.now() + extraParams.expiresIn * 1000 : 'undefined'
      })
    }

    // Default to 1 hour if expiresIn is not provided
    const expiresIn = extraParams?.expiresIn || 3600 // 1 hour in seconds
    if (!extraParams?.expiresIn) {
      console.warn('[AUTH] No expiresIn received from Spotify, defaulting to 1 hour')
    }
    const expiresAt = Date.now() + expiresIn * 1000

    // Return the format expected by SpotifyStrategy but with our extra data
    return {
      accessToken,
      refreshToken: refreshToken!,
      expiresAt,
      tokenType: extraParams?.tokenType || 'Bearer',
      user: {
        id: profile.id,
        email: profile.emails[0].value,
        name: profile.displayName,
        image: profile.__json.images?.[0]?.url,
      },
      // Our app-specific data
      appUser: {
        id: appUser.id,
        hasSetupCompleted: appUser.has_setup_completed,
      }
    }
  }
)

export const authenticator = new Authenticator<SpotifySession>(sessionStorage, {
  sessionKey: spotifyStrategy.sessionKey,
  sessionErrorKey: spotifyStrategy.sessionErrorKey,
})


authenticator.use(spotifyStrategy as unknown as Strategy<SpotifySession, unknown>)