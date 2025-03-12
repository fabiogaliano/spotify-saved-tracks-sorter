import { UserProfile } from '@fostertheweb/spotify-web-sdk'
import type { Database } from '~/types/database.types'

export type User = Database['public']['Tables']['users']['Row']
export type CreateUserParams = Pick<User, 'spotify_user_id' | 'spotify_user_email'> & Partial<User>

export type SpotifyProfile = UserProfile