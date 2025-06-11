import type { LoaderFunctionArgs } from 'react-router';
import { authenticator } from '~/features/auth/auth.server'

export async function loader({ request }: LoaderFunctionArgs) {
	return authenticator.authenticate('spotify', request, {
		successRedirect: '/dashboard',
		failureRedirect: '/'
	})
}