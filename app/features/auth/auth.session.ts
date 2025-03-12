import { redirect } from '@remix-run/node'
import { authenticator, spotifyStrategy } from './auth.server'
import { Logger } from '~/lib/logging/Logger'

/**
 * Helper function to get the user session and handle common authentication tasks
 * to ensure consistency across routes.
 */
export async function getAuthenticatedSession(request: Request) {
  const logger = Logger.getInstance()

  try {
    const session = await spotifyStrategy.getSession(request)

    if (!session) {
      logger.warn('No session found, redirecting to home page')
      throw redirect('/')
    }

    if (session.expiresAt <= Date.now()) {
      logger.info('Session expired, logging out')
      throw await authenticator.logout(request, { redirectTo: '/' })
    }

    logger.info(`Session valid for user ${session?.user?.id}`)
    return session
  } catch (error) {
    if (error instanceof Response) {
      throw error // Pass through redirects
    }
    throw redirect('/')
  }
}
