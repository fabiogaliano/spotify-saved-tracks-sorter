import { OpenAIProvider } from './providers/OpenAIProvider'
import { AnthropicProvider } from './providers/AnthropicProvider'
import { GoogleProvider } from './providers/GoogleProvider'
import type { ProviderInterface, LlmProviderManager as ILlmProviderManager } from '../../domain/LlmProvider'

export class LlmProviderManager implements ILlmProviderManager {
  private provider: ProviderInterface | null = null

  switchProvider(providerName: string, apiKey: string): void {
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
        throw new Error('Unsupported provider')
    }
  }

  getAvailableModels(): string[] {
    if (!this.provider) {
      throw new Error('No provider selected')
    }
    return this.provider.getAvailableModels()
  }

  async generateText(prompt: string, model?: string): Promise<string> {
    if (!this.provider) {
      throw new Error('No provider selected')
    }
    return this.provider.generateText(prompt, model)
  }
}
