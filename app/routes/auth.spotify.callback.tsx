import type { LoaderFunctionArgs } from '@remix-run/node'
import { authenticator } from '~/features/auth/auth.server'

export async function loader({ request }: LoaderFunctionArgs) {
	// The user data will be fetched and stored in the session
	// by the SpotifyStrategy callback
	return authenticator.authenticate('spotify', request, {
		successRedirect: '/',
		failureRedirect: '/',
	})
}