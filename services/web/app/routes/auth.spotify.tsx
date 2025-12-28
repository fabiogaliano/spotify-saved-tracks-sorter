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
		// remix-auth v4: authenticate() throws a redirect Response for OAuth flows
		// This will redirect to Spotify's authorization page
		return await authenticator.authenticate('spotify', request)
	} catch (error) {
		// OAuth strategies throw redirect Responses - we need to re-throw those
		if (error instanceof Response) {
			throw error
		}

		logger.error(
			'Unexpected error during authenticator.authenticate call in /auth/spotify:',
			error
		)

		return redirect('/')
	}
}
