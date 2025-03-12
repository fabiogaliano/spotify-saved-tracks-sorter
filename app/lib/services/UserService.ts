import { userRepository } from '~/lib/repositories/UserRepository'
import type { Database } from '~/types/database.types'

type User = Database['public']['Tables']['users']['Row']

export class UserService {
  async getOrCreateUser(spotifyUserId: string, spotifyUserEmail: string): Promise<User> {
    const existingUser = await userRepository.findUser(spotifyUserId)

    if (!existingUser) {
      return userRepository.createUser({
        spotify_user_id: spotifyUserId,
        spotify_user_email: spotifyUserEmail,
        last_login: new Date().toISOString(),
      })
    }

    const updateData: Partial<User> = { last_login: new Date().toISOString() }
    if (existingUser.spotify_user_email !== spotifyUserEmail) {
      updateData.spotify_user_email = spotifyUserEmail
    }

    return userRepository.updateUser(spotifyUserId, updateData)
  }
}

export const userService = new UserService()
