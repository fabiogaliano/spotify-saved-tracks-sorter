import { createAnthropic } from '@ai-sdk/anthropic'
import type { Schema } from '@ai-sdk/provider-utils'
import { LanguageModelUsage, Output, generateText } from 'ai'

import type {
	LlmProviderObjectResponse,
	ProviderInterface,
} from '~/lib/models/LlmProvider'

export class AnthropicProvider implements ProviderInterface {
	name = 'anthropic'
	private client
	private activeModel = 'claude-3-haiku'
	private availableModels = ['claude-3-sonnet', 'claude-instant-1.2', 'claude-3-haiku']

	constructor(apiKey: string) {
		this.client = createAnthropic({ apiKey })
	}

	getAvailableModels() {
		return this.availableModels
	}

	getActiveModel() {
		return this.activeModel
	}

	setActiveModel(model: string) {
		if (!this.availableModels.includes(model)) {
			throw new Error(`Model ${model} is not available for Anthropic provider`)
		}
		this.activeModel = model
	}

	async generateText(
		prompt: string,
		model?: string
	): Promise<{ text: string; usage: LanguageModelUsage }> {
		// If model is provided, temporarily use it without changing the active model
		const selectedModel = model || this.activeModel
		const { text, usage } = await generateText({
			model: this.client(selectedModel),
			prompt,
		})
		return { text, usage }
	}

	async generateObject<T>(
		prompt: string,
		schema: Schema<T>,
		model?: string
	): Promise<LlmProviderObjectResponse<T>> {
		const selectedModel = model || this.activeModel

		const { output, usage } = await generateText({
			model: this.client(selectedModel),
			prompt,
			output: Output.object({ schema }),
		})

		if (!output) {
			throw new Error('Failed to generate structured output')
		}

		return { output: output as T, usage }
	}
}
