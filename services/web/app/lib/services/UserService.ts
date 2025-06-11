import { userRepository } from '~/lib/repositories/UserRepository'
import { LibrarySyncMode, User, UserPreferences } from '~/lib/models/User'
import { providerKeyService } from '~/lib/services/llm/ProviderKeyService'
import type { Enums } from '~/types/database.types'

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

  async getUserPreferences(userId: number): Promise<UserPreferences | null> {
    return userRepository.getUserPreferences(userId);
  }

  async updateBatchSize(userId: number, batchSize: number): Promise<UserPreferences> {
    return userRepository.updateUserPreferences(userId, { batch_size: batchSize });
  }

  async updateSyncMode(userId: number, syncMode: LibrarySyncMode): Promise<UserPreferences> {
    return userRepository.updateUserPreferences(userId, { sync_mode: syncMode });
  }

  async updateTheme(userId: number, theme: Enums<'theme'>): Promise<UserPreferences> {
    return userRepository.updateUserPreferences(userId, { theme_preference: theme });
  }

  async updateAllPreferences(userId: number, preferences: {
    batchSize?: number;
    syncMode?: LibrarySyncMode;
    theme?: Enums<'theme'>;
  }): Promise<UserPreferences> {
    const updates: Partial<UserPreferences> = {};
    if (preferences.batchSize !== undefined) updates.batch_size = preferences.batchSize;
    if (preferences.syncMode !== undefined) updates.sync_mode = preferences.syncMode;
    if (preferences.theme !== undefined) updates.theme_preference = preferences.theme;
    
    return userRepository.updateUserPreferences(userId, updates);
  }
}

export const userService = new UserService()
