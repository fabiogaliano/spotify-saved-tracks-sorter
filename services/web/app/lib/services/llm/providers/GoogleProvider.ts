import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { generateText, Output, LanguageModelUsage } from 'ai'
import type { ProviderInterface, LlmProviderObjectResponse } from '~/lib/models/LlmProvider'
import type { Schema } from '@ai-sdk/provider-utils'

export class GoogleProvider implements ProviderInterface {
  name = 'google'
  private client
  private activeModel = 'gemini-2.5-flash-lite'
  private availableModels = ['gemini-2.5-flash-lite', 'gemini-2.5-flash']

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
      temperature: 0.5,
      maxOutputTokens: 8192,
    })
    return { text, usage }
  }

  async generateObject<T>(prompt: string, schema: Schema<T>, model?: string): Promise<LlmProviderObjectResponse<T>> {
    const selectedModel = model || this.activeModel

    const { output, usage } = await generateText({
      model: this.client(selectedModel),
      prompt,
      temperature: 0.5,
      maxOutputTokens: 8192,
      output: Output.object({ schema }),
    })

    if (!output) {
      throw new Error('Failed to generate structured output')
    }

    return { output: output as T, usage }
  }
}
