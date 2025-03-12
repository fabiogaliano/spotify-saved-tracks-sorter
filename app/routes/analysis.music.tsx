import { Link, useLoaderData, useFetcher, useNavigate } from '@remix-run/react'
import type { FetcherWithComponents, SubmitFunction } from '@remix-run/react'
import { useTrackSortingStore } from '~/lib/stores/trackSortingStore'
import { useAnalysisStatusStore } from '~/lib/stores/analysisStatusStore'
import { useTracksStore } from '~/lib/stores/tracksStore'
import { useEffect, useState } from 'react'
import { loader } from '~/features/analysis/loaders/music.loader.server'
import { action } from '~/features/analysis/actions/music.action.server'
import { trackAnalysisRepository } from '~/lib/repositories/TrackAnalysisRepository'
import type { LoaderFunctionArgs, ActionFunctionArgs } from '@remix-run/node'
import { songAnalysisService } from '~/lib/services'

// Define response type for the analysis action
interface AnalysisResponse {
	success: boolean
	trackId: string
	analysisId?: number
	alreadyAnalyzed?: boolean
	error?: string
	details?: string
}

export { loader, action }

export default function MusicAnalysis() {
	const { analysisStatusMap } = useLoaderData<typeof loader>()
	const fetcher = useFetcher()
	const navigate = useNavigate()
	const tracksStore = useTracksStore()
	const sortingStore = useTrackSortingStore()
	const analysisStore = useAnalysisStatusStore()
	const tracks = useTracksStore(state => state.tracks)
	const tracksLoaded = useTracksStore(state => state.isLoaded)
	const [sortedTrackIds, setSortedTrackIds] = useState<string[]>([])
	const [sortedTracks, setSortedTracks] = useState<any[]>([])
	const [hasAnalyzedTracks, setHasAnalyzedTracks] = useState(false)
	const [isLoading, setIsLoading] = useState(true)

	// Get the data from the fetcher response
	const fetcherData = fetcher.data as AnalysisResponse | undefined

	useEffect(() => {
		const sortedIds = sortingStore.getSortedTrackIds()
		setSortedTrackIds(sortedIds)
		setIsLoading(!tracksLoaded)

		if (tracksLoaded && tracks.length > 0 && sortedIds.length > 0) {
			const matchedTracks = tracks.filter(track =>
				sortedIds.includes(track.spotify_track_id)
			)

			setSortedTracks(matchedTracks)
			setIsLoading(false)
		} else if (tracksLoaded) {
			setIsLoading(false)
		}
	}, [sortingStore, tracks, tracksLoaded])

	useEffect(() => {
		if (!tracksLoaded || !tracks.length || !sortedTrackIds.length) return

		const matchedTracks = tracks.filter(track =>
			sortedTrackIds.includes(track.spotify_track_id)
		)

		let analyzedCount = 0
		matchedTracks.forEach(track => {
			if (analysisStatusMap[track.id]) {
				analysisStore.setTrackStatus(track.id.toString(), 'analyzed')
				analyzedCount++
			}
		})

		setHasAnalyzedTracks(analyzedCount > 0)
	}, [tracks, tracksLoaded, sortedTrackIds, analysisStatusMap])

	useEffect(() => {
		// Skip if there's a form submission in progress
		if (fetcher.state === 'submitting') return

		// If there's already a track being analyzed, nothing to do here
		const currentlyAnalyzingId = analysisStore.getCurrentlyAnalyzing()
		if (currentlyAnalyzingId) return

		// If no active analysis, check for the next track in queue
		const nextTrack = analysisStore.getNextTrackToAnalyze()
		if (!nextTrack) return

		console.log(`Processing next track in queue: ${nextTrack.id}`)

		// Remove from queue and set as currently analyzing
		analysisStore.removeFromQueue(nextTrack.id)
		analysisStore.setCurrentlyAnalyzing(nextTrack.id)
		analysisStore.setTrackStatus(nextTrack.id, 'analyzing')

		// Submit for analysis
		const formData = new FormData()
		formData.append('action', 'analyze')
		formData.append('trackId', nextTrack.id.toString())
		formData.append('spotifyTrackId', nextTrack.spotify_track_id)
		formData.append('artist', nextTrack.artist)
		formData.append('name', nextTrack.name)

		// Submit with a slight delay to avoid any race conditions
		setTimeout(() => {
			fetcher.submit(formData, { method: 'post' })
		}, 100)
	}, [fetcher.state, analysisStore.getCurrentlyAnalyzing()]) // Add currentlyAnalyzing as a dependency

	// Log when a track analysis starts but don't change state again
	useEffect(() => {
		if (fetcher.state === 'submitting' && fetcher.formData) {
			const trackId = fetcher.formData.get('trackId')
			if (trackId) {
				console.log(`Track ${trackId} is now being analyzed`)
				// Don't update state here, as this can cause flickering
			}
		}
	}, [fetcher.state, fetcher.formData])

	// Process analysis results
	useEffect(() => {
		if (fetcher.state === 'idle' && fetcherData) {
			const { success, trackId, alreadyAnalyzed, error } = fetcherData
			if (!trackId) return

			if (alreadyAnalyzed) {
				console.log(`Track ${trackId} already has analysis, skipping`)
			} else {
				console.log(`Track ${trackId} analysis completed with success: ${success}`)
				if (!success && error) {
					console.error(`Analysis error for track ${trackId}: ${error}`)
				}
			}

			// Set the track status first
			analysisStore.setTrackStatus(trackId.toString(), success ? 'analyzed' : 'error')

			if (success) {
				setHasAnalyzedTracks(true)
			}

			// Make sure we clear the currently analyzing track to allow queue to continue
			if (analysisStore.getCurrentlyAnalyzing() === trackId.toString()) {
				console.log(`Clearing currently analyzing track: ${trackId}`)
				analysisStore.setCurrentlyAnalyzing(null)
			}
		}
	}, [fetcher.state, fetcherData])

	const analyzeTrack = (track: any) => {
		// First check if it's already analyzed to avoid redundant analysis
		const status = analysisStore.getTrackStatus(track.id.toString())
		if (status === 'analyzed') {
			console.log(`Track ${track.id} is already analyzed, skipping`)
			return
		}

		// Clear any existing queue to focus on this track
		analysisStore.setQueuedTracks([])
		analysisStore.setCurrentlyAnalyzing(track.id.toString())
		analysisStore.setTrackStatus(track.id.toString(), 'analyzing')

		const formData = new FormData()
		formData.append('action', 'analyze')
		formData.append('trackId', track.id.toString())
		formData.append('spotifyTrackId', track.spotify_track_id)
		formData.append('artist', track.artist)
		formData.append('name', track.name)

		fetcher.submit(formData, { method: 'post' })
	}

	const analyzeAllTracks = () => {
		// First, clear any ongoing work
		analysisStore.setCurrentlyAnalyzing(null)
		analysisStore.setQueuedTracks([])

		// Find tracks that need analysis
		const tracksToAnalyze = sortedTracks.filter(track => {
			const status = analysisStore.getTrackStatus(track.id.toString())
			return status === 'idle' || status === 'error'
		})

		console.log(`Found ${tracksToAnalyze.length} tracks to analyze`)
		if (tracksToAnalyze.length === 0) return

		// Queue up tracks beyond the first one
		if (tracksToAnalyze.length > 1) {
			const remainingTracks = tracksToAnalyze.slice(1).map(t => ({
				id: t.id.toString(),
				spotify_track_id: t.spotify_track_id,
				artist: t.artist,
				name: t.name,
			}))

			console.log(`Queuing ${remainingTracks.length} tracks for analysis`)
			remainingTracks.forEach(track => {
				analysisStore.setTrackStatus(track.id, 'queued')
			})

			analysisStore.setQueuedTracks(remainingTracks)
		}

		// Process the first track
		const firstTrack = tracksToAnalyze[0]
		console.log(`Starting analysis with track: ${firstTrack.id}`)

		// Set the first track as analyzing and submit
		analysisStore.setCurrentlyAnalyzing(firstTrack.id.toString())
		analysisStore.setTrackStatus(firstTrack.id.toString(), 'analyzing')

		const formData = new FormData()
		formData.append('action', 'analyze')
		formData.append('trackId', firstTrack.id.toString())
		formData.append('spotifyTrackId', firstTrack.spotify_track_id)
		formData.append('artist', firstTrack.artist)
		formData.append('name', firstTrack.name)

		fetcher.submit(formData, { method: 'post' })
	}

	return (
		<div className="container mx-auto px-4 py-8">
			<h1 className="text-3xl font-bold mb-6">Music Analysis</h1>

			{isLoading && (
				<div className="flex justify-center items-center h-64">
					<div className="text-center">
						<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
						<p className="text-gray-600">Loading tracks...</p>
					</div>
				</div>
			)}

			{!isLoading && (
				<div>
					<div className="mb-6">
						<p className="mb-4">
							This page allows you to analyze the tracks you've selected for sorting. The
							analysis will help the system better understand the mood, themes, and
							context of each song.
						</p>

						<div className="flex justify-between items-center mb-6">
							<div className="flex items-center space-x-4">
								<Link
									to="/"
									className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-3 rounded-full"
									aria-label="Back to Sorting"
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										className="h-5 w-5"
										viewBox="0 0 20 20"
										fill="currentColor"
									>
										<path
											fillRule="evenodd"
											d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
											clipRule="evenodd"
										/>
									</svg>
								</Link>

								<button
									onClick={analyzeAllTracks}
									className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-sm"
								>
									Analyze All Tracks
								</button>
							</div>

							<button
								onClick={() => navigate('/analysis/playlist')}
								disabled={!hasAnalyzedTracks}
								className={`py-2 px-4 rounded ${hasAnalyzedTracks
										? 'bg-purple-600 hover:bg-purple-700 text-white'
										: 'bg-gray-300 text-gray-500 cursor-not-allowed'
									}`}
							>
								Continue to Playlist Analysis
							</button>
						</div>
					</div>

					<div className="bg-white shadow-md rounded-lg overflow-hidden">
						<table className="min-w-full divide-y divide-gray-200">
							<thead className="bg-gray-50">
								<tr>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Track
									</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Artist
									</th>
									<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Status
									</th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-gray-200">
								{sortedTracks.length > 0 ? (
									sortedTracks.map(track => (
										<tr key={track.id}>
											<td className="px-6 py-4 whitespace-nowrap">
												<div className="text-sm font-medium text-gray-900">
													{track.name}
												</div>
											</td>
											<td className="px-6 py-4 whitespace-nowrap">
												<div className="text-sm text-gray-500">{track.artist}</div>
											</td>
											<td className="px-6 py-4 whitespace-nowrap">
												<span
													className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${analysisStore.getTrackStatus(track.id.toString()) === 'analyzed'
															? 'bg-green-100 text-green-800'
															: analysisStore.getTrackStatus(track.id.toString()) ===
																'analyzing'
																? 'bg-yellow-100 text-yellow-800'
																: analysisStore.getTrackStatus(track.id.toString()) === 'queued'
																	? 'bg-blue-100 text-blue-800'
																	: analysisStore.getTrackStatus(track.id.toString()) === 'error'
																		? 'bg-red-100 text-red-800'
																		: 'bg-gray-100 text-gray-800'
														}`}
												>
													{analysisStore.getTrackStatus(track.id.toString()) ===
														'analyzed'
														? 'Analyzed'
														: analysisStore.getTrackStatus(track.id.toString()) ===
															'analyzing'
															? 'Analyzing...'
															: analysisStore.getTrackStatus(track.id.toString()) ===
																'queued'
																? 'Queued'
																: analysisStore.getTrackStatus(track.id.toString()) ===
																	'error'
																	? 'Error'
																	: 'Not Analyzed'}
												</span>
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
												{analysisStore.getTrackStatus(track.id.toString()) ===
													'error' && (
														<button
															onClick={() => analyzeTrack(track)}
															className="text-blue-600 hover:text-blue-900"
															disabled={
																analysisStore.getTrackStatus(track.id.toString()) ===
																'analyzing'
															}
														>
															Analyze
														</button>
													)}
											</td>
										</tr>
									))
								) : (
									<tr>
										<td
											colSpan={4}
											className="px-6 py-4 text-center text-sm text-gray-500"
										>
											No tracks selected for sorting. Please go to the sorting page first.
										</td>
									</tr>
								)}
							</tbody>
						</table>
					</div>
				</div>
			)}
		</div>
	)
}
