import { encryptApiKey, decryptApiKey } from '~/core/utils/encryption'
import { providerKeysRepository } from '~/core/repositories/ProviderKeysRepository'
import type { ProviderKey } from '~/core/domain/ProviderKeys'

// Environment variable for encryption secret
// In production, this should be a secure environment variable
const ENCRYPTION_SECRET = process.env.ENCRYPTION_SECRET || 'default-secret-change-in-production'

export class ProviderKeyService {
  // Get all provider keys for a user
  async getUserProviderKeys(userId: string): Promise<ProviderKey[]> {
    return await providerKeysRepository.getByUserId(userId)
  }

  // Save a provider key for a user
  async saveProviderKey(userId: string, provider: string, apiKey: string): Promise<ProviderKey> {
    // Check if the key already exists
    const existingKey = await providerKeysRepository.getByUserIdAndProvider(userId, provider)
    
    // Add logging to debug encryption issues
    console.log('Encryption secret length:', ENCRYPTION_SECRET ? ENCRYPTION_SECRET.length : 0)
    console.log('API key to encrypt:', apiKey ? 'Valid (not showing for security)' : 'Invalid/Empty')
    
    try {
      // Encrypt the API key
      const { encryptedKey, iv, authTag } = encryptApiKey(apiKey, ENCRYPTION_SECRET)
      
      // Verify encryption worked
      if (!encryptedKey) {
        throw new Error('Encryption failed - encryptedKey is empty')
      }
      
      console.log('Encryption successful:', {
        encryptedKeyLength: encryptedKey.length,
        ivLength: iv.length,
        authTagLength: authTag.length
      })
    
    if (existingKey) {
      // Update existing key
      return await providerKeysRepository.updateKey(existingKey.id, {
        encrypted_key: encryptedKey,
        iv,
        auth_tag: authTag,
      })
    } else {
      // Insert new key
      return await providerKeysRepository.insertKey({
        user_id: userId,
        provider,
        encrypted_key: encryptedKey,
        iv,
        auth_tag: authTag,
      })
    }
    } catch (error) {
      console.error('Error during encryption or key saving:', error)
      throw new Error(`Failed to encrypt or save key: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Get a decrypted provider key
  async getDecryptedProviderKey(userId: string, provider: string): Promise<string | null> {
    const providerKey = await providerKeysRepository.getByUserIdAndProvider(userId, provider)
    
    if (!providerKey) {
      return null
    }
    
    try {
      return decryptApiKey(
        providerKey.encrypted_key,
        providerKey.iv,
        providerKey.auth_tag || '', // Handle legacy records that might not have auth_tag
        ENCRYPTION_SECRET
      )
    } catch (error) {
      console.error('Failed to decrypt provider key:', error)
      return null
    }
  }

  // Delete a provider key
  async deleteProviderKey(userId: string, provider: string): Promise<void> {
    const providerKey = await providerKeysRepository.getByUserIdAndProvider(userId, provider)
    
    if (providerKey) {
      await providerKeysRepository.deleteKey(providerKey.id)
    }
  }

  // Check if a user has any provider keys
  async hasAnyProviderKey(userId: string): Promise<boolean> {
    const keys = await providerKeysRepository.getByUserId(userId)
    return keys.length > 0
  }

  // Get all available providers with their status (key set or not)
  async getProviderStatuses(userId: string): Promise<Array<{provider: string, hasKey: boolean}>> {
    const availableProviders = ['openai', 'anthropic', 'google']
    const userKeys = await providerKeysRepository.getByUserId(userId)
    
    return availableProviders.map(provider => ({
      provider,
      hasKey: userKeys.some(key => key.provider === provider)
    }))
  }
}

export const providerKeyService = new ProviderKeyService()
