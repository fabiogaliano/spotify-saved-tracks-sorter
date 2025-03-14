import { redirect, type LoaderFunctionArgs } from '@remix-run/node'
import { authenticator, spotifyStrategy } from '~/features/auth/auth.server'
import { initializeSpotifyApi, getSpotifyApi } from '~/lib/api/spotify.api'
import { userService } from '~/lib/services/UserService'
import { trackRepository } from '~/lib/repositories/TrackRepository'
import { logger } from '~/lib/logging/Logger'
import { createUserSession } from '~/features/auth/session.server'

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const spotifySession = await spotifyStrategy.getSession(request)

    if (spotifySession?.user?.id) {
      logger.setDefaultContext({ username: spotifySession.user.id });
    }

    if (!spotifySession) {
      logger.warn('no session')
      return { spotifyProfile: null, user: null, savedTracks: null }
    }

    if (spotifySession.expiresAt <= Date.now()) {
      logger.info('session expired')
      throw await authenticator.logout(request, { redirectTo: '/login' })
    }

    initializeSpotifyApi({
      accessToken: spotifySession.accessToken,
      refreshToken: spotifySession.refreshToken!,
      expiresIn: Math.floor((spotifySession.expiresAt - Date.now()) / 1000),
    })

    const spotifyProfile = await getSpotifyApi().currentUser.profile()

    if (!spotifyProfile?.id) {
      logger.error('Failed to get Spotify profile')
      throw new Error('Failed to get Spotify profile')
    }

    logger.info('login')

    const user = await userService.getOrCreateUser(spotifyProfile.id, spotifyProfile.email)


    await createUserSession(request, { id: user.id, has_setup_completed: user.has_setup_completed })

    if (!user?.has_setup_completed) {
      return redirect('/setup')
    }

    const savedTracks = user ? await trackRepository.getSavedTracks(user.id) : null

    return { spotifyProfile, user, savedTracks }
  } catch (error) {
    console.error('Loader error:', error)
    if (error instanceof Response) throw error
    return { spotifyProfile: null, user: null, savedTracks: null }
  }
} 