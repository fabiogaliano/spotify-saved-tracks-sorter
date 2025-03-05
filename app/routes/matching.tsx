import { useLoaderData } from '@remix-run/react'
import { useState, useEffect } from 'react'
import type { LoaderFunctionArgs } from '@remix-run/node'
import { json } from '@remix-run/node'
import { playlistRepository } from '~/lib/repositories/PlaylistRepository'
import { trackRepository } from '~/lib/repositories/TrackRepository'
import { trackAnalysisRepository } from '~/lib/repositories/TrackAnalysisRepository'
import { useTrackSortingStore } from '~/lib/stores/trackSortingStore'
import type {
	MatchResult,
	Playlist as MatchingPlaylist,
	Song,
	Track as MatchingTrack,
} from '../../matching-algorithm/matching-algorithm'
import { matchSongsToPlaylist } from '../../matching-algorithm/matching-algorithm'
import { loader } from '~/features/matching/loaders/matching.loader.server'
import type { AnalyzedTrack, AnalyzedPlaylist } from '~/types/analysis'
import { LoadingSpinner, ActionButton, Card } from '~/shared/components/ui'

export { loader }

export default function Matching() {
	const { playlists, tracks } = useLoaderData<typeof loader>()
	const [matchingPlaylists, setMatchingPlaylists] = useState<
		Record<string | number, boolean>
	>({})
	const [errors, setErrors] = useState<Record<string | number, string>>({})
	const [matchResults, setMatchResults] = useState<
		Record<string | number, MatchResult[]>
	>({})
	const [selectedTracks, setSelectedTracks] = useState<AnalyzedTrack[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [hasSelectedTracks, setHasSelectedTracks] = useState(false)
	const sortingStore = useTrackSortingStore()

	// Check if there are tracks selected for sorting
	useEffect(() => {
		const sortedTrackIds = sortingStore.getSortedTrackIds()
		setHasSelectedTracks(sortedTrackIds.length > 0)

		// Find the tracks that match the sorted IDs
		if (tracks && sortedTrackIds.length > 0) {
			const tracksToMatch = tracks.filter(track =>
				sortedTrackIds.includes(track.spotify_track_id)
			)
			setSelectedTracks(tracksToMatch)
			setIsLoading(false)
		} else {
			setIsLoading(false)
		}
	}, [tracks, sortingStore])

	const startMatching = async (playlist: AnalyzedPlaylist) => {
		try {
			setMatchingPlaylists(prev => ({ ...prev, [playlist.id]: true }))
			setErrors(prev => {
				const newErrors = { ...prev }
				delete newErrors[playlist.id]
				return newErrors
			})

			// Check if playlist has analysis
			if (!playlist.analysis) {
				throw new Error("Playlist doesn't have analysis data. Please analyze it first.")
			}

			// Convert playlist to the format expected by the matching algorithm
			const matchingPlaylist: MatchingPlaylist = {
				id: String(playlist.id),
				name: playlist.name,
				description: playlist.description || '',
				spotify_playlist_id: playlist.spotify_playlist_id,
				track_ids: [],
				...playlist.analysis,
			}

			// Only match the tracks that were selected for sorting
			const matchingSongs: Song[] = selectedTracks
				.map(track => {
					// Check if track has analysis
					if (!track.analysis) {
						console.warn(`Track ${track.id} doesn't have analysis data, skipping`)
						return null
					}

					return {
						track: {
							id: String(track.id),
							title: track.name,
							artist: track.artist,
							spotify_track_id: track.spotify_track_id,
						} as MatchingTrack,
						analysis: track.analysis,
					}
				})
				.filter(Boolean) as Song[]

			// If no tracks with analysis, throw error
			if (matchingSongs.length === 0) {
				throw new Error('No analyzed tracks found. Please analyze some tracks first.')
			}

			// Use the real matching algorithm
			try {
				const matches = await matchSongsToPlaylist(matchingPlaylist, matchingSongs)

				// Set results and clear matching state
				setMatchResults(prev => ({
					...prev,
					[playlist.id]: matches,
				}))

				setMatchingPlaylists(prev => {
					const newState = { ...prev }
					delete newState[playlist.id]
					return newState
				})
			} catch (matchError) {
				console.error('Error in matching algorithm:', matchError)
				setErrors(prev => ({
					...prev,
					[playlist.id]: `Error in matching algorithm: ${
						matchError instanceof Error ? matchError.message : 'Unknown error'
					}`,
				}))
				setMatchingPlaylists(prev => {
					const newState = { ...prev }
					delete newState[playlist.id]
					return newState
				})
			}
		} catch (error) {
			console.error('Error in matching process:', error)
			setErrors(prev => ({
				...prev,
				[playlist.id]: `Error: ${
					error instanceof Error ? error.message : 'Unknown error'
				}`,
			}))
			setMatchingPlaylists(prev => {
				const newState = { ...prev }
				delete newState[playlist.id]
				return newState
			})
		}
	}

	// If loading, show spinner
	if (isLoading) {
		return (
			<div className="container mx-auto px-4 py-8">
				<LoadingSpinner fullHeight text="Loading tracks and playlists..." size="large" />
			</div>
		)
	}

	// If no tracks are selected for sorting, display a message and a link back to the home page
	if (!hasSelectedTracks) {
		return (
			<div className="container mx-auto px-4 py-8">
				<Card title="No Tracks Selected" className="text-center py-4">
					<p className="text-gray-600 mb-6">
						No tracks have been selected for sorting. Please go back to the home page and
						select some tracks by marking them with the "+" icon.
					</p>
					<ActionButton to="/" variant="primary">
						Back to Home
					</ActionButton>
				</Card>
			</div>
		)
	}

	return (
		<div className="container mx-auto px-4 py-8">
			<h1 className="text-3xl font-bold mb-6">Playlist Matching</h1>

			<div className="mb-6">
				<p className="mb-4">
					This page shows your analyzed playlists. Click "Start Matching" on any playlist
					to find the best matches between your analyzed songs and that playlist. The
					matches are based on AI analysis of both your songs and playlists.
				</p>

				<div className="flex space-x-4 mb-6">
					<ActionButton
						to="/analysis/playlist"
						variant="back"
						size="medium"
						ariaLabel="Back to Playlist Analysis"
						isRounded
					>
						Back
					</ActionButton>
				</div>
			</div>

			{playlists.length === 0 || tracks.length === 0 ? (
				<Card className="text-center">
					<p className="text-gray-500">
						Please ensure you have analyzed both playlists and songs before matching.
					</p>
				</Card>
			) : (
				<div className="space-y-8">
					{playlists.map(playlist => {
						const isMatching = matchingPlaylists[playlist.id] || false
						const error = errors[playlist.id]
						const playlistMatches = (matchResults[playlist.id] || []).slice(0, 10) // Top 10 matches
						const hasMatches = playlistMatches.length > 0

						return (
							<Card
								key={playlist.id}
								title={playlist.name}
								subtitle={playlist.description || 'No description'}
								actions={
									!hasMatches && (
										<ActionButton
											onClick={() => startMatching(playlist)}
											disabled={isMatching}
											variant="primary"
											isLoading={isMatching}
										>
											{isMatching ? 'Matching...' : 'Start Matching'}
										</ActionButton>
									)
								}
								isLoading={isMatching && !hasMatches && !error}
							>
								{error && (
									<div className="px-6 py-2 bg-red-100 border-b border-red-400 text-red-700">
										{error}
									</div>
								)}

								{hasMatches ? (
									<div>
										<div className="flex justify-between items-center mb-4">
											<h3 className="font-medium">Top Matching Songs</h3>
											<ActionButton
												onClick={() => {
													// Remove the matches for this playlist
													setMatchResults(prev => {
														const newResults = { ...prev }
														delete newResults[playlist.id]
														return newResults
													})
												}}
												variant="secondary"
												size="small"
											>
												Clear Results
											</ActionButton>
										</div>
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
														Match Score
													</th>
													<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
														Details
													</th>
												</tr>
											</thead>
											<tbody className="bg-white divide-y divide-gray-200">
												{playlistMatches.map(match => (
													<tr key={match.track_info.id}>
														<td className="px-6 py-4 whitespace-nowrap">
															<div className="text-sm font-medium text-gray-900">
																{match.track_info.title}
															</div>
														</td>
														<td className="px-6 py-4 whitespace-nowrap">
															<div className="text-sm text-gray-500">
																{match.track_info.artist}
															</div>
														</td>
														<td className="px-6 py-4 whitespace-nowrap">
															<div className="text-sm text-gray-900">
																<div className="relative pt-1">
																	<div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200">
																		<div
																			style={{
																				width: `${Math.min(
																					match.similarity * 100,
																					100
																				)}%`,
																			}}
																			className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${
																				match.similarity > 0.8
																					? 'bg-green-500'
																					: match.similarity > 0.6
																					? 'bg-green-600'
																					: match.similarity > 0.4
																					? 'bg-yellow-500'
																					: 'bg-red-500'
																			}`}
																		></div>
																	</div>
																	<div className="text-xs mt-1 text-right">
																		{Math.round(match.similarity * 100)}%
																	</div>
																</div>
															</div>
														</td>
														<td className="px-6 py-4 whitespace-nowrap">
															<ActionButton
																onClick={() =>
																	alert(JSON.stringify(match.component_scores, null, 2))
																}
																variant="secondary"
																size="small"
															>
																View Details
															</ActionButton>
														</td>
													</tr>
												))}
											</tbody>
										</table>
									</div>
								) : !isMatching && !error ? (
									<div className="text-center py-6">
										<p className="text-gray-500">
											Click the "Start Matching" button to find the best matches for this
											playlist.
										</p>
									</div>
								) : null}
							</Card>
						)
					})}
				</div>
			)}
		</div>
	)
}
