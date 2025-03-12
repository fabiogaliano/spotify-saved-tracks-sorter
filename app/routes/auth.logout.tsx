import type { ActionFunctionArgs } from '@remix-run/node'
import { redirect } from '@remix-run/node'
import { authenticator } from '~/features/auth/auth.server'
import { clearSpotifyApi } from '~/lib/api/spotify.api'
import { logger } from '~/lib/logging/Logger'

export async function action({ request }: ActionFunctionArgs) {
	clearSpotifyApi()
	logger.clearDefaultContext()
	logger.info('logout')
	return authenticator.logout(request, { redirectTo: '/' })
}

export function loader() {
	return redirect('/')
}
