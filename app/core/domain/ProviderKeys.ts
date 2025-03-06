export interface ProviderKey {
  id: number
  provider: string
  encrypted_key: string
  iv: string
  auth_tag: string
  user_id: string
  created_at: string
  updated_at: string
}

export interface ProviderKeyInsert {
  provider: string
  encrypted_key: string
  iv: string
  auth_tag: string
  user_id: string
  created_at?: string
  updated_at?: string
}

export interface ProviderKeyUpdate {
  encrypted_key?: string
  iv?: string
  auth_tag?: string
  updated_at?: string
}

export interface ProviderKeysRepository {
  getByUserId(userId: string): Promise<ProviderKey[]>
  getByUserIdAndProvider(userId: string, provider: string): Promise<ProviderKey | null>
  insertKey(key: ProviderKeyInsert): Promise<ProviderKey>
  updateKey(id: number, key: ProviderKeyUpdate): Promise<ProviderKey>
  deleteKey(id: number): Promise<void>
}
