import { ActionFunctionArgs } from 'react-router'
import { requireUserSession } from '~/features/auth/auth.utils'
import { SpotifyService } from '~/lib/services/SpotifyService'
import { PlaylistService } from '~/lib/services/PlaylistService'
import { logger } from '~/lib/logging/Logger'
import * as v from 'valibot'

export async function action({ request }: ActionFunctionArgs) {
  try {
    const session = await requireUserSession(request)
    const spotifyService = new SpotifyService(session.spotifyApi)
    const playlistService = new PlaylistService(spotifyService)

    const formData = await request.formData()
    const name = formData.get('name') as string
    const description = formData.get('description') as string

    const savedPlaylist = await playlistService.createAIPlaylist(name, description, session.userId)

    logger.info('AI playlist created and saved successfully', {
      spotifyPlaylistId: savedPlaylist.spotify_playlist_id,
      dbPlaylistId: savedPlaylist.id,
      name: savedPlaylist.name,
      description
    })

    return Response.json({
      success: true,
      playlist: savedPlaylist
    })

  } catch (error) {
    logger.error('Failed to create AI playlist', { error })

    // Handle Valibot validation errors
    if (v.isValiError(error)) {
      const firstIssue = error.issues[0]
      return Response.json({ error: firstIssue.message }, { status: 400 })
    }

    if (error instanceof logger.AppError) {
      // Handle Spotify API specific errors
      if (error.statusCode === 400) {
        return Response.json({ error: 'Invalid playlist data. Please check your input and try again.' }, { status: 400 })
      }
      if (error.statusCode === 403) {
        return Response.json({ error: 'Insufficient permissions to create playlist.' }, { status: 403 })
      }
      return Response.json({ error: error.message }, { status: error.statusCode })
    }

    return Response.json({ error: 'Failed to create playlist. Please try again.' }, { status: 500 })
  }
}