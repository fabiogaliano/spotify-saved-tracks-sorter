import type { ActionFunctionArgs } from '@remix-run/node'
import { providerKeyService } from '~/lib/services/llm/ProviderKeyService'

// Handle POST requests to save or delete provider keys
export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData()
  const action = formData.get('_action') as string
  const userId = formData.get('userId') as string
  const provider = formData.get('provider') as string

  if (!userId) {
    return { error: 'User ID is required', status: 400 }
  }

  if (!provider) {
    return { error: 'Provider is required', status: 400 }
  }

  try {
    switch (action) {
      case 'saveProviderKey': {
        const apiKey = formData.get('apiKey') as string
        if (!apiKey) {
          return { error: 'API key is required', status: 400 }
        }

        await providerKeyService.saveProviderKey(userId, provider, apiKey)
        return { success: true, message: 'API key saved successfully' }
      }

      case 'deleteProviderKey': {
        await providerKeyService.deleteProviderKey(userId, provider)
        return { success: true, message: 'API key deleted successfully' }
      }

      default:
        return { error: 'Invalid action', status: 400 }
    }
  } catch (error) {
    console.error(`Error ${action === 'saveProviderKey' ? 'saving' : 'deleting'} provider key:`, error)
    return { error: `Failed to ${action === 'saveProviderKey' ? 'save' : 'delete'} API key`, details: error instanceof Error ? error.message : 'Unknown error', status: 500 }
  }
}
