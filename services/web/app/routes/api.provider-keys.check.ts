import type { LoaderFunctionArgs } from 'react-router'

import { providerKeyService } from '~/lib/services/llm/ProviderKeyService'

/**
 * API endpoint to check if a user has any provider keys set up
 */
export async function loader({ request }: LoaderFunctionArgs) {
	const url = new URL(request.url)
	const userId = url.searchParams.get('userId')

	if (!userId) {
		return { error: 'User ID is required', status: 400 }
	}

	try {
		const hasAnyKey = await providerKeyService.hasAnyProviderKey(parseInt(userId))
		return { hasAnyKey }
	} catch (error) {
		console.error('Error checking if user has any provider keys:', error)
		return { error: 'Failed to check if user has any provider keys', status: 500 }
	}
}
