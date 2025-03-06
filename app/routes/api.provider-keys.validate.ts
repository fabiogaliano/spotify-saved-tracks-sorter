import { json } from '@remix-run/node'
import type { ActionFunctionArgs } from '@remix-run/node'

/**
 * Endpoint for validating provider API keys
 * This allows testing if an API key is valid before saving it
 */
export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData()
  const provider = formData.get('provider') as string
  const apiKey = formData.get('apiKey') as string

  if (!provider) {
    return json({ error: 'Provider is required' }, { status: 400 })
  }

  if (!apiKey) {
    return json({ error: 'API key is required' }, { status: 400 })
  }

  try {
    // Validate the API key based on the provider
    let isValid = false
    let message = ''

    switch (provider) {
      case 'openai':
        // Validate OpenAI API key
        isValid = await validateOpenAIKey(apiKey)
        message = isValid ? 'OpenAI API key is valid' : 'Invalid OpenAI API key'
        break
      case 'google':
        // Validate Google API key
        isValid = await validateGoogleKey(apiKey)
        message = isValid ? 'Google API key is valid' : 'Invalid Google API key'
        break
      case 'anthropic':
        // Validate Anthropic/Claude API key
        isValid = await validateAnthropicKey(apiKey)
        message = isValid ? 'Anthropic API key is valid' : 'Invalid Anthropic API key'
        break
      default:
        return json({ error: 'Unsupported provider' }, { status: 400 })
    }

    return json({ isValid, message })
  } catch (error) {
    console.error('Error validating API key:', error)
    return json(
      {
        error: 'Failed to validate API key',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * Validate an OpenAI API key by making a test request
 */
async function validateOpenAIKey(apiKey: string): Promise<boolean> {
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    })

    return response.status === 200
  } catch (error) {
    console.error('Error validating OpenAI key:', error)
    return false
  }
}

/**
 * Validate a Google API key by making a test request
 */
async function validateGoogleKey(apiKey: string): Promise<boolean> {
  try {
    // For Google, we'd typically validate against their API
    // This is a simplified example - in production, use the actual Google API endpoint
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    return response.status === 200
  } catch (error) {
    console.error('Error validating Google key:', error)
    return false
  }
}

/**
 * Validate an Anthropic/Claude API key by making a test request
 */
async function validateAnthropicKey(apiKey: string): Promise<boolean> {
  try {
    const response = await fetch('https://api.anthropic.com/v1/models', {
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      }
    })

    return response.status === 200
  } catch (error) {
    console.error('Error validating Anthropic key:', error)
    return false
  }
}
