import { createAnthropic } from '@ai-sdk/anthropic'
import { generateText, LanguageModelUsage } from 'ai'
import type { ProviderInterface } from '../../../domain/LlmProvider'

export class AnthropicProvider implements ProviderInterface {
  name = 'anthropic'
  private client
  private defaultModel = 'claude-3-haiku'
  private availableModels = ['claude-3-sonnet', 'claude-instant-1.2', 'claude-3-haiku']

  constructor(apiKey: string) {
    this.client = createAnthropic({ apiKey })
  }

  getAvailableModels() {
    return this.availableModels
  }

  async generateText(prompt: string, model?: string): Promise<{ text: string; usage: LanguageModelUsage }> {
    const selectedModel = model || this.defaultModel
    const { text, usage } = await generateText({
      model: this.client(selectedModel),
      prompt,
    })
    return { text, usage }
  }
}
