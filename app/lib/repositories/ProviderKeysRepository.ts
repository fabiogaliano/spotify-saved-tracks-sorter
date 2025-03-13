import { getSupabase } from '~/lib/db/db'
import type { ProviderKey, ProviderKeyInsert, ProviderKeyUpdate, ProviderKeysRepository, UserProviderPreference } from '~/lib/models/ProviderKeys'

class SupabaseProviderKeysRepository implements ProviderKeysRepository {
  async getByUserId(userId: number): Promise<ProviderKey[]> {
    // Using Spotify user ID (string)
    const { data, error } = await getSupabase()
      .from('provider_keys')
      .select('*')
      .eq('user_id', userId)

    if (error) throw error
    return data || []
  }

  async getByUserIdAndProvider(userId: number, provider: string): Promise<ProviderKey | null> {
    const { data, error } = await getSupabase()
      .from('provider_keys')
      .select('*')
      .eq('user_id', userId)
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

  // User provider preferences methods
  async getUserProviderPreference(userId: number): Promise<UserProviderPreference | null> {
    // Using standard text comparison for user_id
    const { data, error } = await getSupabase()
      .from('user_provider_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) throw error
    return data
  }

  async setActiveProvider(userId: number, provider: string): Promise<void> {
    const existing = await this.getUserProviderPreference(userId)

    if (existing) {
      // Update existing preference
      const { error } = await getSupabase()
        .from('user_provider_preferences')
        .update({
          active_provider: provider,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)

      if (error) throw error
    } else {
      const { error } = await getSupabase()
        .from('user_provider_preferences')
        .insert({
          user_id: userId,
          active_provider: provider,
          updated_at: new Date().toISOString()
        })

      if (error) throw error
    }
  }
}

export const providerKeysRepository = new SupabaseProviderKeysRepository()
