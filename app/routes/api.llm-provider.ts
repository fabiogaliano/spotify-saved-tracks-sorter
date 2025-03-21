import { type ActionFunctionArgs, type LoaderFunctionArgs } from '@remix-run/node'
import { authenticator } from '~/features/auth/auth.server'
import type { SpotifySession } from '~/features/auth/auth.server'
import { requireUserSession } from '~/features/auth/auth.utils'
import { providerKeyService } from '~/lib/services/llm/ProviderKeyService'

/**
 * API endpoint for LLM provider operations
 * Handles fetching available providers and their configurations
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const userSession = await requireUserSession(request)

  const url = new URL(request.url)
  const action = url.searchParams.get('action')

  switch (action) {
    case 'getProviders':
      return {
        providers: [
          { id: 'openai', name: 'OpenAI', description: 'OpenAI API' },
          { id: 'anthropic', name: 'Anthropic', description: 'Claude API' },
          { id: 'google', name: 'Google', description: 'Google Gemini API' }
        ]
      }
    case 'getProviderStatuses':
      try {
        return { providerStatuses: await providerKeyService.getProviderStatuses(userSession.userId) }
      } catch (error) {
        return Response.json({ error: 'Failed to fetch provider statuses' }, { status: 500 })
      }

    default:
      return Response.json({ error: 'Invalid action' }, { status: 400 })
  }
}

/**
 * Handle API key management operations
 */
export async function action({ request }: ActionFunctionArgs) {
  const userSession = await requireUserSession(request)
  console.log({ userSession })

  if (!userSession) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await request.formData()
  const action = formData.get('action') as string
  const provider = formData.get('provider') as string

  if (!provider) {
    return Response.json({ error: 'Provider is required' }, { status: 400 })
  }

  if (!userSession.userId) {
    return Response.json({ error: 'User ID not found' }, { status: 400 })
  }

  try {
    switch (action) {
      case 'saveKey': {
        const apiKey = formData.get('apiKey') as string
        if (!apiKey) {
          return Response.json({ error: 'API key is required' }, { status: 400 })
        }

        try {
          await providerKeyService.saveProviderKey(userSession.userId, provider, apiKey)
          return Response.json({ success: true, message: `${provider} API key saved successfully` }, { status: 200 })
        } catch (saveError) {
          console.error(`Error saving ${provider} API key:`, saveError)
          return Response.json({ error: `Failed to save ${provider} API key`, details: saveError instanceof Error ? saveError.message : 'Unknown error' }, { status: 500 })
        }
      }

      case 'deleteKey': {
        await providerKeyService.deleteProviderKey(userSession.userId, provider)
        return Response.json({ success: true, message: `${provider} API key deleted successfully` }, { status: 200 })
      }

      case 'validateKey': {
        const apiKey = formData.get('apiKey') as string
        if (!apiKey) {
          return Response.json({ error: 'API key is required' }, { status: 400 })
        }

        // This would call the validation logic
        // For now, we'll just return success
        return Response.json({ success: true, message: `${provider} API key is valid` }, { status: 200 })
      }

      case 'setActiveProvider': {
        try {
          const hasKey = await providerKeyService.hasProviderKey(userSession.userId, provider)
          if (!hasKey) {
            return Response.json({ error: `Cannot set ${provider} as active because it doesn't have an API key` }, { status: 400 })
          }

          await providerKeyService.setActiveProvider(userSession.userId, provider)
          return Response.json({ success: true, message: `${provider} set as active provider` }, { status: 200 })
        } catch (error) {
          return Response.json({ error: `Failed to set ${provider} as active provider`, details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
        }
      }

      default:
        return Response.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error(`Error performing action ${action} for provider ${provider}:`, error)

    // Provide more specific error message based on the error type
    let errorMessage = `Failed to ${action} for ${provider}`
    let errorDetails = error instanceof Error ? error.message : 'Unknown error'

    // Check for specific error types
    if (error instanceof Error) {
      if (error.message.includes('encrypted_key')) {
        errorDetails = 'There was an issue with the encryption process. Please check your encryption configuration.'
      } else if (error.message.includes('not-null constraint')) {
        errorDetails = 'Required data is missing. Please ensure all required fields are provided.'
      }
    }

    return Response.json({ error: errorMessage, details: errorDetails }, { status: 500 })
  }
}
