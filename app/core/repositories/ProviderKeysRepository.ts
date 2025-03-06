import { getSupabase } from '~/core/db/db'
import type { ProviderKey, ProviderKeyInsert, ProviderKeyUpdate, ProviderKeysRepository } from '../domain/ProviderKeys'

class SupabaseProviderKeysRepository implements ProviderKeysRepository {
  async getByUserId(userId: string): Promise<ProviderKey[]> {
    // Cast user_id to text to handle non-UUID user IDs
    const { data, error } = await getSupabase()
      .from('provider_keys')
      .select('*')
      .filter('user_id::text', 'eq', userId)

    if (error) throw error
    return data || []
  }

  async getByUserIdAndProvider(userId: string, provider: string): Promise<ProviderKey | null> {
    // Cast user_id to text to handle non-UUID user IDs
    const { data, error } = await getSupabase()
      .from('provider_keys')
      .select('*')
      .filter('user_id::text', 'eq', userId)
      .eq('provider', provider)
      .maybeSingle()

    if (error) throw error
    return data
  }

  async insertKey(key: ProviderKeyInsert): Promise<ProviderKey> {
    const { data, error } = await getSupabase()
      .from('provider_keys')
      .insert({
        ...key,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error
    if (!data) throw new Error('Failed to insert provider key')
    return data
  }

  async updateKey(id: number, key: ProviderKeyUpdate): Promise<ProviderKey> {
    const { data, error } = await getSupabase()
      .from('provider_keys')
      .update({
        ...key,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    if (!data) throw new Error('Failed to update provider key')
    return data
  }

  async deleteKey(id: number): Promise<void> {
    const { error } = await getSupabase()
      .from('provider_keys')
      .delete()
      .eq('id', id)

    if (error) throw error
  }
}

export const providerKeysRepository = new SupabaseProviderKeysRepository()
