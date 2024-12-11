export interface ProviderInterface {
  name: string
  generateText(prompt: string, model?: string): Promise<string>
  getAvailableModels(): string[]
}

export interface LlmProviderManager {
  switchProvider(providerName: string, apiKey: string): void
  getAvailableModels(): string[]
  generateText(prompt: string, model?: string): Promise<string>
}
