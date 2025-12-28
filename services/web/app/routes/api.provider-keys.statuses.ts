import type { LoaderFunctionArgs } from 'react-router'

import { providerKeyService } from '~/lib/services/llm/ProviderKeyService'

// Handle GET requests to fetch provider statuses
export async function loader({ request }: LoaderFunctionArgs) {
	const url = new URL(request.url)
	const userId = url.searchParams.get('userId')

	if (!userId) {
		return { error: 'User ID is required', status: 400 }
	}

	try {
		const providerStatuses = await providerKeyService.getProviderStatuses(
			parseInt(userId)
		)
		return { providerStatuses }
	} catch (error) {
		console.error('Error fetching provider statuses:', error)
		return { error: 'Failed to fetch provider statuses', status: 500 }
	}
}
