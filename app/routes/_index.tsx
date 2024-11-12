import type { LoaderFunctionArgs, MetaFunction, ActionFunction } from '@remix-run/node'
import { useActionData, useLoaderData } from '@remix-run/react'
import { useState, useMemo } from 'react'
import { AuthenticationStatus } from '~/components/AuthenticationStatus'
import { Instructions } from '~/components/Instructions'
import { SyncLibrary } from '~/components/SyncLibrary'
import { TracksTable, StatusFilter } from '~/components/TracksTable'
import type { Track } from '~/components/TracksTable'
import saveSessionToFile from '~/save-spotify-session-tests'
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
		const session = await spotifyStrategy.getSession(request);
		
		if (session) {
			// Initialize Spotify API with the session tokens
			initializeSpotifyApi({
				accessToken: session.accessToken,
				refreshToken: session.refreshToken!,
				expiresIn: Math.floor((session.expiresAt - Date.now()) / 1000),
			})

			const spotifyApi = getSpotifyApi()
			spotifyProfile = await spotifyApi.currentUser.profile()
			
			if (spotifyProfile && spotifyProfile.id) {
				try {
					user = await getOrCreateUserDB(spotifyProfile.id, spotifyProfile.email)
					if (user) {
						savedTracks = await getSavedTracks(user.id)
					}
				} catch (error) {
					console.error('Error fetching user data:', error)
				}
			}
		}

		return { spotifyProfile, user, savedTracks }
	} catch (error) {
		console.error('Loader error:', error)
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
	const [showStatus, setShowStatus] = useState<'all' | 'unsorted' | 'sorted' | 'ignored'>('unsorted')

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

	return (
		<div className="max-w-7xl mx-auto px-6 py-8">
			<div className="mb-8">
				<AuthenticationStatus spotifyProfile={spotifyProfile} />
			</div>

			<Instructions />

			{spotifyProfile && savedTracks ? (
				<div>
					<StatusFilter showStatus={showStatus} onStatusChange={setShowStatus} />
					<TracksTable tracks={tableData} showStatus={showStatus} />
				</div>
			) : spotifyProfile ? (
				<SyncLibrary userId={user?.id} />
			) : null}
		</div>
	)
}
