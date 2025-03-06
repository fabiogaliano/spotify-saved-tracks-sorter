import { json } from '@remix-run/node'
import type { LoaderFunctionArgs } from '@remix-run/node'
import { providerKeyService } from '~/core/services/llm/ProviderKeyService'

/**
 * Main entry point for provider key operations
 * This route serves as a redirect to more specific routes:
 * - /api/provider-keys/statuses - For getting provider statuses
 * - /api/provider-keys/actions - For performing actions on provider keys
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url)
  const userId = url.searchParams.get('userId')

  if (!userId) {
    return json({ error: 'User ID is required' }, { status: 400 })
  }

  try {
    // Check if the user has any provider keys
    const hasAnyKey = await providerKeyService.hasAnyProviderKey(userId)
    return json({ hasAnyKey })
  } catch (error) {
    console.error('Error checking provider keys:', error)
    return json({ error: 'Failed to check provider keys' }, { status: 500 })
  }
}

// Helper function to check if a user has any provider keys
export async function getHasAnyProviderKey(userId: string): Promise<boolean> {
  try {
    return await providerKeyService.hasAnyProviderKey(userId)
  } catch (error) {
    console.error('Error checking if user has any provider keys:', error)
    return false
  }
}
