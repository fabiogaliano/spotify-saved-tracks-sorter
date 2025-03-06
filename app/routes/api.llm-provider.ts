import { json } from '@remix-run/node'
import type { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/node'
import { authenticator } from '~/core/auth/auth.server'
import type { SpotifySession } from '~/core/auth/auth.server'
import { providerKeyService } from '~/core/services/llm/ProviderKeyService'

/**
 * API endpoint for LLM provider operations
 * Handles fetching available providers and their configurations
 */
export async function loader({ request }: LoaderFunctionArgs) {
  // Ensure user is authenticated
  const session = (await authenticator.isAuthenticated(request)) as SpotifySession | null
  
  if (!session) {
    return json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const url = new URL(request.url)
  const action = url.searchParams.get('action')
  
  switch (action) {
    case 'getProviders':
      // Return list of supported LLM providers
      return json({
        providers: [
          { id: 'openai', name: 'OpenAI', description: 'OpenAI API (GPT models)' },
          { id: 'anthropic', name: 'Anthropic', description: 'Claude API' },
          { id: 'google', name: 'Google', description: 'Google Gemini API' }
        ]
      })
      
    case 'getProviderStatuses':
      // Get the status of all providers for the current user
      try {
        // Make sure we have a valid user ID
        if (!session.user || !session.user.id) {
          return json({ error: 'User ID not found' }, { status: 400 })
        }
        
        // Get provider statuses - use the user ID from the session
        // The statuses now already include the active provider information
        const providerStatuses = await providerKeyService.getProviderStatuses(session.user.id)
        
        return json({ providerStatuses })
      } catch (error) {
        console.error('Error fetching provider statuses:', error)
        return json({ error: 'Failed to fetch provider statuses' }, { status: 500 })
      }
      
    default:
      return json({ error: 'Invalid action' }, { status: 400 })
  }
}

/**
 * Handle API key management operations
 */
export async function action({ request }: ActionFunctionArgs) {
  // Ensure user is authenticated
  const session = (await authenticator.isAuthenticated(request)) as SpotifySession | null
  
  if (!session) {
    return json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const formData = await request.formData()
  const action = formData.get('action') as string
  const provider = formData.get('provider') as string
  
  if (!provider) {
    return json({ error: 'Provider is required' }, { status: 400 })
  }
  
  // Make sure we have a valid user ID
  if (!session.user || !session.user.id) {
    return json({ error: 'User ID not found' }, { status: 400 })
  }
  
  const userId = session.user.id
  
  try {
    switch (action) {
      case 'saveKey': {
        const apiKey = formData.get('apiKey') as string
        if (!apiKey) {
          return json({ error: 'API key is required' }, { status: 400 })
        }
        
        try {
          await providerKeyService.saveProviderKey(userId, provider, apiKey)
          return json({ success: true, message: `${provider} API key saved successfully` })
        } catch (saveError) {
          console.error(`Error saving ${provider} API key:`, saveError)
          return json({ 
            error: `Failed to save ${provider} API key`, 
            details: saveError instanceof Error ? saveError.message : 'Unknown error' 
          }, { status: 500 })
        }
      }
      
      case 'deleteKey': {
        await providerKeyService.deleteProviderKey(userId, provider)
        return json({ success: true, message: `${provider} API key deleted successfully` })
      }
      
      case 'validateKey': {
        const apiKey = formData.get('apiKey') as string
        if (!apiKey) {
          return json({ error: 'API key is required' }, { status: 400 })
        }
        
        // This would call the validation logic
        // For now, we'll just return success
        return json({ success: true, message: `${provider} API key is valid` })
      }
      
      case 'setActiveProvider': {
        try {
          // Check if the provider has a key before setting it as active
          const hasKey = await providerKeyService.hasProviderKey(userId, provider)
          if (!hasKey) {
            return json({ 
              error: `Cannot set ${provider} as active because it doesn't have an API key` 
            }, { status: 400 })
          }
          
          // Set the provider as active
          await providerKeyService.setActiveProvider(userId, provider)
          return json({ success: true, message: `${provider} set as active provider` })
        } catch (error) {
          console.error(`Error setting ${provider} as active:`, error)
          return json({ 
            error: `Failed to set ${provider} as active provider`, 
            details: error instanceof Error ? error.message : 'Unknown error' 
          }, { status: 500 })
        }
      }
      
      default:
        return json({ error: 'Invalid action' }, { status: 400 })
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
    
    return json(
      { 
        error: errorMessage,
        details: errorDetails
      }, 
      { status: 500 }
    )
  }
}
