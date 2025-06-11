import { OpenAIProvider } from './providers/OpenAIProvider'
import { AnthropicProvider } from './providers/AnthropicProvider'
import { GoogleProvider } from './providers/GoogleProvider'
import type { LlmProviderManager as ILlmProviderManager } from '~/lib/services'
import type { ProviderInterface, LlmProviderResponse } from '~/lib/models/LlmProvider'
import { logger } from '~/lib/logging/Logger'

export type LlmProviderName = 'openai' | 'anthropic' | 'google'


export class LlmProviderManager implements ILlmProviderManager {
  private provider: ProviderInterface | null = null

  constructor(providerName: LlmProviderName, apiKey: string) {
    this.switchProvider(providerName, apiKey)
  }

  switchProvider(providerName: LlmProviderName, apiKey: string): void {
    try {
      switch (providerName) {
        case 'openai':
          this.provider = new OpenAIProvider(apiKey)
          break
        case 'anthropic':
          this.provider = new AnthropicProvider(apiKey)
          break
        case 'google':
          this.provider = new GoogleProvider(apiKey)
          break
        default:
          const error = new logger.AppError(
            'Unsupported provider',
            'LLM_PROVIDER_ERROR',
            400,
            { providerName }
          )
          throw error
      }
    } catch (error) {
      throw new logger.AppError(
        'Failed to switch provider',
        'LLM_PROVIDER_ERROR',
        500,
        { cause: error, providerName }
      )
    }
  }

  getAvailableModels(): string[] {
    try {
      if (!this.provider) {
        const error = new logger.AppError(
          'No provider selected',
          'LLM_PROVIDER_ERROR',
          400
        )
        throw error
      }
      return this.provider.getAvailableModels()
    } catch (error) {
      throw new logger.AppError(
        'Failed to get available models',
        'LLM_PROVIDER_ERROR',
        500,
        { cause: error }
      )
    }
  }

  setActiveModel(model: string): void {
    if (!this.provider) {
      throw new logger.AppError(
        'No provider selected',
        'LLM_PROVIDER_ERROR',
        400
      )
    }

    try {
      this.provider.setActiveModel(model)
    } catch (error) {
      throw new logger.AppError(
        'Failed to set active model',
        'LLM_PROVIDER_ERROR',
        400,
        { cause: error, provider: this.provider.name, model }
      )
    }
  }

  getCurrentModel(): string {
    if (!this.provider) {
      throw new logger.AppError(
        'No provider selected',
        'LLM_PROVIDER_ERROR',
        400
      )
    }

    const modelName = this.provider.getActiveModel()
    return `${this.provider.name}:${modelName}`
  }

  async generateText(prompt: string, model?: string): Promise<LlmProviderResponse> {
    try {
      if (!this.provider) {
        const error = new logger.AppError(
          'No provider selected',
          'LLM_PROVIDER_ERROR',
          400
        )
        throw error
      }

      const activeModel = model || this.provider.getActiveModel()
      const response = await this.provider.generateText(prompt, activeModel)
      return response
    } catch (error) {
      throw new logger.AppError(
        'Failed to generate text',
        'LLM_PROVIDER_ERROR',
        500,
        { cause: error }
      )
    }
  }
}
