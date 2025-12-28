// @ts-nocheck - Test/debug route, not worth strict typing
import { useState } from 'react'

import { ArrowLeft, RefreshCw } from 'lucide-react'
import JsonView from 'react18-json-view'
import 'react18-json-view/src/style.css'
import {
	ActionFunction,
	Form,
	Link,
	LoaderFunction,
	useActionData,
	useLoaderData,
} from 'react-router'

import { getUserSession } from '~/features/auth/auth.utils'
import { playlistRepository } from '~/lib/repositories/PlaylistRepository'
import { trackRepository } from '~/lib/repositories/TrackRepository'
import { PlaylistService } from '~/lib/services/PlaylistService'
import { SpotifyService } from '~/lib/services/SpotifyService'
import { SyncService } from '~/lib/services/SyncService'
import { trackService } from '~/lib/services/TrackService'
import { Card, CardContent, CardHeader, CardTitle } from '~/shared/components/ui/Card'
import { Button } from '~/shared/components/ui/button'

// Helper function to format the response for display
function formatResponse(data: any): string {
	return JSON.stringify(data, null, 2)
}

// Define types for our responses
type TestResponse = {
	service: 'spotify' | 'sync'
	operation: string
	success: boolean
	message: string
	data?: any
	error?: string
	stack?: string
}

// Loader function to handle initial page load
export const loader: LoaderFunction = async ({ request }) => {
	const session = await getUserSession(request)
	const isAuthenticated = session !== null

	return Response.json({ isAuthenticated })
}

// Handle the service test action
export const action: ActionFunction = async ({ request }) => {
	try {
		const formData = await request.formData()
		const service = formData.get('service') as string
		const operation = formData.get('operation') as string

		// Helper function to build response
		const buildResponse = (op: string, data?: any) => {
			return Response.json({
				service,
				operation: op,
				success: true,
				message: `Successfully tested ${service} ${op}`,
				data,
			})
		}

		console.log(`🧪 Testing ${service} service with operation: ${operation}`)

		// Get user session to access Spotify API instance
		const session = await getUserSession(request)
		if (!session) {
			return Response.json(
				{ error: 'You need to be logged in to test services' },
				{ status: 401 }
			)
		}

		// Create service instances
		const spotifyService = new SpotifyService(session.spotifyApi)

		// Test Spotify service operations
		if (service === 'spotify') {
			// Validate operation is a Spotify operation
			if (
				operation !== 'all' &&
				operation !== 'likedTracks' &&
				operation !== 'playlists' &&
				operation !== 'playlistTracks'
			) {
				return Response.json(
					{
						service: 'spotify',
						operation,
						success: false,
						message: `Invalid operation '${operation}' for Spotify service. Valid operations are: all, likedTracks, playlists, playlistTracks`,
					},
					{ status: 400 }
				)
			}

			// Test for getting liked tracks
			if (operation === 'all' || operation === 'likedTracks') {
				console.log('🔄 Testing SpotifyService - getLikedTracks...')
				const tracks = await spotifyService.getLikedTracks('2020-08-28')
				console.log(`✅ Fetched ${tracks.length} liked tracks from Spotify API`)

				if (operation === 'likedTracks') {
					return buildResponse('likedTracks', {
						tracksCount: tracks.length,
						tracks: tracks,
					})
				}
			}

			// Test for getting playlists
			if (operation === 'all' || operation === 'playlists') {
				console.log('🔄 Testing SpotifyService - getPlaylists...')
				const playlists = await spotifyService.getPlaylists()
				console.log(`✅ Fetched ${playlists.length} playlists from Spotify API`)

				if (operation === 'playlists') {
					return buildResponse('playlists', {
						playlistsCount: playlists.length,
						playlists: playlists,
					})
				}
			}

			// Test for getting playlist tracks
			if (operation === 'all' || operation === 'playlistTracks') {
				console.log('🔄 Testing SpotifyService - getPlaylistTracks...')
				// Get the first playlist to test with
				const playlists = await spotifyService.getPlaylists()

				if (playlists.length === 0) {
					return Response.json({
						service: 'spotify',
						operation: 'playlistTracks',
						success: false,
						message: 'No playlists found to test getPlaylistTracks',
					})
				}

				const playlistId = playlists[0].id
				const tracks = await spotifyService.getPlaylistTracks(playlistId)
				console.log(
					`✅ Fetched ${tracks.length} tracks from playlist ${playlists[0].name}`
				)

				if (operation === 'playlistTracks') {
					return buildResponse('playlistTracks', {
						playlistName: playlists[0].name,
						tracksCount: tracks.length,
						tracks: tracks,
					})
				}
			}

			// If we got here and operation is 'all', we've finished all Spotify tests
			if (operation === 'all') {
				return Response.json({
					service: 'spotify',
					operation: 'all',
					success: true,
					message: 'All SpotifyService operations tested',
				})
			}
		}

		// Test SyncService operations
		if (service === 'sync') {
			// Validate operation is a Sync operation
			if (
				operation !== 'all' &&
				operation !== 'syncSavedTracks' &&
				operation !== 'syncPlaylists' &&
				operation !== 'syncPlaylistTracks'
			) {
				return Response.json(
					{
						service: 'sync',
						operation,
						success: false,
						message: `Invalid operation '${operation}' for Sync service. Valid operations are: all, syncSavedTracks, syncPlaylists, syncPlaylistTracks`,
					},
					{ status: 400 }
				)
			}

			const playlistService = new PlaylistService(spotifyService)
			const syncService = new SyncService(spotifyService, trackService, playlistService)

			if (operation === 'all' || operation === 'syncSavedTracks') {
				console.log('🔄 Testing SyncService - syncSavedTracks...')

				// Get the user ID from the session
				const userId = session.userId

				if (!userId) {
					return buildResponse('syncSavedTracks', {
						success: false,
						message: 'User ID not found in session',
					})
				}

				try {
					// Actually run the sync operation
					const syncResult = await syncService.syncSavedTracks(userId)
					console.log('✅ Sync completed successfully:', syncResult)

					// Log information about the sync
					if (syncResult.newItems > 0) {
						console.log(`🌟 Added ${syncResult.newItems} new tracks to the database`)
					} else {
						console.log('🔄 No new tracks were added to the database')
					}

					console.log(`🎵 Total tracks processed: ${syncResult.totalProcessed}`)

					if (operation === 'syncSavedTracks') {
						return buildResponse('syncSavedTracks', {
							success: true,
							result: syncResult,
						})
					}
				} catch (error) {
					console.error('❌ Sync failed:', error)

					if (operation === 'syncSavedTracks') {
						return buildResponse('syncSavedTracks', {
							success: false,
							message: error instanceof Error ? error.message : 'Unknown error',
							error: error,
						})
					}
				}
			}

			if (operation === 'all' || operation === 'syncPlaylists') {
				console.log('🔄 Testing SyncService - syncPlaylists...')

				// Get the user ID from the session
				const userId = session.userId

				if (!userId) {
					return buildResponse('syncPlaylists', {
						success: false,
						message: 'User ID not found in session',
					})
				}

				try {
					// Actually run the sync operation
					const syncResult = await syncService.syncPlaylists(userId)
					console.log('✅ Playlist sync completed successfully:', syncResult)

					// Log information about the sync
					if (syncResult.newItems > 0) {
						console.log(`🌟 Added ${syncResult.newItems} new playlists to the database`)
					} else {
						console.log('🔄 No new playlists were added to the database')
					}

					console.log(`📋 Total playlists processed: ${syncResult.totalProcessed}`)

					if (operation === 'syncPlaylists') {
						return buildResponse('syncPlaylists', {
							success: true,
							result: syncResult,
						})
					}
				} catch (error) {
					console.error('❌ Playlist sync failed:', error)

					if (operation === 'syncPlaylists') {
						return buildResponse('syncPlaylists', {
							success: false,
							message: error instanceof Error ? error.message : 'Unknown error',
							error: error,
						})
					}
				}
			}

			if (operation === 'syncPlaylistTracks') {
				console.log('🔄 Testing SyncService - syncPlaylistTracks...')

				// Get the user ID from the session
				const userId = session.userId
				const playlistId =
					formData.get('playlistId') ? Number(formData.get('playlistId')) : undefined

				if (!userId) {
					return buildResponse('syncPlaylistTracks', {
						success: false,
						message: 'User ID not found in session',
					})
				}

				try {
					// If a specific playlist ID was provided
					let playlistIds: number[] | undefined
					if (playlistId) {
						// We'll verify if the playlist exists when syncing
						playlistIds = [playlistId]
						console.log(`🔍 Syncing tracks for playlist ID: ${playlistId}`)
					} else {
						console.log(`🔍 Syncing tracks for all user playlists`)
					}

					// Actually run the sync operation with the simplified method
					const syncResult = await syncService.syncPlaylistTracks(userId, playlistIds)

					console.log('✅ Playlist tracks sync completed successfully:', syncResult)

					return buildResponse('syncPlaylistTracks', {
						success: true,
						result: syncResult,
					})
				} catch (error) {
					console.error('❌ Playlist tracks sync failed:', error)

					return buildResponse('syncPlaylistTracks', {
						success: false,
						message: error instanceof Error ? error.message : 'Unknown error',
						error: error,
					})
				}
			}

			// If we got here and operation is 'all', we've finished all sync tests
			if (operation === 'all') {
				return Response.json({
					service: 'sync',
					operation: 'all',
					success: true,
					message: 'All SyncService operations tested',
				})
			}
		}

		return Response.json(
			{ error: `Unknown service or operation: ${service}/${operation}` },
			{ status: 400 }
		)
	} catch (error) {
		console.error('🔴 Test services error:', error)
		return Response.json(
			{
				error: error instanceof Error ? error.message : 'Failed to test services',
				stack: error instanceof Error ? error.stack : undefined,
			},
			{ status: 500 }
		)
	}
}

// Component to display the test results
export default function TestServicesPage() {
	const loaderData = useLoaderData<{ isAuthenticated: boolean }>()
	const actionData = useActionData<TestResponse | { error: string }>()
	const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({})
	const [selectedService, setSelectedService] = useState('spotify')

	// Toggle expanded sections for JSON display
	const toggleSection = (key: string) => {
		setExpandedSections(prev => ({
			...prev,
			[key]: !prev[key],
		}))
	}

	// Display JSON data using react18-json-view
	const JsonDisplay = ({ data, label }: { data: any; label: string }) => {
		const isExpanded = expandedSections[label] || false

		if (!data) return null

		return (
			<div className="mt-2">
				<div className="flex items-center justify-between">
					<h3 className="text-muted-foreground text-sm font-medium">{label}</h3>
					<button
						onClick={() => toggleSection(label)}
						className="text-xs text-blue-400 hover:underline"
					>
						{isExpanded ? 'Collapse' : 'Expand'}
					</button>
				</div>
				<div className="bg-card mt-1 overflow-auto rounded p-2">
					<JsonView
						src={data}
						className="text-xs"
						theme="a11y"
						collapsed={!isExpanded ? 2 : false}
					/>
				</div>
			</div>
		)
	}

	if (!loaderData.isAuthenticated) {
		return (
			<div className="p-8">
				<Card className="bg-card border-border">
					<CardHeader>
						<CardTitle className="text-foreground text-lg">
							Authentication Required
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-muted-foreground">
							Please log in to test the Spotify and Sync services.
						</p>
					</CardContent>
				</Card>
			</div>
		)
	}

	return (
		<div className="mx-auto max-w-4xl p-8">
			<div className="mb-6 flex items-center gap-4">
				<Link
					to="/"
					className="text-foreground hover:text-muted-foreground inline-flex items-center transition-colors"
				>
					<ArrowLeft className="mr-1 h-4 w-4" /> Back to Dashboard
				</Link>
				<h1 className="text-foreground text-2xl font-bold">Service Test Results</h1>
			</div>

			<Card className="bg-card border-border mb-6">
				<CardHeader className="border-border border-b pb-2">
					<CardTitle className="text-foreground flex justify-between text-lg">
						<span>Run Another Test</span>
						{actionData && (
							<div className="text-sm font-normal">
								<span
									className={`rounded px-2 py-1 ${actionData.success ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'}`}
								>
									{actionData.success ? 'Success' : 'Error'}
								</span>
							</div>
						)}
					</CardTitle>
				</CardHeader>
				<CardContent className="py-4">
					<Form method="post" className="flex gap-4">
						<div className="grid w-full grid-cols-3 gap-3">
							<div>
								<label className="text-muted-foreground mb-1 block text-sm font-medium">
									Service
								</label>
								<select
									name="service"
									className="bg-card border-border text-foreground w-full rounded-md border px-3 py-2 text-sm"
									value={selectedService}
									onChange={e => setSelectedService(e.target.value)}
								>
									<option value="spotify">Spotify Service</option>
									<option value="sync">Sync Service</option>
								</select>
							</div>

							<div>
								<label className="text-muted-foreground mb-1 block text-sm font-medium">
									Operation
								</label>
								<select
									name="operation"
									className="bg-card border-border text-foreground w-full rounded-md border px-3 py-2 text-sm"
									defaultValue={
										selectedService === 'spotify' ? 'likedTracks' : 'syncSavedTracks'
									}
								>
									<option value="all">All Operations</option>
									{selectedService === 'spotify' ?
										<>
											<option value="likedTracks">Get Liked Tracks</option>
											<option value="playlists">Get Playlists</option>
											<option value="playlistTracks">Get Playlist Tracks</option>
										</>
									:	<>
											<option value="syncSavedTracks">Sync Saved Tracks</option>
											<option value="syncPlaylists">Sync Playlists</option>
											<option value="syncPlaylistTracks">Sync Playlist Tracks</option>
										</>
									}
								</select>
							</div>

							{/* Optional Playlist ID input for syncPlaylistTracks */}
							{selectedService === 'sync' && (
								<div className="mt-4">
									<label className="text-muted-foreground mb-1 block text-sm font-medium">
										Playlist ID (optional)
									</label>
									<input
										type="number"
										name="playlistId"
										placeholder="Leave empty to sync all playlists"
										className="bg-card border-border text-foreground w-full rounded-md border px-3 py-2 text-sm"
									/>
									<p className="text-muted-foreground mt-1 text-xs">
										Only used for "Sync Playlist Tracks" operation
									</p>
								</div>
							)}

							<div className="flex items-end">
								<Button
									type="submit"
									className="text-foreground w-full bg-green-700 hover:bg-green-600"
								>
									<RefreshCw className="mr-2 h-4 w-4" /> Run Test
								</Button>
							</div>
						</div>
					</Form>
				</CardContent>
			</Card>

			{actionData && (
				<Card className="bg-card border-border">
					<CardHeader className="border-border border-b pb-2">
						<CardTitle className="text-foreground text-lg">
							{actionData.error ? 'Error' : `Test Results: ${actionData.operation || ''}`}
						</CardTitle>
					</CardHeader>
					<CardContent className="py-4">
						{actionData.error ?
							<div className="text-red-400">
								<p className="mb-2 font-medium">{actionData.error}</p>
								{actionData.stack && (
									<pre className="bg-card max-h-60 overflow-auto rounded p-2 text-xs">
										{actionData.stack}
									</pre>
								)}
							</div>
						:	<div>
								<div className="mb-4 grid grid-cols-2 gap-4">
									<div>
										<p className="text-muted-foreground text-sm">Service</p>
										<p className="text-foreground font-medium">{actionData.service}</p>
									</div>
									<div>
										<p className="text-muted-foreground text-sm">Operation</p>
										<p className="text-foreground font-medium">{actionData.operation}</p>
									</div>
									<div>
										<p className="text-muted-foreground text-sm">Status</p>
										<p
											className={`font-medium ${actionData.success ? 'text-green-400' : 'text-red-400'}`}
										>
											{actionData.success ? 'Success' : 'Failed'}
										</p>
									</div>
									<div>
										<p className="text-muted-foreground text-sm">Message</p>
										<p className="text-foreground">{actionData.message}</p>
									</div>
								</div>

								{actionData.data && (
									<JsonDisplay data={actionData.data} label="Response Data" />
								)}
							</div>
						}
					</CardContent>
				</Card>
			)}
		</div>
	)
}
