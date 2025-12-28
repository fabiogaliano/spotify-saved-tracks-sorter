import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router'

import { authenticator } from '~/features/auth/auth.server'

export async function action({ request }: ActionFunctionArgs) {
	return authenticator.logout(request, { redirectTo: '/' })
}

export async function loader({ request }: LoaderFunctionArgs) {
	return authenticator.logout(request, { redirectTo: '/' })
}
