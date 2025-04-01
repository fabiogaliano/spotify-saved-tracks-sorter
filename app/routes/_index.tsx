import { redirect, type LoaderFunctionArgs } from '@remix-run/node'
import { getUserSession } from '~/features/auth/auth.utils'
import LandingPage from '~/features/auth/LandingPage'

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