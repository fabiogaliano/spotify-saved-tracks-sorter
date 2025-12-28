import type {
	SavedTrackRow,
	SpotifyTrackDTO,
	Track,
	TrackInsert,
	TrackWithAnalysis,
	UIAnalysisStatus,
} from '~/lib/models/Track'
import {
	mapSpotifyTrackDTOToTrackInsert,
	mapToSavedTrackInsert,
} from '~/lib/models/Track'
import { SYNC_STATUS, trackRepository } from '~/lib/repositories/TrackRepository'

export class TrackService {
	async getUserTracks(userId: number): Promise<SavedTrackRow[]> {
		return trackRepository.getSavedTracks(userId)
	}

	/**
	 * Optimized fetch using single RPC call instead of 3 sequential queries.
	 * Performance improvement: ~100-300ms vs 600-1600ms.
	 */
	async getUserTracksWithAnalysis(userId: number): Promise<TrackWithAnalysis[]> {
		return trackRepository.getSavedTracksWithAnalysis(userId)
	}

	async getLastSyncTime(userId: number): Promise<string> {
		return trackRepository.getLastSyncTime(userId)
	}

	async updateSyncStatus(
		userId: number,
		status: (typeof SYNC_STATUS)[keyof typeof SYNC_STATUS]
	): Promise<void> {
		await trackRepository.updateSyncStatus(userId, status)
	}

	async processSpotifyTracks(spotifyTracks: SpotifyTrackDTO[]): Promise<{
		totalProcessed: number
		newTracks: TrackInsert[]
		processedTracks: Track[]
	}> {
		const spotifyTrackIds = spotifyTracks.map(t => t.track.id)

		const existingTracks = await trackRepository.getTracksBySpotifyIds(spotifyTrackIds)
		const existingTrackMap = new Map(existingTracks.map(t => [t.spotify_track_id, t]))

		const newTracks = spotifyTracks
			.filter(t => !existingTrackMap.has(t.track.id))
			.map(t => mapSpotifyTrackDTOToTrackInsert(t))

		const insertedTracks =
			newTracks.length > 0 ? await trackRepository.insertTracks(newTracks) : []

		return {
			totalProcessed: spotifyTracks.length,
			newTracks,
			processedTracks: [...existingTracks, ...insertedTracks],
		}
	}

	async saveSavedTracksForUser(
		userId: number,
		spotifyTracks: SpotifyTrackDTO[],
		tracks: Track[]
	): Promise<TrackWithAnalysis[]> {
		const tracksMap = new Map(tracks.map(t => [t.spotify_track_id, t]))

		const savedTracks = spotifyTracks.map(spotifyTrack => {
			const track = tracksMap.get(spotifyTrack.track.id)
			if (!track) {
				throw new Error(`Track not found: ${spotifyTrack.track.id}`)
			}
			return mapToSavedTrackInsert(track.id, userId, spotifyTrack.added_at)
		})

		const newSavedTracks = await trackRepository.saveSavedTracks(savedTracks)

		// Convert SavedTrackRow to TrackWithAnalysis (new tracks won't have analysis)
		return newSavedTracks.map(savedTrack => ({
			...savedTrack,
			analysis: null,
			uiAnalysisStatus: 'not_analyzed' as UIAnalysisStatus,
		}))
	}
}

export const trackService = new TrackService()
