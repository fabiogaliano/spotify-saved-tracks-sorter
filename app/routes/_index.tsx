import type { LoaderFunctionArgs, MetaFunction, ActionFunction } from '@remix-run/node'
import { useActionData, useLoaderData } from '@remix-run/react'
import { useState, useMemo } from 'react'
import { Instructions } from '~/components/Instructions'
import { SyncLibrary } from '~/components/SyncLibrary'
import {
	spotifyStrategy,
	getSpotifyApi,
	getOrCreateUserDB,
	initializeSpotifyApi,
	authenticator,
} from '~/services'
import { SYNC_TYPES, startSyncSavedTracks } from '~/services/api.sync_savedtracks'
import { startSyncPlaylists } from '~/services/api.sync_playlists'
import { getLastSyncTime, SavedTrackRow } from '~/services/db/savedtracks.server'
import { getSavedTracks } from '~/services/db/savedtracks.server'
import { Database } from '~/types/database.types'
import { SpotifyLogin } from '~/components/SpotifyLogin'
import { SpotifySignOut } from '~/components/SpotifySignOut'
import { TracksTable } from '~/components/TracksTable/TracksTable'
import { StatusFilter } from '~/components/TracksTable/StatusFilter'
import { ColumnToggle } from '~/components/TracksTable/ColumnVisibility'
import { InstructionsButton } from '~/components/InstructionsButton'

export const meta: MetaFunction = () => {
	return [
		{ title: 'Like songs automatic sorter' },
		{ name: 'description', content: 'Welcome to AI liked songs sorter!' },
	]
}

export async function loader({ request }: LoaderFunctionArgs) {
	let spotifyProfile = null
	let user = null
	let savedTracks: SavedTrackRow[] | null = null

	try {
		// First try to get the session
		const session = await spotifyStrategy.getSession(request)

		if (!session) {
			// If no session, return early with null values
			return { spotifyProfile, user, savedTracks }
		}

		// Check if session is expired
		if (session.expiresAt <= Date.now()) {
			// If session is expired, redirect to login
			throw await authenticator.logout(request, { redirectTo: '/login' })
		}

		try {
			// Initialize Spotify API with the session tokens
			initializeSpotifyApi({
				accessToken: session.accessToken,
				refreshToken: session.refreshToken!,
				expiresIn: Math.floor((session.expiresAt - Date.now()) / 1000),
			})

			const spotifyApi = getSpotifyApi()
			spotifyProfile = await spotifyApi.currentUser.profile()

			if (!spotifyProfile?.id) {
				throw new Error('Failed to get Spotify profile')
			}

			user = await getOrCreateUserDB(spotifyProfile.id, spotifyProfile.email)
			if (user) {
				savedTracks = await getSavedTracks(user.id)
			}
		} catch (error) {
			console.error('API or DB error:', error)
			// If there's an API error, we might need to re-authenticate
			throw await authenticator.logout(request, { redirectTo: '/login' })
		}

		return { spotifyProfile, user, savedTracks }
	} catch (error) {
		console.error('Loader error:', error)
		// If it's a Response (redirect), throw it
		if (error instanceof Response) throw error
		// Otherwise return null values
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
			const savedTracksResult = await startSyncSavedTracks(userIdNumber)
			const playlistsResult = await startSyncPlaylists(userIdNumber)

			return {
				savedTracks: savedTracksResult,
				playlists: playlistsResult,
			}
		}

		if (action === 'updateTrackStatus') {
			const trackId = formData.get('trackId')
			const status = formData.get(
				'status'
			) as Database['public']['Enums']['sorting_status_enum']
			return { success: true, message: `Track ${trackId} marked as ${status}` }
		}
	} catch (error) {
		console.error('Action error:', error)
		return { error: 'Failed to process request' }
	}
}

export default function Index() {
	const { spotifyProfile, user, savedTracks } = useLoaderData<typeof loader>()
	const actionData = useActionData<typeof action>()
	const [showStatus, setShowStatus] = useState<'all' | 'unsorted' | 'sorted' | 'ignored'>(
		'unsorted'
	)
	const [showAlbum, setShowAlbum] = useState(() => {
		if (typeof window !== 'undefined') {
			return window.innerWidth >= 640 // sm breakpoint
		}
		return true
	})
	const [showAddedDate, setShowAddedDate] = useState(false)

	const tableData = useMemo(() => {
		if (!savedTracks) return []

		return savedTracks
			.filter(track => {
				if (showStatus === 'all') return true
				return track.sorting_status === showStatus
			})
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

	// If user is not logged in, show only the login component centered
	if (!spotifyProfile) {
		return (
			<div className="h-screen flex items-center justify-center p-4">
				<SpotifyLogin />
			</div>
		)
	}

	// Rest of the component for logged in users
	return (
		<div className="max-w-[120rem] mx-auto px-4 sm:px-6 lg:px-10 py-6 lg:py-14">
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
						<InstructionsButton />
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
				<div className="bg-white rounded-xl lg:rounded-3xl border border-gray-100 shadow-sm p-3 sm:p-4 lg:p-8 -mx-4 sm:mx-0 overflow-x-auto">
					<TracksTable
						tracks={tableData}
						showStatus={showStatus}
						showAddedDate={showAddedDate}
						showAlbum={showAlbum}
					/>
				</div>
			</main>
		</div>
	)
}