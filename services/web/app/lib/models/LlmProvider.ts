import { LanguageModelUsage } from "ai";

export interface ProviderInterface {
  name: string
  generateText(prompt: string, model?: string): Promise<LlmProviderResponse>
  getAvailableModels(): string[]
  getActiveModel(): string
  setActiveModel(model: string): void
}

export interface LlmProviderManager {
  switchProvider(providerName: string, apiKey: string): void
  getAvailableModels(): string[]
  generateText(prompt: string, model?: string): Promise<LlmProviderResponse>
  getCurrentModel(model?: string): string
  setActiveModel(model: string): void
}

export type LlmProviderResponse = {
  text: string;
  usage: LanguageModelUsage;
}