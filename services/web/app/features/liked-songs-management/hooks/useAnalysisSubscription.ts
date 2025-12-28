import { useCallback, useEffect, useRef } from 'react'

import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { getWebSocketUrl } from '~/lib/config/routes'
import { useWebSocket } from '~/lib/hooks/useWebSocket'
import {
	JobStatusUpdate,
	jobSubscriptionManager,
} from '~/lib/services/JobSubscriptionManager'
import {
	isAnalysisFailedMessage,
	isAnalysisUpdateMessage,
	isDirectJobNotification,
	isJobCompletionMessage,
} from '~/lib/types/websocket.types'

import {
	likedSongsKeys,
	useAnalysisStatus,
	useUpdateTrackAnalysis,
} from '../queries/liked-songs-queries'
import { useJobSubscription } from './useJobSubscription'

interface AnalysisSubscriptionOptions {
	userId: number
	enabled?: boolean
}

export function useAnalysisSubscription({
	userId,
	enabled = true,
}: AnalysisSubscriptionOptions) {
	const updateTrackAnalysis = useUpdateTrackAnalysis()
	const queryClient = useQueryClient()
	const currentJobIdRef = useRef<string | null>(null)

	// Get current job status
	const { data: analysisStatus } = useAnalysisStatus()

	// WebSocket connection
	const wsUrl = getWebSocketUrl()
	const {
		isConnected: wsConnected,
		lastMessage: wsMessage,
		connect,
		disconnect,
	} = useWebSocket(wsUrl, {
		autoConnect: false,
		debug: false,
	})

	// Connect WebSocket on mount
	useEffect(() => {
		if (!enabled) return

		// Small delay to ensure component is mounted
		const timer = setTimeout(() => connect(), 100)

		return () => {
			clearTimeout(timer)
			disconnect()
		}
	}, [enabled, connect, disconnect])

	// Update job subscription manager when job changes
	useEffect(() => {
		if (analysisStatus?.hasActiveJob && analysisStatus?.currentJob) {
			jobSubscriptionManager.setCurrentJob(analysisStatus.currentJob.id)
			currentJobIdRef.current = analysisStatus.currentJob.id
		} else {
			jobSubscriptionManager.setCurrentJob(null)
			currentJobIdRef.current = null
		}
	}, [analysisStatus?.hasActiveJob, analysisStatus?.currentJob?.id])

	// Handle job status updates
	const handleJobUpdate = useCallback(
		(update: JobStatusUpdate) => {
			if (!update.trackId) return

			const trackId = parseInt(String(update.trackId))

			// Map job status to UI status
			switch (update.status) {
				case 'QUEUED':
				case 'IN_PROGRESS':
					updateTrackAnalysis(trackId, null, 'pending')
					break
				case 'COMPLETED':
					updateTrackAnalysis(trackId, null, 'analyzed')
					// Invalidate to get fresh job stats from server
					setTimeout(() => {
						queryClient.invalidateQueries({ queryKey: likedSongsKeys.analysisStatus() })
					}, 100)
					break
				case 'FAILED':
				case 'SKIPPED':
					updateTrackAnalysis(trackId, null, 'failed')
					// Invalidate to get fresh job stats from server
					setTimeout(() => {
						queryClient.invalidateQueries({ queryKey: likedSongsKeys.analysisStatus() })
					}, 100)
					break
			}
		},
		[updateTrackAnalysis, queryClient]
	)

	// Subscribe to job updates using stable subscription
	useJobSubscription(handleJobUpdate, enabled)

	// Process WebSocket messages
	useEffect(() => {
		if (!wsMessage) return

		if (isJobCompletionMessage(wsMessage)) {
			if (wsMessage.jobId === currentJobIdRef.current) {
				const { stats } = wsMessage
				const message = `Analysis complete: ${stats.itemsSucceeded} succeeded, ${stats.itemsFailed} failed`

				toast.success(message, {
					duration: 15000,
					dismissible: true,
				})

				// Store completion stats for UI before clearing the job
				queryClient.setQueryData(likedSongsKeys.analysisStatus(), {
					hasActiveJob: false,
					currentJob: null,
					lastCompletionStats: stats, // Store the real completion stats
				})

				// Invalidate to refresh the UI
				queryClient.invalidateQueries({ queryKey: likedSongsKeys.lists() })
			}
			return
		}

		// Handle direct job notifications - job-level concerns only
		// Track-level updates are delegated to jobSubscriptionManager for single source of truth
		if (isDirectJobNotification(wsMessage)) {
			// Show toast for job-level failures (null trackId = job failed, not a specific track)
			if (
				wsMessage.status === 'FAILED' &&
				wsMessage.error &&
				wsMessage.trackId === null
			) {
				toast.error(`Analysis failed: ${wsMessage.error}`, {
					duration: 5000,
					dismissible: true,
				})
			}

			// Invalidate job stats on terminal states
			if (
				wsMessage.status === 'FAILED' ||
				wsMessage.status === 'COMPLETED' ||
				wsMessage.status === 'SKIPPED'
			) {
				setTimeout(() => {
					queryClient.invalidateQueries({ queryKey: likedSongsKeys.analysisStatus() })
				}, 100)
			}

			// Fall through to jobSubscriptionManager for track-level updates
			// This ensures all statuses (QUEUED, IN_PROGRESS, COMPLETED, FAILED, SKIPPED) are handled consistently
		}

		// Route all messages through subscription manager for track updates
		// JobSubscriptionManager is the single source of truth for track status mapping
		jobSubscriptionManager.processMessage(wsMessage)

		// Handle legacy message formats with type guards
		if (isAnalysisUpdateMessage(wsMessage)) {
			const trackId =
				typeof wsMessage.trackId === 'string' ?
					parseInt(wsMessage.trackId)
				:	wsMessage.trackId
			updateTrackAnalysis(trackId, wsMessage.analysis, 'analyzed')
		} else if (isAnalysisFailedMessage(wsMessage)) {
			const trackId =
				typeof wsMessage.trackId === 'string' ?
					parseInt(wsMessage.trackId)
				:	wsMessage.trackId
			updateTrackAnalysis(trackId, null, 'failed')
		}
	}, [wsMessage, queryClient, updateTrackAnalysis])

	return {
		isConnected: wsConnected,
		lastMessage: wsMessage,
	}
}
