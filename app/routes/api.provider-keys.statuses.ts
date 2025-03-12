import { json } from '@remix-run/node'
import type { LoaderFunctionArgs } from '@remix-run/node'
import { providerKeyService } from '~/lib/services/llm/ProviderKeyService'

// Handle GET requests to fetch provider statuses
export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url)
  const userId = url.searchParams.get('userId')

  if (!userId) {
    return json({ error: 'User ID is required' }, { status: 400 })
  }

  try {
    const providerStatuses = await providerKeyService.getProviderStatuses(userId)
    return json({ providerStatuses })
  } catch (error) {
    console.error('Error fetching provider statuses:', error)
    return json({ error: 'Failed to fetch provider statuses' }, { status: 500 })
  }
}
