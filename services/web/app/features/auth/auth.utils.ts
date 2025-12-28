// auth.utils.ts
import { redirect } from 'react-router'

import { createSpotifyApi } from '~/lib/api/spotify.api'
import { Logger } from '~/lib/logging/Logger'
import { authService } from '~/lib/services/AuthService'

/**
 * Gets user session if it exists, without redirecting
 * Use this for public routes that should still work for unauthenticated users
 * Returns session data and cookie header if token was refreshed
 */
export async function getUserSession(request: Request) {
	const logger = Logger.getInstance()

	try {
		const result = await authService.getUserSession(request)

		if (!result.session) {
			logger.info('No session found')
			return null
		}

		const timeUntilExpiry = result.session.expiresAt - Date.now()
		const spotifyApi = createSpotifyApi({
			accessToken: result.session.accessToken,
			refreshToken: result.session.refreshToken,
			expiresIn: Math.floor(timeUntilExpiry / 1000),
		})

		// Only log in debug mode to reduce verbosity
		if (process.env.AUTH_DEBUG === 'true') {
			logger.info(
				`getUserSession: Valid session found for user ${result.session.user.id}`
			)
		}

		return {
			session: result.session,
			spotifyApi,
			userId: result.session.appUser.id,
			hasSetupCompleted: result.session.appUser.hasSetupCompleted,
			spotifyUser: result.session.user,
			wasRefreshed: result.wasRefreshed,
			cookieHeader: result.cookieHeader,
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
			logger.warn(
				'requireUserSession: No valid session found (expired or requires login), redirecting to home page'
			)
			throw redirect('/')
		}

		// Only log in debug mode to reduce verbosity
		if (process.env.AUTH_DEBUG === 'true') {
			logger.info(
				`requireUserSession: Valid session confirmed for user ${sessionData.spotifyUser.id}`
			)
		}
		return sessionData
	} catch (error) {
		if (error instanceof Response) {
			throw error
		}
		logger.error('Unexpected error in requireUserSession:', error)
		throw redirect('/')
	}
}

/**
 * Helper function to create a response with updated session cookie if needed
 */
export function createResponseWithUpdatedSession(
	data: any,
	sessionData: { wasRefreshed?: boolean; cookieHeader?: string } | null,
	options: ResponseInit = {}
): Response {
	// If session was refreshed, include the Set-Cookie header
	if (sessionData?.wasRefreshed && sessionData.cookieHeader) {
		return new Response(JSON.stringify(data), {
			...options,
			headers: {
				'Content-Type': 'application/json',
				...options.headers,
				'Set-Cookie': sessionData.cookieHeader,
			},
		})
	}

	// Otherwise, use the standard Response.json
	return Response.json(data, options)
}
