import { Tables, TablesInsert, TablesUpdate } from "~/types/database.types"

export type ProviderKey = Tables<'provider_keys'>
export type ProviderKeyInsert = TablesInsert<'provider_keys'>
export type ProviderKeyUpdate = TablesUpdate<'provider_keys'>
export type UserProviderPreference = Tables<'user_provider_preferences'>

export interface ProviderKeysRepository {
  getByUserId(userId: number): Promise<ProviderKey[]>
  getByUserIdAndProvider(userId: number, provider: string): Promise<ProviderKey | null>
  insertKey(key: ProviderKeyInsert): Promise<ProviderKey>
  updateKey(id: number, key: ProviderKeyUpdate): Promise<ProviderKey>
  deleteKey(id: number): Promise<void>
  getUserProviderPreference(userId: number): Promise<UserProviderPreference | null>
  setActiveProvider(userId: number, provider: string): Promise<void>
}
