import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { generateText, LanguageModelUsage } from 'ai'
import type { ProviderInterface } from '../../../domain/LlmProvider'

export class GoogleProvider implements ProviderInterface {
  name = 'google'
  private client
  private defaultModel = 'gemini-2.0-flash'
  private availableModels = ['gemini-2.0-flash']

  constructor(apiKey: string) {
    this.client = createGoogleGenerativeAI({ apiKey })
  }

  getAvailableModels() {
    return this.availableModels
  }

  async generateText(prompt: string, model?: string): Promise<{ text: string; usage: LanguageModelUsage }> {
    const selectedModel = model || this.defaultModel

    const { text, usage } = await generateText({
      model: this.client(selectedModel),
      prompt,
      temperature: 0.3,
    })
    return { text, usage }
  }
}
