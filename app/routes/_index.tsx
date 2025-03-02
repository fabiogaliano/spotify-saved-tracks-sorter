import type { LoaderFunctionArgs, MetaFunction, ActionFunction } from '@remix-run/node'
import { useActionData, useLoaderData, useFetcher, json, Link } from '@remix-run/react'
import { useState, useMemo, useEffect } from 'react'
import { useTrackSortingStore } from '~/core/stores/trackSortingStore'
import { SpotifyService } from '~/core/services/SpotifyService'
import { SyncService } from '~/core/services/SyncService'
import { trackRepository } from '~/core/repositories/TrackRepository'
import { playlistRepository } from '~/core/repositories/PlaylistRepository'
import { getOrCreateUser as getOrCreateUserDB } from '~/core/db/user.server'
import { initializeSpotifyApi, getSpotifyApi } from '~/core/api/spotify.api'
import { authenticator, spotifyStrategy } from '~/core/auth/auth.server'
import { SpotifyLogin } from '~/components/SpotifyLogin'
import { SpotifySignOut } from '~/components/SpotifySignOut'
import { TracksTable } from '~/components/TracksTable/TracksTable'
import { StatusFilter } from '~/components/TracksTable/StatusFilter'
import { ColumnToggle } from '~/components/TracksTable/ColumnVisibility'
import { HelpButton } from '~/components/HelpButton'
import { SyncLibraryButton } from '~/components/Sync/SyncLibraryButton'
import { ConfigButton } from '~/components/ConfigButton'
import { Database } from '~/types/database.types'
import { Logger } from '~/core/logging/Logger'

export const meta: MetaFunction = () => {
  return [
    { title: 'spotify liked songs - ai sorter' },
    { name: 'description', content: 'Welcome to spotify liked songs - ai sorter!' },
  ]
}

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

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData()
  const userId = formData.get('userId')
  const action = formData.get('_action')

  try {
    const userIdNumber = userId ? Number(userId) : null
    if (!userIdNumber) throw new Error('User ID not provided')

    if (action === 'sync') {
      const spotifyService = new SpotifyService()
      const syncService = new SyncService(spotifyService, trackRepository, playlistRepository)

      const [tracksResult, playlistsResult] = await Promise.all([
        syncService.syncSavedTracks(userIdNumber),
        syncService.syncPlaylists(userIdNumber)
      ])

      return json({
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
      })
    }

    if (action === 'updateTrackStatus') {
      const trackId = Number(formData.get('trackId'))
      const status = formData.get('status') as Database['public']['Enums']['sorting_status_enum']
      await trackRepository.updateTrackStatus(trackId, status)
      return json({ success: true })
    }
  } catch (error) {
    console.error('Action error:', error)
    return json({
      error: error instanceof Error ? error.message : 'Failed to process request'
    })
  }
}

export default function Index() {
  const { spotifyProfile, user, savedTracks } = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()
  const [showStatus, setShowStatus] = useState<'all' | 'unsorted' | 'sorted' | 'ignored'>(
    'unsorted'
  )
  const [showAlbum, setShowAlbum] = useState(false)
  const [showAddedDate, setShowAddedDate] = useState(false)
  const sortedTracksCount = useTrackSortingStore(state => state.getSortedTracksCount())

  // Memoized table data to prevent unnecessary recalculations
  const tableData = useMemo(() => {
    if (!savedTracks) return []

    return savedTracks
      .filter(track => showStatus === 'all' || track.sorting_status === showStatus)
      .map(track => ({
        id: track.tracks.spotify_track_id,
        name: track.tracks.name,
        artist: track.tracks.artist,
        album: track.tracks.album,
        likedAt: track.liked_at,
        sortingStatus: track.sorting_status,
        userId: user?.id,
      }))
  }, [savedTracks, showStatus, user?.id])

  useEffect(() => {
    setShowAlbum(window.innerWidth >= 1000)

    const handleResize = () => setShowAlbum(window.innerWidth >= 1000)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  if (!spotifyProfile) {
    return (
      <div className="h-screen flex items-center justify-center p-4">
        <SpotifyLogin />
      </div>
    )
  }

  // Rest of the component for logged in users
  return (
    <div className="max-w-[120rem] mx-auto px-2 sm:px-6 lg:px-10 py-6 lg:py-14">
      <nav className="space-y-6 lg:space-y-10 mb-6 lg:mb-12">
        <div className="flex flex-col-reverse sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-4 lg:pb-8">
          <div className="w-full sm:w-auto">
            {spotifyProfile?.display_name && (
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-medium text-gray-900 break-words text-center sm:text-left">
                Welcome, {spotifyProfile.display_name}
              </h1>
            )}
          </div>
          <div className="w-full sm:w-auto flex justify-center sm:justify-end gap-4">
            {sortedTracksCount > 0 && (
              <Link
                to="/matching"
                className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Match Songs <span className="ml-2 px-2 py-1 text-xs bg-blue-800 rounded-full">{sortedTracksCount}</span>
              </Link>
            )}
            <SyncLibraryButton userId={user.id} />
            <HelpButton />
            <ConfigButton />
            <SpotifySignOut />
          </div>
        </div>
      </nav>
      <main>
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6 lg:mb-8">
          <div className="w-full flex justify-center sm:justify-start sm:w-auto">
            <StatusFilter showStatus={showStatus} onStatusChange={setShowStatus} />
          </div>
          <div className="w-full flex justify-center sm:justify-start sm:w-auto">
            <ColumnToggle
              showAlbum={showAlbum}
              showAddedDate={showAddedDate}
              onShowAlbumChange={setShowAlbum}
              onShowAddedDateChange={setShowAddedDate}
            />
          </div>
        </div>
        <TracksTable
          tracks={tableData}
          showStatus={showStatus}
          showAddedDate={showAddedDate}
          showAlbum={showAlbum}
        />
      </main>
    </div>
  )
}
