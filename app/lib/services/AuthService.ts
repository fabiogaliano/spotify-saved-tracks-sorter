import { authenticator } from '~/features/auth/auth.server'
import type { SpotifySession } from '~/features/auth/auth.server'
import { sessionStorage } from '~/features/auth/session.server'
import { Logger } from '~/lib/logging/Logger'

const REFRESH_THRESHOLD_MS = 300000 //refresh 5 minutes before token expiry
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET

/**
 * Service to handle all authentication-related operations
 */
export class AuthService {
  private logger = Logger.getInstance()

  /**
   * Gets user session if it exists, without redirecting
   * Also handles token refresh if needed
   */
  async getUserSession(request: Request): Promise<SpotifySession | null> {
    try {
      const session = await sessionStorage.getSession(request.headers.get('Cookie'))
      const user = session.get(authenticator.sessionKey) as SpotifySession | null

      if (!user) {
        this.logger.info('No user session found')
        return null
      }


      const now = Date.now()
      const timeUntilExpiry = user.expiresAt - now

      if (timeUntilExpiry < REFRESH_THRESHOLD_MS) {
        this.logger.info(`Token will expire soon (${timeUntilExpiry}ms), refreshing...`)
        const refreshed = await this.refreshSessionToken(user)

        if (refreshed) {
          session.set(authenticator.sessionKey, user)
          await sessionStorage.commitSession(session)

          this.logger.info('Successfully refreshed token and updated session')
          // Note: We return the updated user object, but the new cookie will only be
          // applied if the caller commits the session in a response
        } else {
          this.logger.warn('Failed to refresh token, session may be invalid')
          return null
        }
      }

      return user
    } catch (error) {
      this.logger.error('Error in getUserSession:', error)
      return null
    }
  }

  /**
   * Refreshes a Spotify access token using the refresh token via direct fetch.
   * Updates the provided session object directly.
   */
  async refreshSessionToken(session: SpotifySession): Promise<boolean> {
    if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
      this.logger.error('Missing Spotify Client ID or Secret for token refresh.')
      return false
    }

    const basicAuth = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64')
    const tokenEndpoint = 'https://accounts.spotify.com/api/token'

    try {
      const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${basicAuth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: session.refreshToken,
        }),
      })

      const data: {
        access_token: string
        token_type: string
        expires_in: number
        refresh_token: string
        scope: string
      } = await response.json()

      if (!response.ok) {
        this.logger.error('Spotify refresh token request failed.', {
          status: response.status,
          statusText: response.statusText,
          responseBody: data,
        })

        if ((data as any).error === 'invalid_grant') {
          this.logger.error('Refresh token is invalid. User needs to re-authenticate.')
        }
        return false
      }

      if (data.access_token) {
        const newAccessToken = data.access_token
        const expiresIn = data.expires_in * 1000 // convert to ms

        session.accessToken = newAccessToken
        session.expiresAt = Date.now() + expiresIn

        if (data.refresh_token) {
          session.refreshToken = data.refresh_token
        }

        this.logger.info('Successfully refreshed token, expires in: ' + expiresIn / 1000 + ' seconds')
        return true
      } else {
        this.logger.error('No access token in Spotify response:', data)
        return false
      }
    } catch (error) {
      this.logger.error('Error refreshing token:', error)
      return false
    }
  }
}

export const authService = new AuthService()
