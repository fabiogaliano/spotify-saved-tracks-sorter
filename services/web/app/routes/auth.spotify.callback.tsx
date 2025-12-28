import type { LoaderFunctionArgs } from 'react-router'
import { redirect } from 'react-router'

import { SESSION_KEY, authenticator } from '~/features/auth/auth.server'
import { commitSession, getSession } from '~/features/auth/session.server'
import { Logger } from '~/lib/logging/Logger'

export async function loader({ request }: LoaderFunctionArgs) {
	const logger = Logger.getInstance()

	try {
		// remix-auth v4: authenticate() returns the user data on success
		// For OAuth callbacks, this exchanges the code for tokens and fetches profile
		const user = await authenticator.authenticate('spotify', request)

		// Manually store the user in the session
		const session = await getSession(request.headers.get('Cookie'))
		session.set(SESSION_KEY, user)

		logger.info(`Spotify auth successful for user ${user.user.id}`)

		// Commit the session and redirect to dashboard
		return redirect('/dashboard', {
			headers: {
				'Set-Cookie': await commitSession(session),
			},
		})
	} catch (error) {
		// OAuth strategies throw redirect Responses - re-throw those
		if (error instanceof Response) {
			throw error
		}

		logger.error('Spotify callback error:', error)
		return redirect('/?error=auth_failed')
	}
}
