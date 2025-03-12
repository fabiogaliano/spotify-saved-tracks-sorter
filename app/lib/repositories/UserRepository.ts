import { getSupabase } from '~/lib/db/db'
import { User, CreateUserParams } from '../models/User'


export interface UserRepository {
  findUser(spotifyUserId: string): Promise<User | null>
  createUser(user: CreateUserParams): Promise<User>
  updateUser(spotifyUserId: string, updates: Partial<User>): Promise<User>
  updateSetupCompletion(spotifyUserId: string, hasSetupCompleted: boolean): Promise<User>
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
}

export const userRepository = new SupabaseUserRepository()
