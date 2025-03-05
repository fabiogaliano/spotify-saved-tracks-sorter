import type { LoaderFunctionArgs } from '@remix-run/node'
import { authenticator } from '~/features/auth/auth.server'
import type { SpotifySession } from '~/features/auth/auth.server'
import { initializeSpotifyApi } from '~/core/api/spotify.api'

export async function loader({ request }: LoaderFunctionArgs) {
	const session = (await authenticator.authenticate('spotify', request, {
		successRedirect: '/',
		failureRedirect: '/',
	})) as SpotifySession

	if (session) {
		initializeSpotifyApi({
			accessToken: session.accessToken,
			refreshToken: session.refreshToken,
			expiresIn: Math.floor((session.expiresAt - Date.now()) / 1000),
		})
	}

	return session
}
