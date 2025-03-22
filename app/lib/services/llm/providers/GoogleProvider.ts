import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { generateText, LanguageModelUsage } from 'ai'
import type { ProviderInterface } from '~/lib/models/LlmProvider'

export class GoogleProvider implements ProviderInterface {
  name = 'google'
  private client
  private activeModel = 'gemini-2.0-flash'
  private availableModels = ['gemini-2.0-flash']

  constructor(apiKey: string) {
    this.client = createGoogleGenerativeAI({ apiKey })
  }

  getAvailableModels() {
    return this.availableModels
  }

  getActiveModel() {
    return this.activeModel
  }

  setActiveModel(model: string) {
    if (!this.availableModels.includes(model)) {
      throw new Error(`Model ${model} is not available for Google provider`)
    }
    this.activeModel = model
  }

  async generateText(prompt: string, model?: string): Promise<{ text: string; usage: LanguageModelUsage }> {
    // If model is provided, temporarily use it without changing the active model
    const selectedModel = model || this.activeModel

    const { text, usage } = await generateText({
      model: this.client(selectedModel),
      prompt,
      temperature: 0.3,
    })
    return { text, usage }
  }
}
