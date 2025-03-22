import { LlmProviderManager } from './LlmProviderManager'
import { providerKeyService } from './ProviderKeyService'
import { logger } from '~/lib/logging/Logger'

export class LlmProviderManagerFactory {
  /**
   * Creates an LlmProviderManager instance using the user's stored API keys
   * @param userId The user ID to retrieve API keys for
   * @returns An LlmProviderManager instance or null if no keys are available
   */
  static async createFromUserKeys(userId: number): Promise<LlmProviderManager | null> {
    // Get all provider statuses
    const providerStatuses = await providerKeyService.getProviderStatuses(userId)

    // Find providers with keys
    const providersWithKeys = providerStatuses.filter(status => status.hasKey)

    if (providersWithKeys.length === 0) {
      return null
    }

    // Use the first available provider with a key
    const provider = providersWithKeys[0].provider
    const apiKey = await providerKeyService.getDecryptedProviderKey(userId, provider)

    if (!apiKey) {
      return null
    }

    return new LlmProviderManager(provider, apiKey)
  }

  /**
   * Creates an LlmProviderManager instance for a specific provider
   * @param userId The user ID to retrieve API keys for
   * @param provider The provider to use
   * @returns An LlmProviderManager instance
   * @throws ApiError if the provider key is not found
   */
  static async createForProvider(userId: number, provider: string): Promise<LlmProviderManager> {
    const apiKey = await providerKeyService.getDecryptedProviderKey(userId, provider)

    if (!apiKey) {
      throw new logger.AppError(
        `No API key found for provider: ${provider}`,
        'LLM_PROVIDER_ERROR',
        400,
        { provider }
      )
    }

    return new LlmProviderManager(provider, apiKey)
  }
}
