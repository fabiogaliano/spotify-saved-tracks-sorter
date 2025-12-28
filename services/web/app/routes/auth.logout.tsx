import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router'
import { redirect } from 'react-router'

import { destroySession, getSession } from '~/features/auth/session.server'

async function logout(request: Request) {
	const session = await getSession(request.headers.get('Cookie'))
	return redirect('/', {
		headers: {
			'Set-Cookie': await destroySession(session),
		},
	})
}

export async function action({ request }: ActionFunctionArgs) {
	return logout(request)
}

export async function loader({ request }: LoaderFunctionArgs) {
	return logout(request)
}
