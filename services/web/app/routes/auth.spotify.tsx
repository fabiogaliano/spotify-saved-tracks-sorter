import type { ActionFunctionArgs } from 'react-router'
import { redirect } from 'react-router'

import { authenticator } from '~/features/auth/auth.server'
import { Logger } from '~/lib/logging/Logger'

export function loader() {
	return redirect('/')
}

export async function action({ request }: ActionFunctionArgs) {
	const logger = Logger.getInstance()
	try {
		logger.info('Attempting Spotify authentication via /auth/spotify action...')
		return await authenticator.authenticate('spotify', request, {
			// todo: handle failureRedirect
			// failureRedirect: '/login?error=auth_failed',
		})
	} catch (error) {
		if (error instanceof Response) {
			logger.info('Authentication resulted in a Error Response')
			throw error
		}

		logger.error(
			'Unexpected error during authenticator.authenticate call in /auth/spotify:',
			error
		)

		return redirect('/')
	}
}
