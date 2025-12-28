import { LoaderFunctionArgs } from 'react-router'

import { requireUserSession } from '~/features/auth/auth.utils'
import { playlistAnalysisRepository } from '~/lib/repositories/PlaylistAnalysisRepository'
import { playlistRepository } from '~/lib/repositories/PlaylistRepository'
import { savedTrackRepository } from '~/lib/repositories/SavedTrackRepository'
import { trackAnalysisRepository } from '~/lib/repositories/TrackAnalysisRepository'
import { trackRepository } from '~/lib/repositories/TrackRepository'
import type { AnalyzedPlaylist, AnalyzedTrack } from '~/types/analysis'

export interface MatchingLoaderData {
	playlists: AnalyzedPlaylist[]
	tracks: AnalyzedTrack[]
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
	try {
		const session = await requireUserSession(request)
		const userId = session.userId

		console.log(`[Matching Loader] Loading data for user ${userId}`)

		// Get ALL flagged playlists for the user (not just analyzed ones)
		const flaggedPlaylists = await playlistRepository.getFlaggedPlaylists(userId)
		console.log(
			`[Matching Loader] Found ${flaggedPlaylists?.length || 0} flagged playlists`
		)

		let playlists: AnalyzedPlaylist[] = []

		if (flaggedPlaylists && flaggedPlaylists.length > 0) {
			// Get analyses for flagged playlists (one by one to avoid Promise.all issues)
			playlists = []
			for (const playlist of flaggedPlaylists) {
				try {
					const analysis = await playlistAnalysisRepository.getAnalysisByPlaylistId(
						playlist.id
					)
					playlists.push({
						...playlist,
						description: playlist.description || undefined,
						analysis: analysis?.analysis || null,
					} as AnalyzedPlaylist)
				} catch (analysisError) {
					console.warn(
						`[Matching Loader] Failed to get analysis for playlist ${playlist.id}:`,
						analysisError
					)
					// Still include the playlist without analysis
					playlists.push({
						...playlist,
						description: playlist.description || undefined,
						analysis: null,
					} as AnalyzedPlaylist)
				}
			}
			console.log(
				`[Matching Loader] Found ${playlists.length} flagged playlists (${playlists.filter(p => p.analysis).length} with analysis)`
			)
		}

		// Get all saved tracks for the user using the repository
		const savedTracks = await savedTrackRepository.getSavedTracksByUserId(userId)
		console.log(`[Matching Loader] Found ${savedTracks?.length || 0} saved tracks`)

		if (!savedTracks || savedTracks.length === 0) {
			console.log(`[Matching Loader] No saved tracks found for user ${userId}`)
			return { playlists, tracks: [] as AnalyzedTrack[] }
		}

		// Get the track IDs
		const trackIds = savedTracks.map(st => st.track_id)

		// Get track details using the repository
		const trackDetails = await trackRepository.getTracksByIds(trackIds)
		console.log(`[Matching Loader] Found ${trackDetails?.length || 0} track details`)

		if (!trackDetails || trackDetails.length === 0) {
			console.log(`[Matching Loader] No track details found`)
			return { playlists, tracks: [] as AnalyzedTrack[] }
		}

		// Combine tracks with their saved_tracks data
		const tracksWithSavedInfo = trackDetails.map(track => {
			const savedTrack = savedTracks.find(st => st.track_id === track.id)
			return {
				...track,
				album: track.album || undefined, // Convert null to undefined to match expected type
				liked_at: savedTrack?.liked_at || null,
				sorting_status: savedTrack?.sorting_status || 'unsorted',
			}
		})

		const validTrackAnalyses: any[] = []

		for (const trackId of trackIds) {
			try {
				const analysis = await trackAnalysisRepository.getByTrackId(trackId)
				if (analysis) {
					validTrackAnalyses.push(analysis)
				}
			} catch (trackAnalysisError) {
				console.warn(
					`[Matching Loader] Failed to get analysis for track ${trackId}:`,
					trackAnalysisError
				)
			}
		}

		const tracksWithAnalyses: AnalyzedTrack[] = tracksWithSavedInfo
			.map(track => {
				const analysis = validTrackAnalyses.find(a => a?.track_id === track.id)
				return {
					...track,
					album: track.album || undefined, // Convert null to undefined to match AnalyzedTrack
					analysis: analysis?.analysis || null,
				} as AnalyzedTrack
			})
			.filter(track => track.analysis !== null) // Only include tracks with valid analysis

		console.log(
			`[Matching Loader] Final result: ${playlists.length} playlists, ${tracksWithAnalyses.length} tracks`
		)
		console.log(
			`[Matching Loader] Playlists:`,
			playlists.map(p => ({ id: p.id, name: p.name, hasAnalysis: !!p.analysis }))
		)
		console.log(
			`[Matching Loader] Tracks:`,
			tracksWithAnalyses.map(t => ({ id: t.id, name: t.name, hasAnalysis: !!t.analysis }))
		)

		return {
			playlists,
			tracks: tracksWithAnalyses,
		}
	} catch (error) {
		// Re-throw Response objects (redirects from requireUserSession, etc.)
		if (error instanceof Response) {
			throw error
		}

		console.error('Error in matching loader:', error)
		// Return empty data on error to show the "no data" message
		return {
			playlists: [] as AnalyzedPlaylist[],
			tracks: [] as AnalyzedTrack[],
		}
	}
}
