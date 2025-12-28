import { type LoaderFunctionArgs, redirect } from 'react-router'

import LandingPage from '~/features/auth/LandingPage'
import { getUserSession } from '~/features/auth/auth.utils'

export const loader = async ({ request }: LoaderFunctionArgs) => {
	try {
		const sessionData = await getUserSession(request)
		if (sessionData) {
			return redirect('/dashboard')
		}

		return null
	} catch (error) {
		return { error: true }
	}
}

export default function Index() {
	return <LandingPage />
}
