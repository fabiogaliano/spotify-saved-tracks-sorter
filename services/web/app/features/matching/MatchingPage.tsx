import { useState } from 'react'

import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router'

import { apiRoutes } from '~/lib/config/routes'
import type { MatchResult } from '~/lib/models/Matching'
import type { AnalyzedPlaylist, AnalyzedTrack } from '~/types/analysis'

interface PlaylistCardData {
	id: number
	name: string
	description?: string
	track_count: number
	is_flagged: boolean
	hasAnalysis: boolean
	analysis?: any
}

interface MatchingResults {
	playlistId: string
	results: MatchResult[]
	processingTime: number
}

interface MatchedSong {
	id: number
	name: string
	artist: string
	similarity: number
	component_scores: any
	veto_applied?: boolean
	veto_reason?: string
}

interface MatchingPageProps {
	playlists: AnalyzedPlaylist[]
	tracks: AnalyzedTrack[]
}

export default function MatchingPage({ playlists, tracks }: MatchingPageProps) {
	// Safety guards for data
	const safePlaylists = Array.isArray(playlists) ? playlists : []
	const safeTracks = Array.isArray(tracks) ? tracks : []

	const queryClient = useQueryClient()
	const navigate = useNavigate()

	const [selectedPlaylist, setSelectedPlaylist] = useState<PlaylistCardData | null>(null)
	const [matchResults, setMatchResults] = useState<MatchedSong[]>([])
	const [isAnalyzing, setIsAnalyzing] = useState(false)
	const [isMatching, setIsMatching] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const handlePlaylistSelect = async (playlist: PlaylistCardData) => {
		setSelectedPlaylist(playlist)
		setMatchResults([])
		setError(null)

		// If playlist doesn't have analysis, trigger it
		if (!playlist.hasAnalysis) {
			await triggerPlaylistAnalysis(playlist)
			return
		}

		// Otherwise, start matching immediately
		await performMatching(playlist)
	}

	const triggerPlaylistAnalysis = async (playlist: PlaylistCardData) => {
		setIsAnalyzing(true)
		try {
			// Trigger playlist analysis
			const response = await fetch(apiRoutes.playlists.analysis(playlist.id.toString()), {
				method: 'POST',
			})

			if (response.ok) {
				// Refresh the playlist data
				queryClient.invalidateQueries({ queryKey: ['playlists'] })
				// After analysis, trigger matching
				const updatedPlaylist = { ...playlist, hasAnalysis: true }
				setSelectedPlaylist(updatedPlaylist)
				await performMatching(updatedPlaylist)
			} else {
				setError(`Failed to analyze playlist (${response.status})`)
			}
		} catch (err) {
			console.error('Failed to analyze playlist:', err)
			setError('Failed to analyze playlist. Please try again.')
		} finally {
			setIsAnalyzing(false)
		}
	}

	const performMatching = async (playlist: PlaylistCardData) => {
		setIsMatching(true)
		try {
			// Use all analyzed liked songs for matching
			const tracksForMatching = safeTracks

			if (tracksForMatching.length === 0) {
				console.warn('[MatchingPage] No tracks available for matching')
				setIsMatching(false)
				return
			}

			const formData = new FormData()
			formData.append('playlistId', playlist.id.toString())
			formData.append('trackIds', JSON.stringify(tracksForMatching.map(t => t.id)))

			const response = await fetch(apiRoutes.matching.base, {
				method: 'POST',
				body: formData,
			})

			if (response.ok) {
				const data: MatchingResults = await response.json()
				console.log('[MatchingPage] Received matching results:', {
					resultsCount: data.results?.length || 0,
					processingTime: data.processingTime,
					firstResult:
						data.results?.[0] ?
							{
								id: data.results[0].track_info.id,
								title: data.results[0].track_info.title,
								similarity: data.results[0].similarity,
							}
						:	null,
				})

				// Convert to our MatchedSong format and sort by similarity
				const songs: MatchedSong[] = (data.results ?? [])
					.map(result => ({
						id:
							typeof result.track_info.id === 'string' ?
								parseInt(result.track_info.id, 10)
							:	result.track_info.id,
						name: result.track_info.title,
						artist: result.track_info.artist,
						similarity: result.similarity,
						component_scores: result.component_scores,
						veto_applied: result.veto_applied,
						veto_reason: result.veto_reason,
					}))
					.sort((a, b) => b.similarity - a.similarity)

				console.log('[MatchingPage] Processed songs:', {
					songsCount: songs.length,
					topSimilarity: songs[0]?.similarity,
					songsOver50Percent: songs.filter(s => s.similarity >= 0.5).length,
				})

				setMatchResults(songs)
			} else {
				console.error(
					'[MatchingPage] Response not ok:',
					response.status,
					response.statusText
				)
				setError(`Failed to find matches (${response.status})`)
			}
		} catch (err) {
			console.error('Failed to perform matching:', err)
			setError('Failed to find matches. Please try again.')
		} finally {
			setIsMatching(false)
		}
	}

	const addSongToPlaylist = async (songId: number) => {
		if (!selectedPlaylist) return

		try {
			// Add song to playlist via Spotify API
			const response = await fetch(apiRoutes.playlists.addTrack, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					playlistId: selectedPlaylist.id,
					trackId: songId,
				}),
			})

			if (response.ok) {
				// Remove from results or mark as added
				setMatchResults(prev => prev.filter(song => song.id !== songId))
			}
		} catch (error) {
			console.error('Failed to add song to playlist:', error)
		}
	}

	// Convert playlists to card format
	const playlistCards: PlaylistCardData[] = safePlaylists.map(p => ({
		id: p.id,
		name: p.name,
		description: p.description,
		track_count: p.track_count ?? 0,
		is_flagged: p.is_flagged ?? false,
		hasAnalysis: !!p.analysis,
		analysis: p.analysis,
	}))

	// Filter only flagged playlists
	const flaggedPlaylists = playlistCards.filter(p => p.is_flagged)

	const getScoreColor = (score: number): string => {
		if (score >= 0.7) return 'text-green-600 dark:text-green-400'
		if (score >= 0.5) return 'text-yellow-600 dark:text-yellow-400'
		return 'text-red-600 dark:text-red-400'
	}

	const formatScore = (score: number): string => {
		return (score * 100).toFixed(1) + '%'
	}

	const getScoreBgColor = (score: number): string => {
		if (score >= 0.7)
			return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
		if (score >= 0.5)
			return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
		return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
	}

	return (
		<div className="space-y-6">
			<h1 className="text-foreground text-2xl font-semibold">
				Smart Playlists - Song Matching
			</h1>

			{/* No Data Messages */}
			{flaggedPlaylists.length === 0 && (
				<div className="bg-card border-border rounded-lg border p-6">
					<div className="flex">
						<div className="flex-shrink-0">
							<svg
								className="text-muted-foreground h-5 w-5"
								viewBox="0 0 20 20"
								fill="currentColor"
							>
								<path
									fillRule="evenodd"
									d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
									clipRule="evenodd"
								/>
							</svg>
						</div>
						<div className="ml-3">
							<h3 className="text-foreground text-sm font-medium">
								No Smart Playlists available
							</h3>
							<div className="text-muted-foreground mt-2 text-sm">
								<p>
									To use song matching, you need flagged playlists. Go to the playlist
									management page to flag playlists as "Smart Playlists".
								</p>
							</div>
						</div>
					</div>
				</div>
			)}

			{safeTracks.length === 0 && flaggedPlaylists.length > 0 && (
				<div className="bg-card border-border rounded-lg border p-6">
					<div className="flex">
						<div className="flex-shrink-0">
							<svg
								className="text-muted-foreground h-5 w-5"
								viewBox="0 0 20 20"
								fill="currentColor"
							>
								<path
									fillRule="evenodd"
									d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
									clipRule="evenodd"
								/>
							</svg>
						</div>
						<div className="ml-3">
							<h3 className="text-foreground text-sm font-medium">
								No analyzed liked songs available
							</h3>
							<div className="text-muted-foreground mt-2 text-sm">
								<p>
									Please run track analysis on your liked songs to see matching options.
								</p>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Smart Playlists Grid */}
			{flaggedPlaylists.length > 0 && (
				<div className="space-y-4">
					<h2 className="text-foreground text-lg font-semibold">Smart Playlists</h2>
					<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
						{flaggedPlaylists.map(playlist => (
							<div
								key={playlist.id}
								className={`bg-card cursor-pointer rounded-lg border p-4 transition-all hover:shadow-md ${
									selectedPlaylist?.id === playlist.id ?
										'border-primary shadow-md'
									:	'border-border hover:border-muted-foreground'
								}`}
								onClick={() => handlePlaylistSelect(playlist)}
							>
								<div className="mb-2 flex items-start justify-between">
									<h3 className="text-card-foreground flex-1 truncate font-medium">
										{playlist.name}
									</h3>
									<div className="ml-2 flex-shrink-0">
										{playlist.hasAnalysis ?
											<span className="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-200">
												🎵 Ready
											</span>
										:	<span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
												Analyze
											</span>
										}
									</div>
								</div>

								{playlist.description && (
									<p className="text-muted-foreground mb-3 line-clamp-2 text-sm">
										{playlist.description}
									</p>
								)}

								{playlist.analysis?.emotional?.dominant_mood?.mood && (
									<div className="mb-2">
										<span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-800 dark:bg-purple-900 dark:text-purple-200">
											{playlist.analysis.emotional.dominant_mood.mood}
										</span>
									</div>
								)}

								<div className="text-muted-foreground flex items-center justify-between text-xs">
									<span>{playlist.track_count} tracks</span>
									<span className="text-primary">📊</span>
								</div>
							</div>
						))}
					</div>
				</div>
			)}

			{/* Matching Results Section */}
			{selectedPlaylist && (
				<div className="bg-card border-border rounded-lg border p-6">
					<div className="mb-6 flex items-center justify-between">
						<h2 className="text-card-foreground text-lg font-semibold">
							Matches for "{selectedPlaylist.name}"
						</h2>
						{(isAnalyzing || isMatching) && (
							<div className="text-muted-foreground flex items-center text-sm">
								<svg
									className="mr-2 -ml-1 h-4 w-4 animate-spin"
									xmlns="http://www.w3.org/2000/svg"
									fill="none"
									viewBox="0 0 24 24"
								>
									<circle
										className="opacity-25"
										cx="12"
										cy="12"
										r="10"
										stroke="currentColor"
										strokeWidth="4"
									></circle>
									<path
										className="opacity-75"
										fill="currentColor"
										d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
									></path>
								</svg>
								{isAnalyzing ? 'Analyzing playlist...' : 'Finding matches...'}
							</div>
						)}
					</div>

					{/* Match Results */}
					{matchResults.length > 0 && (
						<div className="space-y-3">
							<div className="text-muted-foreground mb-4 text-sm">
								Found {matchResults.length} matches from your liked songs
							</div>

							{matchResults
								.filter(song => song.similarity >= 0.1) // Show matches >10% for debugging
								.map(song => (
									<div
										key={song.id}
										className="bg-card border-border hover:bg-muted/50 flex items-center justify-between rounded-lg border p-4"
									>
										<div className="min-w-0 flex-1">
											<div className="flex items-center space-x-3">
												<div className="flex-1">
													<h4 className="text-card-foreground truncate font-medium">
														{song.name}
													</h4>
													<p className="text-muted-foreground truncate text-sm">
														{song.artist}
													</p>
												</div>

												<div className="text-right">
													<div
														className={`text-lg font-bold ${getScoreColor(song.similarity)}`}
													>
														{formatScore(song.similarity)}
													</div>
													<div className="text-muted-foreground text-xs">Match</div>
												</div>
											</div>

											{song.veto_applied && (
												<div className="mt-2">
													<span className="inline-flex items-center rounded bg-red-100 px-2 py-1 text-xs font-medium text-red-800 dark:bg-red-900 dark:text-red-200">
														Veto: {song.veto_reason}
													</span>
												</div>
											)}
										</div>

										<div className="ml-4 flex space-x-2">
											<button
												onClick={() => addSongToPlaylist(song.id)}
												className="text-primary-foreground bg-primary hover:bg-primary/90 focus:ring-primary inline-flex items-center rounded-md border border-transparent px-3 py-1.5 text-xs font-medium focus:ring-2 focus:ring-offset-2 focus:outline-none"
											>
												+ Add to PL
											</button>
											<button className="border-border text-muted-foreground bg-card hover:bg-muted focus:ring-primary inline-flex items-center rounded-md border px-3 py-1.5 text-xs font-medium focus:ring-2 focus:ring-offset-2 focus:outline-none">
												▶ Preview
											</button>
										</div>
									</div>
								))}

							{matchResults.filter(song => song.similarity >= 0.3).length === 0 && (
								<div className="text-muted-foreground py-8 text-center">
									<p>No songs found with &gt;30% compatibility</p>
									<p className="mt-1 text-sm">
										Try analyzing more liked songs or different playlists
									</p>
								</div>
							)}
						</div>
					)}

					{error && (
						<div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
							<div className="flex">
								<div className="flex-shrink-0">
									<svg
										className="h-5 w-5 text-red-400"
										viewBox="0 0 20 20"
										fill="currentColor"
									>
										<path
											fillRule="evenodd"
											d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
											clipRule="evenodd"
										/>
									</svg>
								</div>
								<div className="ml-3">
									<p className="text-sm text-red-700 dark:text-red-300">{error}</p>
								</div>
							</div>
						</div>
					)}

					{matchResults.length === 0 &&
						!isAnalyzing &&
						!isMatching &&
						!error &&
						selectedPlaylist.hasAnalysis && (
							<div className="text-muted-foreground py-8 text-center">
								<p>Click a playlist to find matching songs</p>
							</div>
						)}
				</div>
			)}
		</div>
	)
}
