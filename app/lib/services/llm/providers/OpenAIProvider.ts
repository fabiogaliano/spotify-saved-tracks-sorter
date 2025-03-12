import { createOpenAI } from '@ai-sdk/openai'
import { generateText, LanguageModelUsage } from 'ai'
import type { ProviderInterface } from '../../../domain/LlmProvider'

export class OpenAIProvider implements ProviderInterface {
  name = 'openai'
  private client
  private activeModel = 'gpt-4o-mini'
  private availableModels = [
    'gpt-4o-mini',
    'gpt-3.5-turbo',
    'gpt-4o',
    'gpt-4o-2024-08-06',
  ]

  constructor(apiKey: string) {
    this.client = createOpenAI({ apiKey })
  }

  getAvailableModels() {
    return this.availableModels
  }

  getActiveModel() {
    return this.activeModel
  }

  setActiveModel(model: string) {
    if (!this.availableModels.includes(model)) {
      throw new Error(`Model ${model} is not available for OpenAI provider`)
    }
    this.activeModel = model
  }

  async generateText(prompt: string, model?: string): Promise<{ text: string; usage: LanguageModelUsage }> {
    // If model is provided, temporarily use it without changing the active model
    const selectedModel = model || this.activeModel
    const { text, usage } = await generateText({
      model: this.client(selectedModel),
      prompt,
    })
    return { text, usage }
  }
}
