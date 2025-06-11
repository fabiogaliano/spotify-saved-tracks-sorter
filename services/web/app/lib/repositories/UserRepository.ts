import { getSupabase } from '~/lib/services/DatabaseService'
import { User, CreateUserParams, UserPreferences } from '~/lib/models/User'


export interface UserRepository {
  findUser(spotifyUserId: string): Promise<User | null>
  createUser(user: CreateUserParams): Promise<User>
  updateUser(spotifyUserId: string, updates: Partial<User>): Promise<User>
  updateSetupCompletion(spotifyUserId: string, hasSetupCompleted: boolean): Promise<User>
  getUserPreferences(userId: number): Promise<UserPreferences | null>
  updateUserPreferences(userId: number, updates: Partial<UserPreferences>): Promise<UserPreferences>
  setUserHasSetupCompleted(userId: number, hasSetup: boolean): Promise<User>
}

class SupabaseUserRepository implements UserRepository {
  async findUser(spotifyUserId: string): Promise<User | null> {
    const { data, error } = await getSupabase()
      .from('users')
      .select('*')
      .eq('spotify_user_id', spotifyUserId)
      .maybeSingle()

    if (error) throw error
    return data
  }

  async createUser(user: CreateUserParams): Promise<User> {
    const { data, error } = await getSupabase()
      .from('users')
      .insert(user)
      .select()
      .single()

    if (error) throw error
    if (!data) throw new Error('Failed to create user')
    return data
  }

  async updateUser(spotifyUserId: string, updates: Partial<User>): Promise<User> {
    const { data, error } = await getSupabase()
      .from('users')
      .update(updates)
      .eq('spotify_user_id', spotifyUserId)
      .select()
      .single()

    if (error) throw error
    if (!data) throw new Error('Failed to update user')
    return data
  }

  async updateSetupCompletion(spotifyUserId: string, hasSetupCompleted: boolean): Promise<User> {
    return this.updateUser(spotifyUserId, { has_setup_completed: hasSetupCompleted })
  }

  async getUserPreferences(userId: number): Promise<UserPreferences | null> {
    const { data, error } = await getSupabase()
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) throw error
    return data
  }

  async updateUserPreferences(userId: number, updates: Partial<UserPreferences>): Promise<UserPreferences> {
    const { data, error } = await getSupabase()
      .from('user_preferences')
      .upsert({ user_id: userId, ...updates })
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error
    if (!data) throw new Error('Failed to update user preferences')
    return data
  }

  async setUserHasSetupCompleted(userId: number, hasSetup: boolean): Promise<User> {
    const { data, error } = await getSupabase()
      .from('users')
      .update({ has_setup_completed: hasSetup })
      .eq('id', userId)
      .select()
      .single()

    if (error) throw error
    if (!data) throw new Error('Failed to update user has setup')
    return data
  }
}

export const userRepository = new SupabaseUserRepository()
