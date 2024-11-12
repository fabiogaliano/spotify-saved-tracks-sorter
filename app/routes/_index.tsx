import type { LoaderFunctionArgs, MetaFunction, ActionFunction } from '@remix-run/node'
import { Form, useActionData, useLoaderData } from '@remix-run/react'
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
import { useState } from 'react'

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
	const [currentPage, setCurrentPage] = useState(1)
	const tracksPerPage = 100

	const filteredTracks = savedTracks?.filter(track => {
		if (showStatus === 'all') return true
		return track.sorting_status === showStatus
	})

	const totalTracks = filteredTracks?.length || 0
	const totalPages = Math.ceil(totalTracks / tracksPerPage)
	const indexOfLastTrack = currentPage * tracksPerPage
	const indexOfFirstTrack = indexOfLastTrack - tracksPerPage
	const currentTracks = filteredTracks?.slice(indexOfFirstTrack, indexOfLastTrack)

	const handlePageChange = (pageNumber: number) => {
		setCurrentPage(pageNumber)
		window.scrollTo(0, 0)
	}

	return (
		<div className="max-w-5xl mx-auto px-6 py-8">
			{/* Authentication Status */}
			<div className="mb-8">
				{spotifyProfile ? (
					<div className="flex items-center justify-between">
						<p className="text-lg">Welcome, {spotifyProfile.display_name}</p>
						<Form action="/logout" method="post">
							<button className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">
								Sign Out
							</button>
						</Form>
					</div>
				) : (
					<div className="text-center">
						<p className="text-xl mb-4">Welcome to Spotify AI Playlist Organizer</p>
						<Form action="/auth/spotify" method="post">
							<button className="px-6 py-3 bg-[#1DB954] text-white font-semibold rounded-full hover:bg-[#1ed760] transition-colors">
								Connect with Spotify
							</button>
						</Form>
					</div>
				)}
			</div>

			{/* Instructions */}
			<div className="bg-gray-50 rounded-2xl p-6 mb-8">
				<h2 className="text-lg font-semibold mb-4">How it works</h2>
				<ol className="space-y-3">
					<li>1. Create or select a playlist in Spotify</li>
					<li>2. Edit the playlist description to start with "AI:"</li>
					<li>3. Add your desired mood or theme after "AI:"</li>
				</ol>
				<div className="mt-4 p-4 bg-white rounded-xl">
					<p className="text-sm text-gray-600">Example description:</p>
					<p className="font-medium">AI: falling in love and taking life slowly</p>
				</div>
			</div>

			{/* Content Area */}
			{spotifyProfile && savedTracks ? (
				<div>
					{/* Filter Controls */}
					<div className="flex space-x-2 mb-6">
						<button
							onClick={() => setShowStatus('all')}
							className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
								showStatus === 'all'
									? 'bg-gray-900 text-white'
									: 'bg-gray-100 text-gray-700 hover:bg-gray-200'
							}`}
						>
							All Tracks
						</button>
						<button
							onClick={() => setShowStatus('unsorted')}
							className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
								showStatus === 'unsorted'
									? 'bg-gray-900 text-white'
									: 'bg-gray-100 text-gray-700 hover:bg-gray-200'
							}`}
						>
							Unsorted
						</button>
					</div>

					{/* Responsive Table */}
					<div className="overflow-x-auto">
						<div className="inline-block min-w-full align-middle">
							<div className="overflow-hidden border border-gray-200 rounded-2xl">
								<table className="min-w-full divide-y divide-gray-200">
									<thead className="bg-gray-50">
										<tr>
											<th scope="col" className="py-3 pl-4 pr-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sm:pl-6">Track</th>
											<th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Artist</th>
											<th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Album</th>
											<th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Added</th>
											<th scope="col" className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
										</tr>
									</thead>
									<tbody className="bg-white divide-y divide-gray-200">
										{currentTracks?.map(track => (
											<tr key={track.tracks.spotify_track_id} className="hover:bg-gray-50">
												<td className="py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6 truncate max-w-xs">
													{track.tracks.name}
												</td>
												<td className="px-3 py-4 text-sm text-gray-500 truncate max-w-xs">
													{track.tracks.artist}
												</td>
												<td className="px-3 py-4 text-sm text-gray-500 truncate max-w-xs">
													{track.tracks.album}
												</td>
												<td className="px-3 py-4 text-sm text-gray-500 whitespace-nowrap">
													{new Date(track.liked_at).toLocaleDateString()}
												</td>
												<td className="px-3 py-4 text-right text-sm whitespace-nowrap">
													<Form method="post" className="inline-flex space-x-2">
														<input type="hidden" name="userId" value={user?.id} />
														<input type="hidden" name="trackId" value={track.tracks.spotify_track_id} />
														<button
															type="submit"
															name="_action"
															value="updateTrackStatus"
															className="px-3 py-1 bg-[#1DB954] text-white text-sm rounded-full hover:bg-[#1ed760] transition-colors"
														>
															Sort
														</button>
														<button
															type="submit"
															name="status"
															value="ignored"
															className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full hover:bg-gray-200 transition-colors"
														>
															Ignore
														</button>
													</Form>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</div>
					</div>

					{/* Pagination Controls */}
					{totalPages > 1 && (
						<div className="mt-4 flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
							<div className="flex flex-1 justify-between sm:hidden">
								<button
									onClick={() => handlePageChange(currentPage - 1)}
									disabled={currentPage === 1}
									className="relative inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
								>
									Previous
								</button>
								<button
									onClick={() => handlePageChange(currentPage + 1)}
									disabled={currentPage === totalPages}
									className="relative ml-3 inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
								>
									Next
								</button>
							</div>
							<div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
								<div>
									<p className="text-sm text-gray-700">
										Showing <span className="font-medium">{indexOfFirstTrack + 1}</span> to{' '}
										<span className="font-medium">
											{Math.min(indexOfLastTrack, totalTracks)}
										</span>{' '}
										of <span className="font-medium">{totalTracks}</span> results
									</p>
								</div>
								<div>
									<nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
										{Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
											<button
												key={page}
												onClick={() => handlePageChange(page)}
												className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
													currentPage === page
														? 'z-10 bg-[#1DB954] text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1DB954]'
														: 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:outline-offset-0'
												}`}
											>
												{page}
											</button>
										))}
									</nav>
								</div>
							</div>
						</div>
					)}
				</div>
			) : spotifyProfile ? (
				<div className="text-center">
					<Form method="post">
						<input type="hidden" name="userId" value={user?.id} />
						<button
							type="submit"
							name="_action"
							value="sync"
							className="px-6 py-3 bg-[#1DB954] text-white font-semibold rounded-full hover:bg-[#1ed760] transition-colors"
						>
							Sync Library
						</button>
					</Form>
				</div>
			) : null}
		</div>
	)
}
