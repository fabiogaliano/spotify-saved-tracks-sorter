import { json } from '@remix-run/node'
import type { LoaderFunctionArgs } from '@remix-run/node'
import { providerKeyService } from '~/lib/services/llm/ProviderKeyService'

/**
 * API endpoint to check if a user has any provider keys set up
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url)
  const userId = url.searchParams.get('userId')

  if (!userId) {
    return json({ error: 'User ID is required' }, { status: 400 })
  }

  try {
    const hasAnyKey = await providerKeyService.hasAnyProviderKey(userId)
    return json({ hasAnyKey })
  } catch (error) {
    console.error('Error checking if user has any provider keys:', error)
    return json({ error: 'Failed to check if user has any provider keys' }, { status: 500 })
  }
}
