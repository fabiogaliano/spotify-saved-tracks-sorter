import type { Schema } from '@ai-sdk/provider-utils'
import { LanguageModelUsage } from 'ai'

export interface ProviderInterface {
	name: string
	generateText(prompt: string, model?: string): Promise<LlmProviderResponse>
	generateObject<T>(
		prompt: string,
		schema: Schema<T>,
		model?: string
	): Promise<LlmProviderObjectResponse<T>>
	getAvailableModels(): string[]
	getActiveModel(): string
	setActiveModel(model: string): void
}

export interface LlmProviderManager {
	switchProvider(providerName: string, apiKey: string): void
	getAvailableModels(): string[]
	generateText(prompt: string, model?: string): Promise<LlmProviderResponse>
	generateObject<T>(
		prompt: string,
		schema: Schema<T>,
		model?: string
	): Promise<LlmProviderObjectResponse<T>>
	getCurrentModel(model?: string): string
	setActiveModel(model: string): void
}

export type LlmProviderResponse = {
	text: string
	usage: LanguageModelUsage
}

export type LlmProviderObjectResponse<T> = {
	output: T
	usage: LanguageModelUsage
}
