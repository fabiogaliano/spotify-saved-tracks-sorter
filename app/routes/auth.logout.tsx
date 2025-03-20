import type { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/node'
import { redirect } from '@remix-run/node'
import { authenticator } from '~/features/auth/auth.server'
import { Logger } from '~/lib/logging/Logger'

export async function action({ request }: ActionFunctionArgs) {
	const logger = Logger.getInstance()
	logger.clearDefaultContext()
	logger.info('logout')

	// The authenticator.logout handles destroying the session
	return authenticator.logout(request, { redirectTo: '/' })
}

export async function loader({ request }: LoaderFunctionArgs) {
	const logger = Logger.getInstance()
	logger.clearDefaultContext()
	logger.info('logout:loader')

	return authenticator.logout(request, { redirectTo: '/' })
}