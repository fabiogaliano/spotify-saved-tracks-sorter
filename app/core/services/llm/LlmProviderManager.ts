import { OpenAIProvider } from './providers/OpenAIProvider'
import { AnthropicProvider } from './providers/AnthropicProvider'
import { GoogleProvider } from './providers/GoogleProvider'
import type { ProviderInterface, LlmProviderManager as ILlmProviderManager } from '~/core/domain/LlmProvider'
import { ApiError } from '~/core/errors/ApiError'
import { logger } from '~/core/logging/Logger'

export class LlmProviderManager implements ILlmProviderManager {
  private provider: ProviderInterface | null = null

  switchProvider(providerName: string, apiKey: string): void {
    try {
      logger.info('switch llm provider', { providerName })
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
          const error = new ApiError(
            'Unsupported provider',
            'LLM_PROVIDER_ERROR',
            400,
            { providerName }
          )
          logger.error('provider unsupported', error, { providerName })
          throw error
      }
      logger.debug('provider switched', { providerName })
    } catch (error) {
      logger.error('switch failed', error as Error, { providerName })
      throw new ApiError(
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
        const error = new ApiError(
          'No provider selected',
          'LLM_PROVIDER_ERROR',
          400
        )
        logger.error('No provider selected', error)
        throw error
      }
      const models = this.provider.getAvailableModels()
      logger.debug('llm:get_models', { 
        provider: this.provider.constructor.name,
        modelCount: models.length 
      })
      return models
    } catch (error) {
      logger.error('llm:get_models:failed', error as Error)
      throw new ApiError(
        'Failed to get available models',
        'LLM_PROVIDER_ERROR',
        500,
        { cause: error }
      )
    }
  }

  async generateText(prompt: string, model?: string): Promise<string> {
    try {
      if (!this.provider) {
        const error = new ApiError(
          'No provider selected',
          'LLM_PROVIDER_ERROR',
          400
        )
        logger.error('No provider selected', error)
        throw error
      }

      logger.info('LlmProvider.GenerateText[Provider:' + this.provider.constructor.name + ',Model:' + model + '].Start')

      const response = await this.provider.generateText(prompt, model)
      
      logger.debug('LlmProvider.GenerateText[Provider:' + this.provider.constructor.name + ',Model:' + model + '].Success[ResponseLength:' + response.length + ']')

      return response
    } catch (error) {
      logger.error('LlmProvider.GenerateText[Provider:' + this.provider?.constructor.name + ',Model:' + model + '].Failed', error as Error)
      throw new ApiError(
        'Failed to generate text',
        'LLM_PROVIDER_ERROR',
        500,
        { cause: error }
      )
    }
  }
}
