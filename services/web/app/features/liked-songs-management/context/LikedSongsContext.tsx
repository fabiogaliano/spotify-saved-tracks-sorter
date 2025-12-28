import React, {
	ReactNode,
	createContext,
	useCallback,
	useContext,
	useEffect,
	useRef,
	useState,
} from 'react'

import { apiRoutes, getWebSocketUrl } from '~/lib/config/routes'
import { useWebSocket } from '~/lib/hooks/useWebSocket'
import { TrackAnalysis, TrackWithAnalysis, UIAnalysisStatus } from '~/lib/models/Track'
import {
	JobStatusUpdate,
	jobSubscriptionManager,
} from '~/lib/services/JobSubscriptionManager'
import {
	AnalysisJob,
	ItemState,
	ItemStatesMap,
	TrackBatchJob,
	isTrackBatchJob,
} from '~/lib/types/analysis.types'

// Re-export for consumers that import from this file
export type { AnalysisJob } from '~/lib/types/analysis.types'

interface LikedSongsContextType {
	// State
	likedSongs: TrackWithAnalysis[]
	setLikedSongs: (songs: TrackWithAnalysis[]) => void
	rowSelection: Record<string, boolean>
	setRowSelection: (
		value:
			| Record<string, boolean>
			| ((prev: Record<string, boolean>) => Record<string, boolean>)
	) => void
	selectedTracks: () => TrackWithAnalysis[]

	// Analysis operations
	analyzeSelectedTracks: () => Promise<void>
	analyzeTracks: (options: {
		trackId?: number
		useSelected?: boolean
		useAll?: boolean
	}) => Promise<void>

	// Job tracking
	currentJob: AnalysisJob | null
	isAnalyzing: boolean

	// Computed properties from job state
	itemsProcessed: number
	itemsSucceeded: number
	itemsFailed: number

	// Track status updates
	updateSongAnalysisDetails: (
		trackId: number,
		analysisData: TrackAnalysis | null,
		status: UIAnalysisStatus
	) => void

	// WebSocket status
	isWebSocketConnected: boolean
	webSocketLastMessage: any
}

const LikedSongsContext = createContext<LikedSongsContextType>({
	// State
	likedSongs: [],
	setLikedSongs: () => {},
	rowSelection: {},
	setRowSelection: () => {},
	selectedTracks: () => [],

	// Analysis operations
	analyzeSelectedTracks: () => Promise.resolve(),
	analyzeTracks: () => Promise.resolve(),

	// Job tracking
	currentJob: null,
	isAnalyzing: false,

	// Computed properties
	itemsProcessed: 0,
	itemsSucceeded: 0,
	itemsFailed: 0,

	// Track status updates
	updateSongAnalysisDetails: () => {},

	// WebSocket status
	isWebSocketConnected: false,
	webSocketLastMessage: null,
})

interface LikedSongsProviderProps {
	children: ReactNode
	initialSongs?: TrackWithAnalysis[]
	userId?: number
}

export const LikedSongsProvider: React.FC<LikedSongsProviderProps> = ({
	children,
	initialSongs = [],
	userId,
}) => {
	// State management
	const [likedSongs, setLikedSongs] = useState<TrackWithAnalysis[]>(initialSongs)
	const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({})
	const [currentJob, setCurrentJob] = useState<AnalysisJob | null>(null)
	const [isAnalyzing, setIsAnalyzing] = useState(false)

	// Track if we've already initialized to prevent duplicate initialization
	const initializedRef = useRef(false)
	const jobRecoveryRef = useRef(false)

	// WebSocket connection
	const wsUrl = getWebSocketUrl()
	const {
		isConnected: isWebSocketConnected,
		lastMessage: webSocketLastMessage,
		subscribeToItem,
		connect: connectWebSocket,
		disconnect: disconnectWebSocket,
	} = useWebSocket(wsUrl, { autoConnect: false })

	// Helper function to get computed values from job state
	const getJobCounts = useCallback((job: AnalysisJob | null) => {
		if (!job) {
			// Return zeros when no job - no persistent state
			return { processed: 0, succeeded: 0, failed: 0 }
		}

		// Always use database stats - all jobs have dbStats
		return {
			processed: job.dbStats.itemsProcessed,
			succeeded: job.dbStats.itemsSucceeded,
			failed: job.dbStats.itemsFailed,
		}
	}, [])

	// Update a single song's analysis details
	const updateSongAnalysisDetails = useCallback(
		(trackId: number, analysisData: TrackAnalysis | null, status: UIAnalysisStatus) => {
			setLikedSongs(prevSongs =>
				prevSongs.map(song =>
					song.track.id === trackId ?
						{ ...song, analysis: analysisData, uiAnalysisStatus: status }
					:	song
				)
			)
		},
		[setLikedSongs]
	)

	// Effect to initialize songs with proper status from server
	useEffect(() => {
		if (initialSongs && initialSongs.length > 0 && !initializedRef.current) {
			// Songs now come with proper uiAnalysisStatus from the server
			// This includes 'failed' status for tracks that failed analysis
			setLikedSongs(initialSongs)
			initializedRef.current = true
		}
		// We only want to run this when initialSongs array itself changes, not on every render of setLikedSongs
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [initialSongs])

	// Effect to recover active jobs when user loads the app
	useEffect(() => {
		const recoverActiveJob = async () => {
			if (!userId || jobRecoveryRef.current) return

			try {
				jobRecoveryRef.current = true

				const response = await fetch(`/api/analysis/active-job?userId=${userId}`)

				if (response.ok) {
					const activeJob = await response.json()
					if (activeJob && activeJob.id) {
						// Convert itemStates from object back to Map (JSON serialization converts Maps to objects)
						const itemStatesMap = new Map(
							Object.entries(activeJob.itemStates || {}).map(([key, value]) => [
								parseInt(key, 10),
								value,
							])
						)

						const recoveredJob: AnalysisJob = {
							...activeJob,
							itemStates: itemStatesMap,
							startedAt: new Date(activeJob.startedAt),
							dbStats: activeJob.dbStats, // Always present from proper recovery
						}

						// Ensure job recovery is atomic - set job and update subscription manager together
						setCurrentJob(recoveredJob)
						jobSubscriptionManager.setCurrentJob(recoveredJob.id)

						// Update UI track states to match the recovered job states
						setLikedSongs(prevSongs =>
							prevSongs.map(song => {
								const trackJobState = itemStatesMap.get(song.track.id)
								if (trackJobState !== undefined) {
									// Map job states to UI states
									let uiStatus: UIAnalysisStatus
									switch (trackJobState) {
										case 'queued':
										case 'in_progress':
											uiStatus = 'pending'
											break
										case 'completed':
											uiStatus = 'analyzed'
											break
										case 'failed':
											uiStatus = 'failed'
											break
										default:
											uiStatus = song.uiAnalysisStatus // Keep existing status
									}
									return { ...song, uiAnalysisStatus: uiStatus }
								}
								return song
							})
						)
					}
				}

				// Reset recovery flag after successful completion (whether job found or not)
				jobRecoveryRef.current = false
			} catch (error) {
				console.error('Error recovering active job:', error)
				// Reset recovery flag on error to allow retry
				jobRecoveryRef.current = false
			}
		}

		recoverActiveJob()
	}, [userId])

	// WebSocket connection management based on job status
	useEffect(() => {
		if (!currentJob) {
			// No job active, ensure WebSocket is disconnected
			if (isWebSocketConnected) {
				disconnectWebSocket()
			}
			return
		}

		// Connect to WebSocket when a job starts, but only if we're not already connected
		if (
			(currentJob.status === 'pending' || currentJob.status === 'in_progress') &&
			!isWebSocketConnected
		) {
			connectWebSocket()
		}
		// For completed jobs, keep WebSocket connected until job is cleared
		// The job will be cleared when a new job starts or manually cleared
	}, [
		currentJob?.status,
		isWebSocketConnected,
		connectWebSocket,
		disconnectWebSocket,
		currentJob?.id,
	])

	// Handle WebSocket messages for job status updates
	useEffect(() => {
		const handleJobStatusUpdate = (update: JobStatusUpdate) => {
			const { trackId, status } = update

			if (!trackId) {
				return
			}

			// Map the worker status to UI status
			let uiStatus: UIAnalysisStatus = 'not_analyzed'
			let trackJobStatus: ItemState = 'queued'

			switch (status) {
				case 'QUEUED':
					uiStatus = 'pending'
					trackJobStatus = 'queued'
					break
				case 'IN_PROGRESS':
					uiStatus = 'pending'
					trackJobStatus = 'in_progress'
					break
				case 'COMPLETED':
					uiStatus = 'analyzed'
					trackJobStatus = 'completed'
					break
				case 'FAILED':
				case 'SKIPPED':
					uiStatus = 'failed'
					trackJobStatus = 'failed'
					break
				default:
					return // Unknown status, ignore
			}

			// Update the track status in the UI
			updateSongAnalysisDetails(trackId, null, uiStatus)

			// Update job status if this track is part of the current job
			// Only track_batch jobs have itemStates; playlist jobs don't track individual items
			if (
				currentJob &&
				isTrackBatchJob(currentJob) &&
				currentJob.itemStates.has(trackId)
			) {
				// Update both itemStates and dbStats atomically
				setCurrentJob(prevJob => {
					if (!prevJob || !isTrackBatchJob(prevJob) || !prevJob.itemStates.has(trackId))
						return prevJob

					const newItemStates = new Map(prevJob.itemStates)
					newItemStates.set(trackId, trackJobStatus)

					let newDbStats = { ...prevJob.dbStats }

					// Update dbStats when items complete or fail
					if (trackJobStatus === 'completed' || trackJobStatus === 'failed') {
						// Only increment if this item wasn't already processed
						const prevStatus = prevJob.itemStates.get(trackId)
						if (prevStatus !== 'completed' && prevStatus !== 'failed') {
							newDbStats.itemsProcessed = newDbStats.itemsProcessed + 1

							if (trackJobStatus === 'completed') {
								newDbStats.itemsSucceeded = newDbStats.itemsSucceeded + 1
							} else {
								newDbStats.itemsFailed = newDbStats.itemsFailed + 1
							}
						}
					}

					// Calculate if job is complete
					const allProcessed = Array.from(newItemStates.values()).every(
						s => s === 'completed' || s === 'failed'
					)

					return {
						...prevJob,
						itemStates: newItemStates,
						dbStats: newDbStats,
						status: allProcessed ? 'completed' : 'in_progress',
					}
				})
			}
		}

		// Subscribe to job updates through the subscription manager
		const unsubscribe = jobSubscriptionManager.subscribe(handleJobStatusUpdate)

		return unsubscribe
	}, [currentJob, updateSongAnalysisDetails])

	// Route WebSocket messages through the subscription manager
	useEffect(() => {
		if (webSocketLastMessage) {
			jobSubscriptionManager.processMessage(webSocketLastMessage)
		}
	}, [webSocketLastMessage])

	// Update subscription manager and WebSocket subscriptions when job changes
	useEffect(() => {
		if (currentJob) {
			jobSubscriptionManager.setCurrentJob(currentJob.id)

			// Subscribe to all item IDs in the job via WebSocket
			// Only track_batch jobs have individual items to subscribe to
			if (isWebSocketConnected && isTrackBatchJob(currentJob)) {
				for (const itemId of Array.from(currentJob.itemStates.keys())) {
					subscribeToItem(String(itemId))
				}
			}
		} else {
			jobSubscriptionManager.setCurrentJob(null)
		}
	}, [currentJob?.id, isWebSocketConnected, subscribeToItem])

	// Derive selected tracks from row selection
	const selectedTracks = useCallback(() => {
		return Object.keys(rowSelection).map(key => {
			const index = parseInt(key, 10)
			return likedSongs[index]
		})
	}, [likedSongs, rowSelection])

	// Function to analyze tracks - can handle individual, selected, or all tracks
	const analyzeTracks = useCallback(
		(options: { trackId?: number; useSelected?: boolean; useAll?: boolean } = {}) => {
			let tracksToAnalyze: TrackWithAnalysis[] = []

			if (options.trackId) {
				const singleTrack = likedSongs.find(song => song.track.id === options.trackId)
				if (singleTrack) {
					tracksToAnalyze = [singleTrack]
				}
			}
			// Selected tracks analysis
			else if (options.useSelected) {
				tracksToAnalyze = selectedTracks()
				if (tracksToAnalyze.length === 0) {
					console.warn('No tracks selected for analysis')
					return Promise.resolve()
				}
			}
			// All tracks analysis
			else if (options.useAll) {
				tracksToAnalyze = likedSongs
				if (tracksToAnalyze.length === 0) {
					console.warn('No tracks available for analysis')
					return Promise.resolve()
				}
			}

			if (tracksToAnalyze.length === 0) {
				console.warn('No tracks specified for analysis')
				return Promise.resolve()
			}

			// Filter out tracks that have already been analyzed or failed
			const tracksNeedingAnalysis = tracksToAnalyze.filter(
				track =>
					track.uiAnalysisStatus !== 'analyzed' &&
					track.uiAnalysisStatus !== 'pending' &&
					track.uiAnalysisStatus !== 'failed'
			)

			if (tracksNeedingAnalysis.length === 0) {
				return Promise.resolve()
			}

			// Prevent multiple concurrent analysis requests
			if (isAnalyzing) {
				return Promise.resolve()
			}

			// Prevent new job creation while recovery is in progress
			if (jobRecoveryRef.current) {
				return Promise.resolve()
			}

			setIsAnalyzing(true)

			const mappedTracksForApi = tracksNeedingAnalysis.map(twa => ({
				id: twa.track.id,
				spotifyTrackId: twa.track.spotify_track_id,
				artist: twa.track.artist,
				name: twa.track.name,
			}))

			const trackIdsBeingProcessed = tracksNeedingAnalysis.map(t => t.track.id)

			// Update songs to 'pending' status immediately
			setLikedSongs(prevSongs =>
				prevSongs.map(song =>
					trackIdsBeingProcessed.includes(song.track.id) ?
						{ ...song, uiAnalysisStatus: 'pending' as UIAnalysisStatus }
					:	song
				)
			)

			// Use fetch to send a JSON request instead of form data
			return fetch(apiRoutes.likedSongs.analyze, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ tracks: mappedTracksForApi }),
			})
				.then(response => response.json())
				.then(data => {
					if (data.success) {
						// Create item states map - all start as 'queued'
						const itemStates: ItemStatesMap = new Map()
						trackIdsBeingProcessed.forEach(trackId => {
							itemStates.set(trackId, 'queued')
						})

						// Create new job with proper state
						const newJob: TrackBatchJob = {
							id: data.batchId || crypto.randomUUID(),
							jobType: 'track_batch',
							status: 'pending',
							itemCount: tracksNeedingAnalysis.length,
							itemStates,
							startedAt: new Date(),
							dbStats: {
								itemsProcessed: 0,
								itemsSucceeded: 0,
								itemsFailed: 0,
							},
						}

						// Atomic job transition - clear old job and set new job simultaneously
						// This prevents UI state gaps where no job exists
						jobSubscriptionManager.setCurrentJob(newJob.id)
						setCurrentJob(newJob)
						setIsAnalyzing(false)
					} else {
						setIsAnalyzing(false)
					}
				})
				.catch(() => {
					setIsAnalyzing(false)
				})
		},
		[selectedTracks, likedSongs, setLikedSongs]
	)

	// Legacy method for backward compatibility
	const analyzeSelectedTracks = useCallback(() => {
		return analyzeTracks({ useSelected: true })
	}, [analyzeTracks])

	// Compute derived values from current job
	const counts = getJobCounts(currentJob)

	const value = {
		// State
		rowSelection,
		setRowSelection,
		likedSongs,
		setLikedSongs,
		selectedTracks,

		// Analysis operations
		analyzeSelectedTracks,
		analyzeTracks,

		// Job tracking
		currentJob,
		isAnalyzing,

		// Computed properties
		itemsProcessed: counts.processed,
		itemsSucceeded: counts.succeeded,
		itemsFailed: counts.failed,

		// Track status updates
		updateSongAnalysisDetails,

		// WebSocket status
		isWebSocketConnected,
		webSocketLastMessage,
	}

	return <LikedSongsContext.Provider value={value}>{children}</LikedSongsContext.Provider>
}

// Custom hook to use the context
export const useLikedSongs = () => {
	const context = useContext(LikedSongsContext)

	if (context === undefined) {
		throw new Error('useLikedSongs must be used within a LikedSongsProvider')
	}

	return context
}
