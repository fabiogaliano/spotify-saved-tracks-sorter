import { OpenAIProvider } from './providers/OpenAIProvider'
import { AnthropicProvider } from './providers/AnthropicProvider'
import { GoogleProvider } from './providers/GoogleProvider'
import type { ProviderInterface, LlmProviderManager as ILlmProviderManager } from '../../domain/LlmProvider'
import { ApiError } from '../../errors'
import { logger } from '../../logging'

export class LlmProviderManager implements ILlmProviderManager {
  private provider: ProviderInterface | null = null

  switchProvider(providerName: string, apiKey: string): void {
    try {
      logger.info('Switching LLM provider', { providerName })
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
          logger.error('Unsupported provider', error, { providerName })
          throw error
      }
      logger.debug('Successfully switched provider', { providerName })
    } catch (error) {
      logger.error('Failed to switch provider', error as Error, { providerName })
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
      logger.debug('Retrieved available models', { 
        provider: this.provider.constructor.name,
        modelCount: models.length 
      })
      return models
    } catch (error) {
      logger.error('Failed to get available models', error as Error)
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

      logger.info('Generating text', { 
        provider: this.provider.constructor.name,
        model,
        promptLength: prompt.length 
      })

      const response = await this.provider.generateText(prompt, model)
      
      logger.debug('Successfully generated text', { 
        provider: this.provider.constructor.name,
        model,
        responseLength: response.length 
      })

      return response
    } catch (error) {
      logger.error('Failed to generate text', error as Error, { 
        provider: this.provider?.constructor.name,
        model,
        promptLength: prompt.length 
      })
      throw new ApiError(
        'Failed to generate text',
        'LLM_PROVIDER_ERROR',
        500,
        { cause: error }
      )
    }
  }
}
