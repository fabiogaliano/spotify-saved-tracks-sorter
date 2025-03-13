import { userRepository } from '~/lib/repositories/UserRepository'
import { User } from '~/lib/models/User'
import { providerKeyService } from '~/lib/services/llm/ProviderKeyService'

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

  async saveUserSetup(userId: number, config: { provider: string; apiKey: string; batchSize: number }) {
    await providerKeyService.saveProviderKey(userId, config.provider, config.apiKey);
    await providerKeyService.setActiveProvider(userId, config.provider);

    // todo: Save batchSize to user preferences
  }
}

export const userService = new UserService()
