// @ts-nocheck - Legacy component, needs type updates
import React, { useEffect, useState } from 'react'

import { useMutation } from '@tanstack/react-query'
import {
	ArrowRight,
	CheckCircle2,
	Info,
	ListMusic,
	Music,
	Play,
	RefreshCw,
	Search,
} from 'lucide-react'
import { useFetcher } from 'react-router'

import { NotificationBanner } from '~/features/playlist-management/components/ui'
import type { MatchResult } from '~/lib/models/Matching'
import { vectorCache } from '~/lib/services/vectorization/VectorCache'
import { Card, CardContent, CardHeader, CardTitle } from '~/shared/components/ui/Card'
import { Button } from '~/shared/components/ui/button'
import { Input } from '~/shared/components/ui/input'
import { Progress } from '~/shared/components/ui/progress'
import { ScrollArea } from '~/shared/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/shared/components/ui/tabs'
import type { AnalyzedPlaylist, AnalyzedTrack } from '~/types/analysis'

interface MatchingInterfaceProps {
	playlists?: AnalyzedPlaylist[]
	tracks?: AnalyzedTrack[]
}

interface MatchingResults {
	playlistId: string
	results: MatchResult[]
	processingTime: number
	error?: string
}

interface MatchingData {
	playlists: AnalyzedPlaylist[]
	tracks: AnalyzedTrack[]
}

const MatchingInterface = ({
	playlists: propPlaylists,
	tracks: propTracks,
}: MatchingInterfaceProps = {}) => {
	const [selectedPlaylist, setSelectedPlaylist] = useState<string | null>(null)
	const [searchQuery, setSearchQuery] = useState('')
	const [activeView, setActiveView] = useState('all')
	const [notification, setNotification] = useState<{
		type: string
		message: string
	} | null>(null)
	const [selectedTracks, setSelectedTracks] = useState<Set<number>>(new Set())
	const [showCacheStats, setShowCacheStats] = useState(false)

	// Use useFetcher for data loading (Remix way)
	const dataFetcher = useFetcher<MatchingData>()
	const matchingFetcher = useFetcher<MatchingResults>()

	// Load data if not provided as props
	useEffect(() => {
		if (
			!propPlaylists &&
			!propTracks &&
			dataFetcher.state === 'idle' &&
			!dataFetcher.data
		) {
			dataFetcher.load('/matching')
		}
	}, [dataFetcher, propPlaylists, propTracks])

	// Use props if provided, otherwise use fetched data
	const playlists = propPlaylists || dataFetcher.data?.playlists || []
	const tracks = propTracks || dataFetcher.data?.tracks || []
	const analyzedTracks = tracks.filter(t => t.analysis)

	// Handle matching results
	useEffect(() => {
		if (matchingFetcher.data) {
			if (matchingFetcher.data.error) {
				setNotification({
					type: 'error',
					message: `Matching failed: ${matchingFetcher.data.error}`,
				})
			} else {
				setNotification({
					type: 'success',
					message: `Found ${matchingFetcher.data.results.length} matches in ${matchingFetcher.data.processingTime}ms`,
				})
			}
			setTimeout(() => setNotification(null), 5000)
		}
	}, [matchingFetcher.data])

	// Transform real data to match UI expectations
	const transformedPlaylists = playlists.map(playlist => ({
		id: playlist.id.toString(),
		name: playlist.name,
		songCount: playlist.track_count,
		description:
			playlist.description ||
			`Smart: ${playlist.analysis?.meaning?.main_message || 'No description'}`,
		smartSortingEnabled: playlist.is_flagged && !!playlist.analysis, // Smart playlists are flagged ones with analysis
	}))

	const transformedTracks = tracks.map((track, index) => ({
		id: track.id.toString(),
		title: track.name,
		artist: track.artist,
		album: track.album || 'Unknown Album',
		colorClass: ['blue', 'green', 'purple', 'pink', 'yellow'][index % 5],
		addedAt: track.liked_at ? new Date(track.liked_at).toLocaleDateString() : 'Unknown',
		analyzed: !!track.analysis,
		match: null, // Will be populated from matching results
		matchingPlaylists: [], // Will be populated from matching results
	}))

	// Handle track selection
	const handleTrackToggle = (trackId: string) => {
		const trackDbId = parseInt(trackId)
		const newSelected = new Set(selectedTracks)
		if (newSelected.has(trackDbId)) {
			newSelected.delete(trackDbId)
		} else {
			newSelected.add(trackDbId)
		}
		setSelectedTracks(newSelected)
	}

	const handleSelectAllTracks = () => {
		if (
			analyzedTracks.length > 0 &&
			analyzedTracks.every(t => selectedTracks.has(t.id))
		) {
			setSelectedTracks(new Set())
		} else {
			setSelectedTracks(new Set(analyzedTracks.map(t => t.id)))
		}
	}

	// Update tracks with matching results
	const tracksWithMatches = transformedTracks.map(track => {
		if (matchingFetcher.data?.results) {
			const matchResult = matchingFetcher.data.results.find(
				result =>
					result.track_info.title === track.title &&
					result.track_info.artist === track.artist
			)
			if (matchResult) {
				return {
					...track,
					match: Math.round(matchResult.similarity * 100),
					matchingPlaylists: selectedPlaylist ? [selectedPlaylist] : [],
				}
			}
		}
		return track
	})

	// Filter songs based on selectedPlaylist and searchQuery
	const filteredSongs = tracksWithMatches
		.filter(song => {
			// First, filter by playlist if one is selected
			if (selectedPlaylist && song.analyzed) {
				return song.matchingPlaylists.includes(selectedPlaylist)
			}
			return true
		})
		.filter(song => {
			// Then, filter by search query
			if (searchQuery) {
				const query = searchQuery.toLowerCase()
				return (
					song.title.toLowerCase().includes(query) ||
					song.artist.toLowerCase().includes(query) ||
					song.album.toLowerCase().includes(query)
				)
			}
			return true
		})
		.filter(song => {
			// Filter by active view
			if (activeView === 'analyzed') {
				return song.analyzed
			} else if (activeView === 'unanalyzed') {
				return !song.analyzed
			}
			return true
		})

	// Get playlist name by ID
	const getPlaylistName = (playlistId: string) => {
		const playlist = transformedPlaylists.find(p => p.id === playlistId)
		return playlist ? playlist.name : ''
	}

	// Get only smart sorting enabled playlists
	const smartSortingPlaylists = transformedPlaylists.filter(p => p.smartSortingEnabled)

	// Count of analyzable songs
	const unanalyzedCount = tracksWithMatches.filter(song => !song.analyzed).length
	const analysisDone = tracksWithMatches.filter(song => song.analyzed).length
	const totalSongs = tracksWithMatches.length
	const analysisProgress =
		totalSongs > 0 ? Math.round((analysisDone / totalSongs) * 100) : 0

	// Handle running the matching algorithm
	const handleRunMatching = () => {
		if (!selectedPlaylist || selectedTracks.size === 0) {
			setNotification({
				type: 'error',
				message: 'Please select a playlist and at least one track to match',
			})
			setTimeout(() => setNotification(null), 3000)
			return
		}

		const formData = new FormData()
		formData.append('playlistId', selectedPlaylist)
		formData.append('trackIds', JSON.stringify(Array.from(selectedTracks)))

		matchingFetcher.submit(formData, {
			method: 'POST',
			action: '/matching',
		})
	}

	// Handle sorting a song into playlists (placeholder for future implementation)
	const handleSortSong = (songId: string, playlistIds: string[]) => {
		const song = tracksWithMatches.find(s => s.id === songId)
		const playlistNames = playlistIds.map(id => getPlaylistName(id))

		setNotification({
			type: 'success',
			message: `"${song?.title}" sorted into: ${playlistNames.join(', ')}`,
		})

		setTimeout(() => setNotification(null), 3000)
	}

	// Handle analyzing a song (placeholder for future implementation)
	const handleAnalyzeSong = (songId: string) => {
		const song = tracksWithMatches.find(s => s.id === songId)
		setNotification({
			type: 'info',
			message: `Analyzing "${song?.title}"...`,
		})

		setTimeout(() => setNotification(null), 3000)
	}

	// Handle batch analysis (placeholder for future implementation)
	const handleBatchAnalysis = () => {
		setNotification({
			type: 'info',
			message: `Analyzing ${unanalyzedCount} songs in batch...`,
		})

		setTimeout(() => setNotification(null), 3000)
	}

	// Show loading state
	if (dataFetcher.state === 'loading' && !propPlaylists && !propTracks) {
		return (
			<div className="flex h-64 items-center justify-center">
				<div className="text-center">
					<div className="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
					<p className="mt-2 text-gray-600">Loading matching data...</p>
				</div>
			</div>
		)
	}

	// Show no data state
	if (playlists.length === 0 && tracks.length === 0) {
		return (
			<div className="p-8">
				<div className="mb-8 rounded-lg border border-blue-200 bg-blue-50 p-6">
					<div className="flex">
						<div className="flex-shrink-0">
							<Info className="h-5 w-5 text-blue-400" />
						</div>
						<div className="ml-3">
							<h3 className="text-sm font-medium text-blue-800">
								No analysis data available
							</h3>
							<div className="mt-2 text-sm text-blue-700">
								<p>To use the matching algorithm, you need:</p>
								<ul className="mt-1 list-inside list-disc space-y-1">
									<li>
										Analyzed playlists (run playlist analysis from the playlist management
										page)
									</li>
									<li>
										Analyzed liked songs (run track analysis from the liked songs page)
									</li>
								</ul>
								<p className="mt-2">
									Once you have analyzed data, the matching algorithm will compare your
									songs against your playlists to find the best matches.
								</p>
							</div>
						</div>
					</div>
				</div>
			</div>
		)
	}

	// Color mapping helper function
	const getColorClasses = colorName => {
		const colorMap = {
			blue: {
				bg: 'bg-blue-500/30',
				inner: 'bg-blue-500',
				icon: 'bg-blue-500/20',
				text: 'text-blue-400',
			},
			green: {
				bg: 'bg-green-500/30',
				inner: 'bg-green-500',
				icon: 'bg-green-500/20',
				text: 'text-green-400',
			},
			purple: {
				bg: 'bg-purple-500/30',
				inner: 'bg-purple-500',
				icon: 'bg-purple-500/20',
				text: 'text-purple-400',
			},
			pink: {
				bg: 'bg-pink-500/30',
				inner: 'bg-pink-500',
				icon: 'bg-pink-500/20',
				text: 'text-pink-400',
			},
			yellow: {
				bg: 'bg-yellow-500/30',
				inner: 'bg-yellow-500',
				icon: 'bg-yellow-500/20',
				text: 'text-yellow-400',
			},
		}

		return colorMap[colorName] || colorMap.blue
	}

	return (
		<div className="flex h-full flex-col space-y-6">
			{/* Header with actions */}
			<div className="flex flex-col justify-between gap-4 md:flex-row">
				<div>
					<h1 className="text-foreground mb-1 text-xl font-bold md:text-2xl">
						Match Songs to Playlists
					</h1>
					<p className="text-muted-foreground">
						Find the perfect playlists for your liked songs
					</p>
				</div>

				<div className="flex flex-wrap gap-2">
					<Button
						onClick={handleRunMatching}
						disabled={
							!selectedPlaylist ||
							selectedTracks.size === 0 ||
							matchingFetcher.state === 'submitting'
						}
						className="gap-2 transition-all duration-200 hover:scale-105 hover:shadow-sm active:scale-95"
					>
						{matchingFetcher.state === 'submitting' ?
							<>
								<RefreshCw className="h-4 w-4 animate-spin" />
								Matching...
							</>
						:	<>
								<Play className="h-4 w-4" />
								Run Matching ({selectedTracks.size} songs)
							</>
						}
					</Button>

					<Button
						onClick={handleSelectAllTracks}
						variant="secondary"
						className="gap-2 transition-all duration-200 hover:scale-105 hover:shadow-sm active:scale-95"
					>
						<CheckCircle2 className="h-4 w-4" />
						{(
							analyzedTracks.length > 0 &&
							analyzedTracks.every(t => selectedTracks.has(t.id))
						) ?
							'Deselect All'
						:	'Select All Analyzed'}
					</Button>

					<Button
						onClick={handleBatchAnalysis}
						variant="secondary"
						className="gap-2 transition-all duration-200 hover:scale-105 hover:shadow-sm active:scale-95"
					>
						<RefreshCw className="h-4 w-4" /> Analyze More Songs
					</Button>

					<Button
						onClick={() => setShowCacheStats(!showCacheStats)}
						variant="outline"
						size="sm"
						className="gap-2 transition-all duration-200 hover:scale-105 hover:shadow-sm active:scale-95"
					>
						<Info className="h-4 w-4" />
						{showCacheStats ? 'Hide' : 'Show'} Cache Stats
					</Button>

					<Tabs
						defaultValue="all"
						value={activeView}
						onValueChange={setActiveView}
						className="w-auto"
					>
						<TabsList className="bg-card/50 border-border border">
							<TabsTrigger
								value="all"
								className="data-[state=active]:bg-card text-muted-foreground data-[state=active]:text-foreground"
							>
								All
							</TabsTrigger>
							<TabsTrigger
								value="analyzed"
								className="data-[state=active]:bg-card text-muted-foreground data-[state=active]:text-foreground"
							>
								Analyzed
							</TabsTrigger>
							<TabsTrigger
								value="unanalyzed"
								className="data-[state=active]:bg-card text-muted-foreground data-[state=active]:text-foreground"
							>
								Unanalyzed
							</TabsTrigger>
						</TabsList>
					</Tabs>
				</div>
			</div>

			{/* Notification */}
			{notification && (
				<NotificationBanner type={notification.type} message={notification.message} />
			)}

			{/* Cache Statistics */}
			{showCacheStats && (
				<Card className="bg-card border-border shadow-sm">
					<CardHeader className="pb-2">
						<CardTitle className="flex items-center gap-2 text-sm">
							<Info className="h-4 w-4 text-cyan-400" />
							Vector Cache Performance
						</CardTitle>
					</CardHeader>
					<CardContent className="pt-0">
						<div className="grid grid-cols-3 gap-4 text-sm">
							<div>
								<span className="text-muted-foreground">Cached Vectors:</span>
								<span className="text-foreground ml-2 font-medium">
									{vectorCache.getStats().size}
								</span>
							</div>
							<div>
								<span className="text-muted-foreground">Memory Usage:</span>
								<span className="text-foreground ml-2 font-medium">
									{vectorCache.getStats().memoryUsage}
								</span>
							</div>
							<div>
								<Button
									size="sm"
									variant="outline"
									onClick={() => {
										vectorCache.clear()
										setNotification({ type: 'info', message: 'Vector cache cleared' })
										setTimeout(() => setNotification(null), 2000)
									}}
									className="text-xs"
								>
									Clear Cache
								</Button>
							</div>
						</div>
					</CardContent>
				</Card>
			)}

			<div className="grid h-full grid-cols-1 gap-6 md:grid-cols-12">
				{/* Playlists Column */}
				<div className="md:col-span-4 lg:col-span-3">
					<Card className="bg-card border-border h-full shadow-sm">
						<CardHeader className="border-border border-b pb-2">
							<CardTitle className="text-foreground flex items-center gap-3 text-lg">
								<div className="rounded-md bg-green-500/20 p-1.5">
									<ListMusic className="h-5 w-5 text-green-400" />
								</div>
								<span className="font-bold">Smart Playlists</span>
							</CardTitle>
						</CardHeader>

						<CardContent className="space-y-2 p-4">
							<ScrollArea className="h-[calc(100vh-300px)] pr-4">
								<button
									onClick={() => setSelectedPlaylist(null)}
									className={`flex w-full items-center justify-between rounded-md p-3 text-left transition-colors ${
										!selectedPlaylist ?
											'bg-card-primary border-primary/30 text-foreground border'
										:	'bg-card/50 border-border text-foreground hover:bg-card hover:border-border border'
									}`}
								>
									<div className="flex items-center gap-2">
										<Music className="text-muted-foreground h-4 w-4" />
										<span>All Smart Playlists</span>
									</div>
									<div className="bg-secondary text-foreground rounded-md px-2 py-0.5 text-xs">
										{tracksWithMatches.filter(s => s.analyzed).length}
									</div>
								</button>

								{transformedPlaylists
									.filter(p => p.smartSortingEnabled)
									.map(playlist => (
										<button
											key={playlist.id}
											onClick={() => setSelectedPlaylist(playlist.id)}
											className={`flex w-full items-center justify-between rounded-md p-3 text-left transition-colors ${
												selectedPlaylist === playlist.id ?
													'bg-card-primary border-primary/30 text-foreground border'
												:	'bg-card/50 border-border text-foreground hover:bg-card hover:border-border border'
											}`}
										>
											<div>
												<div className="flex items-center gap-2">
													<Music className="text-muted-foreground h-4 w-4" />
													<span>{playlist.name}</span>
												</div>
												{selectedPlaylist === playlist.id && (
													<p className="text-muted-foreground mt-1 ml-6 text-xs">
														{playlist.description}
													</p>
												)}
											</div>
											<div className="bg-secondary text-foreground rounded-md px-2 py-0.5 text-xs">
												{playlist.songCount}
											</div>
										</button>
									))}

								<div className="border-border mt-3 border-t pt-3">
									<h3 className="text-muted-foreground mb-2 text-sm font-medium">
										Regular Playlists
									</h3>
									{transformedPlaylists
										.filter(p => !p.smartSortingEnabled)
										.map(playlist => (
											<div
												key={playlist.id}
												className="bg-card/30 border-border text-muted-foreground mb-2 flex w-full items-center justify-between rounded-md border p-3 text-left"
											>
												<div className="flex items-center gap-2">
													<Music className="h-4 w-4 opacity-50" />
													<span>{playlist.name}</span>
												</div>
												<div className="bg-card text-muted-foreground rounded px-2 py-1 text-xs">
													Not Smart
												</div>
											</div>
										))}
								</div>
							</ScrollArea>
						</CardContent>
					</Card>
				</div>

				{/* Songs Column */}
				<div className="flex flex-col space-y-6 md:col-span-8 lg:col-span-9">
					{/* Analysis Status Card */}
					<Card className="bg-card border-border shadow-sm">
						<CardContent className="flex flex-col gap-6 p-4 md:flex-row">
							<div className="space-y-2 md:w-1/2">
								<div className="flex justify-between text-sm">
									<span className="text-muted-foreground">Songs analyzed</span>
									<span className="text-foreground font-medium">
										{analysisDone} / {totalSongs}
									</span>
								</div>
								<div className="w-full">
									<div className="mb-1 flex justify-between text-xs">
										<span className="text-muted-foreground">Analysis Progress</span>
										<span className="font-medium text-green-400">
											{analysisProgress}%
										</span>
									</div>
									<Progress
										value={analysisProgress}
										className="bg-card border-border h-3 border"
										indicatorClassName="bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]"
									/>
								</div>
							</div>

							<div className="flex items-center gap-4 md:w-1/2">
								<div className="rounded-full bg-blue-500/20 p-2">
									<Info className="h-5 w-5 text-blue-400" />
								</div>
								<div>
									<p className="text-foreground font-medium">
										{unanalyzedCount > 0 ?
											`${unanalyzedCount} songs need analysis`
										:	'All songs have been analyzed!'}
									</p>
									<p className="text-muted-foreground text-sm">
										{unanalyzedCount > 0 ?
											'Analyze songs to get playlist matches'
										:	'You can now sort all your songs'}
									</p>
								</div>
							</div>
						</CardContent>
					</Card>

					{/* Song List */}
					<Card className="bg-card border-border h-full shadow-sm">
						<CardHeader className="border-border flex flex-row items-center justify-between border-b pb-2">
							<CardTitle className="text-foreground flex items-center gap-2 text-lg">
								<div className="rounded-md bg-blue-500/20 p-1.5">
									<Music className="h-5 w-5 text-blue-400" />
								</div>
								<span className="font-bold">
									{selectedPlaylist ?
										`Matches for "${getPlaylistName(selectedPlaylist)}"`
									:	'Your Liked Songs'}
								</span>
							</CardTitle>

							<div className="relative w-64">
								<Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform" />
								<Input
									type="text"
									placeholder="Search songs..."
									value={searchQuery}
									onChange={e => setSearchQuery(e.target.value)}
									className="bg-card border-border text-foreground pl-9"
								/>
							</div>
						</CardHeader>

						<CardContent className="p-4">
							<ScrollArea className="h-[calc(100vh-420px)]">
								{filteredSongs.length === 0 ?
									<div className="flex flex-col items-center justify-center py-8">
										<div className="bg-card mb-3 rounded-full p-4">
											<Music className="text-muted-foreground h-8 w-8" />
										</div>
										<h3 className="text-foreground mb-1 text-lg font-medium">
											No songs found
										</h3>
										<p className="text-muted-foreground text-center">
											{searchQuery ?
												'Try adjusting your search terms'
											: selectedPlaylist ?
												"No songs match this playlist's criteria"
											:	'Your liked songs will appear here'}
										</p>
									</div>
								:	<div className="space-y-3">
										{filteredSongs.map(song => {
											const colorClasses = getColorClasses(song.colorClass)
											return (
												<div
													key={song.id}
													className={`rounded-md border p-4 ${
														song.analyzed ?
															'bg-card/70 border-border hover:border-border'
														:	'bg-card/40 border-border'
													} transition-colors`}
												>
													<div className="mb-3 flex items-center justify-between">
														<div className="flex items-center gap-3">
															<input
																type="checkbox"
																checked={selectedTracks.has(parseInt(song.id))}
																onChange={() => handleTrackToggle(song.id)}
																className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
															/>
															<div
																className={`h-12 w-12 ${colorClasses.bg} flex items-center justify-center rounded-md`}
															>
																<div
																	className={`h-8 w-8 ${colorClasses.inner} rounded-sm`}
																></div>
															</div>
															<div>
																<h3 className="text-foreground font-medium">
																	{song.title}
																</h3>
																<p className="text-muted-foreground text-sm">
																	{song.artist} • {song.album}
																</p>
																<p className="text-muted-foreground text-xs">
																	Added {song.addedAt}
																</p>
															</div>
														</div>

														<div className="flex items-center gap-2">
															{song.analyzed && song.match !== null ?
																<div className="rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1.5 text-sm font-medium text-green-400">
																	{song.match}% match
																</div>
															: song.analyzed ?
																<div className="rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 text-sm font-medium text-blue-400">
																	Ready to match
																</div>
															:	<Button
																	size="sm"
																	variant="ghost"
																	className="transition-all duration-200 hover:scale-105 active:scale-95"
																	onClick={() => handleAnalyzeSong(song.id)}
																>
																	Analyze
																</Button>
															}
														</div>
													</div>

													{song.analyzed && (
														<div className="bg-card border-border flex flex-wrap items-center justify-between rounded-md border p-3 text-sm">
															<div className="text-muted-foreground flex flex-wrap items-center gap-1">
																<span className="text-muted-foreground mr-1">
																	Best matches:
																</span>
																{song.matchingPlaylists.map(id => (
																	<span
																		key={id}
																		className="bg-secondary text-foreground rounded-md px-2 py-1"
																	>
																		{getPlaylistName(id)}
																	</span>
																))}
															</div>

															<Button
																size="sm"
																variant="ghost"
																className="mt-2 gap-1 text-sm transition-all duration-200 hover:scale-105 active:scale-95 sm:mt-0"
																onClick={() =>
																	handleSortSong(song.id, song.matchingPlaylists)
																}
															>
																<ArrowRight className="h-3.5 w-3.5" />
																Sort
															</Button>
														</div>
													)}
												</div>
											)
										})}
									</div>
								}
							</ScrollArea>

							{filteredSongs.some(song => !song.analyzed) && (
								<div className="mt-4 flex items-start gap-3 rounded-md border border-blue-800 bg-blue-900/20 p-4">
									<Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-400" />
									<div>
										<h4 className="text-foreground mb-1 font-medium">
											Some songs need analysis
										</h4>
										<p className="text-muted-foreground text-sm">
											{filteredSongs.filter(s => !s.analyzed).length} songs haven't been
											analyzed yet. Analyze them to get playlist matches.
										</p>
										<Button
											size="sm"
											className="mt-2"
											variant="ghost"
											onClick={handleBatchAnalysis}
										>
											Analyze All Unanalyzed
										</Button>
									</div>
								</div>
							)}
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	)
}

export default MatchingInterface
