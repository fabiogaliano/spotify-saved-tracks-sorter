import { createOpenAI } from '@ai-sdk/openai'
import { generateText } from 'ai'
import type { ProviderInterface } from '../../../domain/LlmProvider'

export class OpenAIProvider implements ProviderInterface {
  name = 'openai'
  private client
  private defaultModel = 'gpt-4o-mini'
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

  async generateText(prompt: string, model?: string): Promise<string> {
    const selectedModel = model || this.defaultModel
    const { text } = await generateText({
      model: this.client(selectedModel),
      prompt,
    })
    return text
  }
}
