import { Tables, TablesInsert, TablesUpdate } from '~/types/database.types'

import { UserPreferences } from './User'

export type ProviderKey = Tables<'provider_keys'>
export type ProviderKeyInsert = TablesInsert<'provider_keys'>
export type ProviderKeyUpdate = TablesUpdate<'provider_keys'>

export interface ProviderKeysRepository {
	getByUserId(userId: number): Promise<ProviderKey[]>
	getByUserIdAndProvider(userId: number, provider: string): Promise<ProviderKey | null>
	insertKey(key: ProviderKeyInsert): Promise<ProviderKey>
	updateKey(id: number, key: ProviderKeyUpdate): Promise<ProviderKey>
	deleteKey(id: number): Promise<void>
	getUserProviderPreference(
		userId: number
	): Promise<Pick<UserPreferences, 'active_provider'> | null>
	setActiveProvider(userId: number, provider: string): Promise<void>
}
