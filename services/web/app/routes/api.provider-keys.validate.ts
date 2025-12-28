import type { ActionFunctionArgs } from 'react-router'

/**
 * Endpoint for validating provider API keys
 * This allows testing if an API key is valid before saving it
 */
export async function action({ request }: ActionFunctionArgs) {
	const formData = await request.formData()
	const provider = formData.get('provider') as string
	const apiKey = formData.get('apiKey') as string

	if (!provider) {
		return { error: 'Provider is required', status: 400 }
	}

	if (!apiKey) {
		return { error: 'API key is required', status: 400 }
	}

	try {
		let isValid = false
		let message = ''

		switch (provider) {
			case 'openai':
				isValid = await validateOpenAIKey(apiKey)
				message = isValid ? 'OpenAI API key is valid' : 'Invalid OpenAI API key'
				break
			case 'google':
				isValid = await validateGoogleKey(apiKey)
				message = isValid ? 'Google API key is valid' : 'Invalid Google API key'
				break
			case 'anthropic':
				isValid = await validateAnthropicKey(apiKey)
				message = isValid ? 'Anthropic API key is valid' : 'Invalid Anthropic API key'
				break
			default:
				return { error: 'Unsupported provider', status: 400 }
		}

		return { isValid, message }
	} catch (error) {
		console.error('Error validating API key:', error)
		return {
			error: 'Failed to validate API key',
			details: error instanceof Error ? error.message : 'Unknown error',
			status: 500,
		}
	}
}

async function validateOpenAIKey(apiKey: string): Promise<boolean> {
	try {
		const response = await fetch('https://api.openai.com/v1/models', {
			method: 'GET',
			headers: {
				Authorization: `Bearer ${apiKey}`,
				'Content-Type': 'application/json',
			},
		})

		return response.status === 200
	} catch (error) {
		console.error('Error validating OpenAI key:', error)
		return false
	}
}

async function validateGoogleKey(apiKey: string): Promise<boolean> {
	try {
		const response = await fetch(
			`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
			{
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
				},
			}
		)

		return response.status === 200
	} catch (error) {
		console.error('Error validating Google key:', error)
		return false
	}
}
async function validateAnthropicKey(apiKey: string): Promise<boolean> {
	try {
		const response = await fetch('https://api.anthropic.com/v1/models', {
			method: 'GET',
			headers: {
				'x-api-key': apiKey,
				'anthropic-version': '2023-06-01',
				'Content-Type': 'application/json',
			},
		})

		return response.status === 200
	} catch (error) {
		console.error('Error validating Anthropic key:', error)
		return false
	}
}
