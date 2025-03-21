import type { ActionFunctionArgs } from '@remix-run/node'
import { redirect } from '@remix-run/node'
import { authenticator } from '~/features/auth/auth.server'

export function loader() {
	// Redirect to home page if they visit this route directly
	return redirect('/')
}

export async function action({ request }: ActionFunctionArgs) {
	// For the initial auth route, we just need to start the Spotify flow
	// WITHOUT redirect parameters - this will redirect to Spotify's login page
	return await authenticator.authenticate('spotify', request)
}