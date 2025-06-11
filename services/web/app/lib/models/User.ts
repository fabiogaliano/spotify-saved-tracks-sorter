import { UserProfile } from '@fostertheweb/spotify-web-sdk'
import type { Database, Tables, Enums } from '~/types/database.types'

export type User = Database['public']['Tables']['users']['Row']
export type CreateUserParams = Pick<User, 'spotify_user_id' | 'spotify_user_email'> & Partial<User>
export type UserPreferences = Tables<'user_preferences'>
export type LibrarySyncMode = Enums<'sync_mode_enum'>

export type SpotifyProfile = UserProfile