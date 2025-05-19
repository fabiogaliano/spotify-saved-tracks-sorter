import { LlmProviderManager } from '~/lib/services/llm/LlmProviderManager'
import { DefaultSongAnalysisService } from '~/lib/services/analysis/SongAnalysisService'
import { providerKeyService } from '~/lib/services/llm/ProviderKeyService'
import { lyricsService } from '~/lib/services' // We can still use the shared lyrics service

/**
 * Creates a SongAnalysisService instance using the user's selected provider and API key
 */
export async function createSongAnalysisService(userId: number) {
  // Get the user's active provider
  const activeProvider = await providerKeyService.getActiveProvider(userId)
  if (!activeProvider) {
    throw new Error('No active LLM provider found. Please set up a provider in your settings.')
  }
  
  // Get the API key for that provider
  const apiKey = await providerKeyService.getDecryptedProviderKey(userId, activeProvider)
  if (!apiKey) {
    throw new Error(`No API key found for provider: ${activeProvider}`)
  }
  
  // Create the LLM provider manager with the user's settings
  const llmManager = new LlmProviderManager(activeProvider, apiKey)
  
  // Create and return the song analysis service
  return new DefaultSongAnalysisService(lyricsService, llmManager)
}
