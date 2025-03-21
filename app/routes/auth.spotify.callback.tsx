// auth.spotify.callback.tsx
import type { LoaderFunctionArgs } from '@remix-run/node'
import { authenticator } from '~/features/auth/auth.server'
import { Logger } from '~/lib/logging/Logger'

export async function loader({ request }: LoaderFunctionArgs) {
	const logger = Logger.getInstance()
	logger.info('Spotify callback route hit')

	// In the callback route, we use successRedirect and failureRedirect
	// This is where the flow completes and user is redirected to the app
	return authenticator.authenticate('spotify', request, {
		successRedirect: '/dashboard',
		failureRedirect: '/'
	})
}