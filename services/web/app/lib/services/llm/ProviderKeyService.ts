import type { ProviderKey } from '~/lib/models/ProviderKeys'
import { providerKeysRepository } from '~/lib/repositories/ProviderKeysRepository'
import { decryptApiKey, encryptApiKey } from '~/lib/utils/encryption'

const ENCRYPTION_SECRET =
	process.env.ENCRYPTION_SECRET || 'default-secret-change-in-production'

export class ProviderKeyService {
	async getUserProviderKeys(userId: number): Promise<ProviderKey[]> {
		return await providerKeysRepository.getByUserId(userId)
	}

	async saveProviderKey(
		userId: number,
		provider: string,
		apiKey: string
	): Promise<ProviderKey> {
		const existingKey = await providerKeysRepository.getByUserIdAndProvider(
			userId,
			provider
		)

		try {
			const { encryptedKey, iv, authTag } = encryptApiKey(apiKey, ENCRYPTION_SECRET)

			if (!encryptedKey) {
				throw new Error('Encryption failed - encryptedKey is empty')
			}

			if (existingKey) {
				return await providerKeysRepository.updateKey(existingKey.id, {
					encrypted_key: encryptedKey,
					iv,
					auth_tag: authTag,
				})
			} else {
				return await providerKeysRepository.insertKey({
					user_id: userId,
					provider,
					encrypted_key: encryptedKey,
					iv,
					auth_tag: authTag,
				})
			}
		} catch (error) {
			throw new Error(
				`Failed to encrypt or save key: ${error instanceof Error ? error.message : 'Unknown error'}`
			)
		}
	}

	async getDecryptedProviderKey(
		userId: number,
		provider: string
	): Promise<string | null> {
		const providerKey = await providerKeysRepository.getByUserIdAndProvider(
			userId,
			provider
		)

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

	async deleteProviderKey(userId: number, provider: string): Promise<void> {
		const providerKey = await providerKeysRepository.getByUserIdAndProvider(
			userId,
			provider
		)

		if (providerKey) {
			await providerKeysRepository.deleteKey(providerKey.id)
		}
	}

	async hasAnyProviderKey(userId: number): Promise<boolean> {
		const keys = await providerKeysRepository.getByUserId(userId)
		return keys.length > 0
	}

	async getProviderStatuses(
		userId: number
	): Promise<Array<{ provider: string; hasKey: boolean; isActive: boolean }>> {
		const availableProviders = ['openai', 'anthropic', 'google']
		const userKeys = await providerKeysRepository.getByUserId(userId)
		const activeProvider = await this.getActiveProvider(userId)

		return availableProviders.map(provider => ({
			provider,
			hasKey: userKeys.some(key => key.provider === provider),
			isActive: provider === activeProvider,
		}))
	}

	async hasProviderKey(userId: number, provider: string): Promise<boolean> {
		const key = await providerKeysRepository.getByUserIdAndProvider(userId, provider)
		return !!key
	}

	async getActiveProvider(userId: number): Promise<string | null> {
		try {
			const preference = await providerKeysRepository.getUserProviderPreference(userId)
			if (preference && preference.active_provider) {
				const hasKey = await this.hasProviderKey(userId, preference.active_provider)
				if (hasKey) {
					return preference.active_provider
				}
			}

			const keys = await providerKeysRepository.getByUserId(userId)
			if (keys.length > 0) {
				return keys[0].provider
			}

			return null
		} catch (error) {
			console.error('Error getting active provider:', error)
			return null
		}
	}

	async setActiveProvider(userId: number, provider: string): Promise<void> {
		try {
			const hasKey = await this.hasProviderKey(userId, provider)
			if (!hasKey) {
				throw new Error(
					`Cannot set ${provider} as active because it doesn't have an API key`
				)
			}

			await providerKeysRepository.setActiveProvider(userId, provider)
		} catch (error) {
			console.error('Error setting active provider:', error)
			throw error
		}
	}
}

export const providerKeyService = new ProviderKeyService()
