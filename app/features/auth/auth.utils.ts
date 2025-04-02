// auth.utils.ts
import { redirect } from '@remix-run/node'
import { Logger } from '~/lib/logging/Logger'
import { authService } from '~/lib/services/AuthService'
import { createSpotifyApi } from '~/lib/api/spotify.api'

/**
 * Gets user session if it exists, without redirecting
 * Use this for public routes that should still work for unauthenticated users
 */
export async function getUserSession(request: Request) {
  const logger = Logger.getInstance()

  try {
    const session = await authService.getUserSession(request)

    if (!session) {
      logger.info('No session found')
      return null
    }

    const timeUntilExpiry = session.expiresAt - Date.now()
    const spotifyApi = createSpotifyApi({
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      expiresIn: Math.floor(timeUntilExpiry / 1000),
    })

    logger.info(`getUserSession: Valid session found for user ${session.user.id}`)

    return {
      session,
      spotifyApi,
      userId: session.appUser.id,
      hasSetupCompleted: session.appUser.hasSetupCompleted,
      spotifyUser: session.user,
    }
  } catch (error) {
    logger.error('Error in getUserSession:', error)
    return null
  }
}

/**
 * Requires a user session, redirecting to home page if not found or expired.
 * Performs synchronous refresh if needed and relies on Remix/Authenticator 
 * to commit the potentially updated session.
 * Use this for protected routes.
 */
export async function requireUserSession(request: Request) {
  const logger = Logger.getInstance()

  try {
    const sessionData = await getUserSession(request)

    if (!sessionData) {
      logger.warn('requireUserSession: No valid session found (expired or requires login), redirecting to home page')
      throw redirect('/')
    }

    logger.info(`requireUserSession: Valid session confirmed for user ${sessionData.spotifyUser.id}`)
    return sessionData

  } catch (error) {
    if (error instanceof Response) {
      throw error
    }
    logger.error('Unexpected error in requireUserSession:', error)
    throw redirect('/')
  }
}