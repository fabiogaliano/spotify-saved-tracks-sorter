import { Link, useLoaderData, useFetcher, useNavigate } from '@remix-run/react'
import { useTrackSortingStore } from '~/core/stores/trackSortingStore'
import { useAnalysisStatusStore } from '~/core/stores/analysisStatusStore'
import { useTracksStore } from '~/core/stores/tracksStore'
import { useEffect, useState } from 'react'
import { trackAnalysisRepository } from '~/core/repositories/TrackAnalysisRepository'
import type { LoaderFunctionArgs, ActionFunctionArgs } from '@remix-run/node'
import { json } from '@remix-run/node'
import { songAnalysisService } from '~/core/services'

export const loader = async ({ request }: LoaderFunctionArgs) => {
	try {
		const trackAnalyses = await trackAnalysisRepository.getAllAnalyses()

		const analysisStatusMap = trackAnalyses.reduce((acc, analysis) => {
			acc[analysis.track_id] = {
				analyzed: true,
				analysisId: analysis.id,
			}
			return acc
		}, {})

		return {
			analysisStatusMap,
		}
	} catch (error) {
		console.error('Error loading track analyses:', error)
		return {
			analysisStatusMap: {},
		}
	}
}

export const action = async ({ request }: ActionFunctionArgs) => {
	const formData = await request.formData()
	const action = formData.get('action')

	if (action === 'analyze') {
		const trackId = formData.get('trackId')
		const spotifyTrackId = formData.get('spotifyTrackId')
		const artist = formData.get('artist')
		const name = formData.get('name')

		if (!trackId || !spotifyTrackId || !artist || !name) {
			return json(
				{ success: false, error: 'Missing required track information' },
				{ status: 400 }
			)
		}

		try {
			const existingAnalysis = await trackAnalysisRepository.getByTrackId(Number(trackId))

			if (existingAnalysis) {
				return json({
					success: true,
					trackId,
					analysisId: existingAnalysis.id,
					alreadyAnalyzed: true
				})
			}

			try {
				const { model, analysisJson } = JSON.parse(
					await songAnalysisService.analyzeSong(artist.toString(), name.toString())
				)

				const newAnalysis = await trackAnalysisRepository.insertAnalysis({
					track_id: Number(trackId),
					analysis: analysisJson,
					model_name: model,
					version: 1,
				})

				return json({
					success: true,
					trackId,
					analysisId: newAnalysis.id,
				})
			} catch (analysisError) {
				console.error('Error during track analysis:', analysisError)
				return json(
					{
						success: false,
						error: 'Failed to analyze track',
						trackId,
						details: analysisError.message,
					},
					{ status: 500 }
				)
			}
		} catch (dbError) {
			console.error('Database error during analysis:', dbError)
			return json(
				{
					success: false,
					error: 'Database error',
					trackId,
					details: dbError.message,
				},
				{ status: 500 }
			)
		}
	}

	return json({ success: false, error: 'Unknown action' }, { status: 400 })
}

export default function MusicAnalysis() {
	const { analysisStatusMap } = useLoaderData<typeof loader>()
	const trackStore = useTrackSortingStore()
	const analysisStore = useAnalysisStatusStore()
	const tracks = useTracksStore(state => state.tracks)
	const tracksLoaded = useTracksStore(state => state.isLoaded)
	const [sortedTrackIds, setSortedTrackIds] = useState<string[]>([])
	const [sortedTracks, setSortedTracks] = useState<any[]>([])
	const [hasAnalyzedTracks, setHasAnalyzedTracks] = useState(false)
	const [isLoading, setIsLoading] = useState(true)
	const fetcher = useFetcher()
	const navigate = useNavigate()

	useEffect(() => {
		const sortedIds = trackStore.getSortedTrackIds()
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
	}, [trackStore, tracks, tracksLoaded])

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
		// Check if there's a currently analyzing track or queued tracks in the store
		const currentlyAnalyzingId = analysisStore.getCurrentlyAnalyzing()
		const nextTrack = analysisStore.getNextTrackToAnalyze()

		// If there's a track being analyzed, continue the analysis process
		if (currentlyAnalyzingId && !fetcher.state) {
			const trackToAnalyze = sortedTracks.find(track => track.id.toString() === currentlyAnalyzingId)
			if (trackToAnalyze) {
				const formData = new FormData()
				formData.append('action', 'analyze')
				formData.append('trackId', trackToAnalyze.id.toString())
				formData.append('spotifyTrackId', trackToAnalyze.spotify_track_id)
				formData.append('artist', trackToAnalyze.artist)
				formData.append('name', trackToAnalyze.name)

				setTimeout(() => {
					fetcher.submit(formData, { method: 'post' })
				}, 500)
			}
		}
		// If there's no track being analyzed but there are queued tracks, start analyzing the next one
		else if (!currentlyAnalyzingId && nextTrack && !fetcher.state) {
			analysisStore.removeFromQueue(nextTrack.id)
			analysisStore.setCurrentlyAnalyzing(nextTrack.id)
			analysisStore.setTrackStatus(nextTrack.id, 'analyzing')

			const formData = new FormData()
			formData.append('action', 'analyze')
			formData.append('trackId', nextTrack.id.toString())
			formData.append('spotifyTrackId', nextTrack.spotify_track_id)
			formData.append('artist', nextTrack.artist)
			formData.append('name', nextTrack.name)

			setTimeout(() => {
				fetcher.submit(formData, { method: 'post' })
			}, 500)
		}
	}, [sortedTracks, fetcher.state])

	useEffect(() => {
		if (fetcher.state === 'submitting' && fetcher.submission) {
			const trackId = fetcher.submission.get('trackId')
			if (trackId) {
				console.log(`Track ${trackId} is now being analyzed`)
				analysisStore.setCurrentlyAnalyzing(trackId.toString())
				analysisStore.setTrackStatus(trackId.toString(), 'analyzing')
			}
		}
	}, [fetcher.state, fetcher.submission])

	useEffect(() => {
		if (fetcher.state === 'idle' && fetcher.data) {
			const { success, trackId, alreadyAnalyzed } = fetcher.data
			if (trackId) {
				if (alreadyAnalyzed) {
					console.log(`Track ${trackId} already has analysis, skipping`)
				} else {
					console.log(`Track ${trackId} analysis completed with success: ${success}`)
				}

				analysisStore.setTrackStatus(trackId.toString(), success ? 'analyzed' : 'error')

				if (success) {
					setHasAnalyzedTracks(true)
				}

				const nextTrack = analysisStore.getNextTrackToAnalyze()
				if (nextTrack) {
					analysisStore.removeFromQueue(nextTrack.id)

					analysisStore.setCurrentlyAnalyzing(nextTrack.id)

					const formData = new FormData()
					formData.append('action', 'analyze')
					formData.append('trackId', nextTrack.id.toString())
					formData.append('spotifyTrackId', nextTrack.spotify_track_id)
					formData.append('artist', nextTrack.artist)
					formData.append('name', nextTrack.name)

					setTimeout(() => {
						fetcher.submit(formData, { method: 'post' })
					}, 500)
				} else {
					analysisStore.setCurrentlyAnalyzing(null)
				}
			}
		}
	}, [fetcher.state, fetcher.data])

	const analyzeTrack = (track: any) => {
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
		const tracksToAnalyze = sortedTracks.filter(track => {
			const status = analysisStore.getTrackStatus(track.id.toString())
			return status === 'idle' || status === 'error'
		})

		if (tracksToAnalyze.length === 0) return

		const firstTrack = tracksToAnalyze[0]
		analysisStore.setCurrentlyAnalyzing(firstTrack.id.toString())
		analysisStore.setTrackStatus(firstTrack.id.toString(), 'analyzing')

		if (tracksToAnalyze.length > 1) {
			const remainingTracks = tracksToAnalyze.slice(1).map(t => ({
				id: t.id.toString(),
				spotify_track_id: t.spotify_track_id,
				artist: t.artist,
				name: t.name,
			}))

			remainingTracks.forEach(track => {
				analysisStore.setTrackStatus(track.id, 'queued')
			})

			analysisStore.setQueuedTracks(remainingTracks)
		}

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
							analysis will help the system better understand the mood, themes, and context of
							each song.
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
									className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded"
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
												<div className="text-sm font-medium text-gray-900">{track.name}</div>
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
													{analysisStore.getTrackStatus(track.id.toString()) === 'analyzed'
														? 'Analyzed'
														: analysisStore.getTrackStatus(track.id.toString()) ===
															'analyzing'
															? 'Analyzing...'
															: analysisStore.getTrackStatus(track.id.toString()) === 'queued'
																? 'Queued'
																: analysisStore.getTrackStatus(track.id.toString()) === 'error'
																	? 'Error'
																	: 'Not Analyzed'}
												</span>
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
												{analysisStore.getTrackStatus(track.id.toString()) === 'error' && (
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
										<td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
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
