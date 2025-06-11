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
  // Map to track ongoing refresh operations per user to prevent race conditions
  private refreshPromises = new Map<string, Promise<boolean>>()

  /**
   * Gets user session if it exists, without redirecting
   * Also handles token refresh if needed
   * Returns both the session and whether it was refreshed
   */
  async getUserSession(request: Request): Promise<{ session: SpotifySession | null; wasRefreshed: boolean; cookieHeader?: string }> {
    try {
      const session = await sessionStorage.getSession(request.headers.get('Cookie'))
      const user = session.get(authenticator.sessionKey) as SpotifySession | null

      if (!user) {
        this.logger.info('No user session found')
        return { session: null, wasRefreshed: false }
      }

      // Validate session structure
      if (!user.user || !user.expiresAt) {
        this.logger.error('Invalid session structure:', { 
          hasUser: !!user.user, 
          hasExpiresAt: !!user.expiresAt,
          keys: Object.keys(user)
        })
        return { session: null, wasRefreshed: false }
      }

      const now = Date.now()
      const timeUntilExpiry = user.expiresAt - now

      // Only log debug info if token needs refresh or if explicitly in debug mode
      const needsRefresh = timeUntilExpiry < REFRESH_THRESHOLD_MS
      if (needsRefresh || process.env.AUTH_DEBUG === 'true') {
        this.logger.info('[AUTH] Token status:', {
          userId: user.user?.id || 'unknown',
          timeUntilExpiry: Math.round(timeUntilExpiry / 1000) + 's',
          needsRefresh,
          path: new URL(request.url).pathname
        })
      }

      if (timeUntilExpiry < REFRESH_THRESHOLD_MS) {
        const userId = user.user?.id || 'unknown'
        
        // Check if a refresh is already in progress for this user
        let refreshPromise = this.refreshPromises.get(userId)
        
        if (!refreshPromise) {
          // No refresh in progress, start a new one
          this.logger.info(`[AUTH] Token refresh initiated for user ${userId}`)
          refreshPromise = this.refreshSessionToken(user)
            .finally(() => {
              // Clean up the promise once it's done
              this.refreshPromises.delete(userId)
            })
          this.refreshPromises.set(userId, refreshPromise)
        } else {
          this.logger.info(`[AUTH] Token refresh already in progress for user ${userId}, waiting...`)
        }
        
        const refreshed = await refreshPromise

        if (refreshed) {
          session.set(authenticator.sessionKey, user)
          const cookieHeader = await sessionStorage.commitSession(session)

          this.logger.info('[AUTH] Token refreshed successfully')
          // Return the updated session and the cookie header that needs to be set
          return { session: user, wasRefreshed: true, cookieHeader }
        } else {
          this.logger.warn('[AUTH] Token refresh failed, session may be invalid')
          return { session: null, wasRefreshed: false }
        }
      }

      // Log successful auth check in a condensed format (only in debug mode)
      if (process.env.AUTH_DEBUG === 'true') {
        const path = new URL(request.url).pathname
        const userId = user.user?.id || 'unknown'
        this.logger.debug(`[AUTH] Check OK: ${userId} @ ${path}`)
      }

      return { session: user, wasRefreshed: false }
    } catch (error) {
      this.logger.error('Error in getUserSession:', error)
      return { session: null, wasRefreshed: false }
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

        // Update the session object that was passed by reference
        session.accessToken = newAccessToken
        session.expiresAt = Date.now() + expiresIn

        if (data.refresh_token) {
          session.refreshToken = data.refresh_token
        }

        if (process.env.AUTH_DEBUG === 'true') {
          this.logger.info('[AUTH DEBUG] Token refresh details:', {
            oldExpiresAt: session.expiresAt - expiresIn,
            newExpiresAt: session.expiresAt,
            expiresIn: expiresIn / 1000 + ' seconds',
            gotNewRefreshToken: !!data.refresh_token
          })
        }
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
