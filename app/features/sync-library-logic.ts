import type { ActionFunction } from '@remix-run/node'
import { SpotifyService } from '~/lib/services/SpotifyService'
import { SyncService } from '~/lib/services/SyncService'
import { trackRepository } from '~/lib/repositories/TrackRepository'
import { trackService } from '~/lib/services/TrackService'
import { playlistRepository } from '~/lib/repositories/PlaylistRepository'
import type { Enums } from '~/types/database.types'
import { getUserSession } from './auth/auth.utils'

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData()
  const userId = formData.get('userId')
  const action = formData.get('_action')

  try {
    const userIdNumber = userId ? Number(userId) : null
    if (!userIdNumber) throw new Error('User ID not provided')

    if (action === 'sync') {
      // Get user session to get the spotify API instance
      const userSession = await getUserSession(request)
      if (!userSession || !userSession.spotifyApi) {
        throw new Error('User not authenticated or Spotify API not available')
      }

      // Create service with the spotifyApi instance
      const spotifyService = new SpotifyService(userSession.spotifyApi)
      const syncService = new SyncService(spotifyService, trackRepository, playlistRepository, trackService)

      const [tracksResult, playlistsResult] = await Promise.all([
        syncService.syncSavedTracks(userIdNumber),
        syncService.syncPlaylists(userIdNumber)
      ])

      return {
        savedTracks: {
          success: Boolean(tracksResult.success),
          message: tracksResult.message
            ? tracksResult.message
            : `Processed ${tracksResult.totalProcessed} tracks, ${tracksResult.newItems} new`
        },
        playlists: {
          success: Boolean(playlistsResult.success),
          message: playlistsResult.message
            ? playlistsResult.message
            : `Processed ${playlistsResult.totalProcessed} playlists, ${playlistsResult.newItems} new`
        }
      }
    }

    if (action === 'updateTrackStatus') {
      const trackId = Number(formData.get('trackId'))
      const status = formData.get('status') as Enums<'sorting_status_enum'>
      await trackRepository.updateTrackStatus(trackId, status)
      return { success: true }
    }
  } catch (error) {
    console.error('Action error:', error)
    return {
      error: error instanceof Error ? error.message : 'Failed to process request'
    }
  }
} 