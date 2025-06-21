import { ActionFunctionArgs } from 'react-router'
import { requireUserSession } from '~/features/auth/auth.utils'
import { SpotifyService } from '~/lib/services/SpotifyService'
import { PlaylistService } from '~/lib/services/PlaylistService'
import { logger } from '~/lib/logging/Logger'

export async function action({ request }: ActionFunctionArgs) {
  let formData: FormData | null = null;

  try {
    const session = await requireUserSession(request)
    const spotifyService = new SpotifyService(session.spotifyApi)
    const playlistService = new PlaylistService(spotifyService)

    formData = await request.formData()
    const playlistId = formData.get('playlistId') as string
    const name = formData.get('name') as string
    const description = formData.get('description') as string
    const isFlaggedParam = formData.get('is_flagged') as string | null

    if (!playlistId) {
      return Response.json({ error: 'Playlist ID is required' }, { status: 400 })
    }

    const playlistIdNumber = parseInt(playlistId, 10);

    if (isNaN(playlistIdNumber)) {
      return Response.json({ error: 'Invalid playlist ID format' }, { status: 400 })
    }

    const updateData: any = {
      id: playlistIdNumber,
      name,
      description
    }

    if (isFlaggedParam !== null) {
      updateData.isFlagged = isFlaggedParam === 'true'
    }

    const updatedPlaylist = await playlistService.updatePlaylistInfo(
      session.userId,
      updateData
    )

    logger.info('Playlist description updated successfully', {
      playlistId: updatedPlaylist.id,
      spotifyPlaylistId: updatedPlaylist.spotify_playlist_id,
      description: updatedPlaylist.description
    })

    return Response.json({
      success: true,
      playlist: updatedPlaylist
    })

  } catch (error) {
    logger.error('Failed to update playlist description', { error })

    if (error instanceof Error) {
      if (error.message === 'Playlist not found or unauthorized') {
        return Response.json({ error: 'Playlist not found or unauthorized' }, { status: 404 })
      }
      if (error.message.includes('too long')) {
        return Response.json({ error: error.message }, { status: 400 })
      }
    }

    if (error instanceof logger.AppError) {
      return Response.json({ error: error.message }, { status: error.statusCode })
    }

    return Response.json({ error: 'Failed to update playlist description. Please try again.' }, { status: 500 })
  }
}