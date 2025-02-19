import { LanguageModelUsage } from "ai";

export interface ProviderInterface {
  name: string
  generateText(prompt: string, model?: string): Promise<LlmProviderResponse>
  getAvailableModels(): string[]
}

export interface LlmProviderManager {
  switchProvider(providerName: string, apiKey: string): void
  getAvailableModels(): string[]
  generateText(prompt: string, model?: string): Promise<LlmProviderResponse>
}

export type LlmProviderResponse = {
  text: string;
  usage: LanguageModelUsage;
}