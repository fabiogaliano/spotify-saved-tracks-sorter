import type { LoaderFunctionArgs } from '@remix-run/node'
import { redirect } from '@remix-run/node'
import { authenticator, spotifyStrategy } from '~/core/auth/auth.server'
import { initializeSpotifyApi, getSpotifyApi } from '~/core/api/spotify.api'
import { getOrCreateUser as getOrCreateUserDB } from '~/core/db/user.server'
import { trackRepository } from '~/core/repositories/TrackRepository'
import { Logger } from '~/core/logging/Logger'

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const session = await spotifyStrategy.getSession(request)
    const logger = Logger.getInstance()

    if (session?.user?.id) {
      logger.setDefaultContext({ username: session.user.id });
    }

    if (!session) {
      logger.warn('no session')
      return { spotifyProfile: null, user: null, savedTracks: null }
    }

    if (session.expiresAt <= Date.now()) {
      logger.info('session expired')
      throw await authenticator.logout(request, { redirectTo: '/login' })
    }

    initializeSpotifyApi({
      accessToken: session.accessToken,
      refreshToken: session.refreshToken!,
      expiresIn: Math.floor((session.expiresAt - Date.now()) / 1000),
    })

    const spotifyApi = getSpotifyApi()
    const spotifyProfile = await spotifyApi.currentUser.profile()

    if (!spotifyProfile?.id) {
      logger.error('Failed to get Spotify profile')
      throw new Error('Failed to get Spotify profile')
    }

    logger.info('login')

    const user = await getOrCreateUserDB(spotifyProfile.id, spotifyProfile.email)
    const savedTracks = user ? await trackRepository.getSavedTracks(user.id) : null

    return { spotifyProfile, user, savedTracks }
  } catch (error) {
    console.error('Loader error:', error)
    if (error instanceof Response) throw error
    return { spotifyProfile: null, user: null, savedTracks: null }
  }
} 