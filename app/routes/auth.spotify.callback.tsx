import type { LoaderFunctionArgs } from '@remix-run/node'
import { authenticator } from '~/features/auth/auth.server'

export async function loader({ request }: LoaderFunctionArgs) {
	return authenticator.authenticate('spotify', request, {
		successRedirect: '/dashboard',
		failureRedirect: '/'
	})
}