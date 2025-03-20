// auth.utils.ts
import { redirect } from '@remix-run/node'
import { authenticator } from './auth.server'
import { createSpotifyApi } from '~/lib/api/spotify.api'
import type { SpotifySession } from './auth.server'
import { Logger } from '~/lib/logging/Logger'

/**
 * Gets user session if it exists, without redirecting
 * Use this for public routes that should still work for unauthenticated users
 */
export async function getUserSession(request: Request) {
  const logger = Logger.getInstance()

  try {
    const session = await authenticator.isAuthenticated(request)

    if (!session) {
      return null
    }

    // Check if session is expired
    if (session.expiresAt <= Date.now()) {
      return null
    }

    // Create a Spotify API client for this request
    const spotifyApi = createSpotifyApi({
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      expiresIn: Math.floor((session.expiresAt - Date.now()) / 1000),
    })

    logger.info(`login:session: ${session.user.id}`)

    return {
      session,
      spotifyApi,
      userId: session.appUser.id,
      hasSetupCompleted: session.appUser.hasSetupCompleted,
      spotifyUser: session.user,
    }
  } catch (error) {
    return null
  }
}

/**
 * Requires a user session, redirecting to home page if not found
 * Use this for protected routes that need authentication
 */
export async function requireUserSession(request: Request) {
  const logger = Logger.getInstance()

  try {
    const sessionData = await getUserSession(request)

    if (!sessionData) {
      logger.warn('No session found, redirecting to home page')
      throw redirect('/')
    }

    return sessionData
  } catch (error) {
    if (error instanceof Response) {
      throw error // Pass through redirects
    }
    throw redirect('/')
  }
}