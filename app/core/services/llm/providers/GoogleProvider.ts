import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { generateText } from 'ai'
import type { ProviderInterface } from '../../../domain/LlmProvider'

export class GoogleProvider implements ProviderInterface {
  name = 'google'
  private client
  private defaultModel = 'gemini-flash-1.5'
  private availableModels = ['gemini-pro', 'gemini-flash-1.5']

  constructor(apiKey: string) {
    this.client = createGoogleGenerativeAI({ apiKey })
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
