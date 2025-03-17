import { userRepository } from '~/lib/repositories/UserRepository'
import { LibrarySyncMode, User } from '~/lib/models/User'
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

  async saveUserInitialSetup(userId: number, config: { batchSize: number, syncMode: LibrarySyncMode }) {
    await userRepository.updateUserPreferences(userId, { batch_size: config.batchSize, sync_mode: config.syncMode })
    return true;
  }

  async setUserHasSetupCompleted(userId: number, hasSetupCompleted: boolean) {
    await userRepository.setUserHasSetupCompleted(userId, hasSetupCompleted);
  }
}

export const userService = new UserService()
