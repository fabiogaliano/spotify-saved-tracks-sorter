import { trackRepository } from '~/lib/repositories/TrackRepository'
import { SYNC_STATUS } from '~/lib/repositories/TrackRepository'
import type { SavedTrackRow, TrackAnalysis, TrackAnalysisStats, TrackWithAnalysis, TrackInsert, Track } from '~/lib/models/Track'
import type { SpotifyTrackDTO } from '~/lib/models/Track'
import { mapSpotifyTrackDTOToTrackInsert, mapToSavedTrackInsert } from '~/lib/models/Track'

export class TrackService {
  async getUserTracks(userId: number): Promise<SavedTrackRow[]> {
    return trackRepository.getSavedTracks(userId)
  }

  async getUserTracksWithAnalysis(userId: number): Promise<TrackWithAnalysis[]> {
    const savedTracks = await trackRepository.getSavedTracks(userId)
    if (!savedTracks.length) return []

    const trackIds = savedTracks.map(savedTrack => savedTrack.track.id)

    const analyses = await trackRepository.getLatestTrackAnalysesByTrackIds(trackIds)
    const analysisMap = new Map<number, TrackAnalysis>()

    analyses.forEach(analysis => {
      if (!analysisMap.has(analysis.track_id)) {
        analysisMap.set(analysis.track_id, analysis)
      }
    })

    return savedTracks.map(savedTrack => {
      const trackId = savedTrack.track.id
      return {
        ...savedTrack,
        analysis: analysisMap.get(trackId) || null
      }
    })
  }

  getTrackAnalysisStats(
    likedTracks: TrackWithAnalysis[]
  ): TrackAnalysisStats {

    const total = likedTracks.length;
    const withAnalysis = likedTracks.filter(track => track.analysis !== null).length;

    return {
      total,
      withAnalysis,
      analysisPercentage: total > 0 ? (withAnalysis / total) * 100 : 0
    }
  }

  async getLastSyncTime(userId: number): Promise<string> {
    return trackRepository.getLastSyncTime(userId)
  }

  async updateSyncStatus(userId: number, status: typeof SYNC_STATUS[keyof typeof SYNC_STATUS]): Promise<void> {
    await trackRepository.updateSyncStatus(userId, status)
  }

  async processSpotifyTracks(spotifyTracks: SpotifyTrackDTO[]): Promise<{
    totalProcessed: number,
    newTracks: TrackInsert[],
    processedTracks: Track[]
  }> {
    const spotifyTrackIds = spotifyTracks.map(t => t.track.id)

    const existingTracks = await trackRepository.getTracksBySpotifyIds(spotifyTrackIds)
    const existingTrackMap = new Map(existingTracks.map(t => [t.spotify_track_id, t]))

    const newTracks = spotifyTracks
      .filter(t => !existingTrackMap.has(t.track.id))
      .map(t => mapSpotifyTrackDTOToTrackInsert(t))

    const insertedTracks = newTracks.length > 0
      ? await trackRepository.insertTracks(newTracks)
      : []

    return {
      totalProcessed: spotifyTracks.length,
      newTracks,
      processedTracks: [...existingTracks, ...insertedTracks]
    }
  }

  async saveSavedTracksForUser(userId: number, spotifyTracks: SpotifyTrackDTO[], tracks: Track[]): Promise<void> {
    const tracksMap = new Map(tracks.map(t => [t.spotify_track_id, t]))

    const savedTracks = spotifyTracks.map(spotifyTrack => {
      const track = tracksMap.get(spotifyTrack.track.id)
      if (!track) {
        throw new Error(`Track not found: ${spotifyTrack.track.id}`)
      }
      return mapToSavedTrackInsert(
        track.id,
        userId,
        spotifyTrack.added_at
      )
    })

    await trackRepository.saveSavedTracks(savedTracks)
  }
}

export const trackService = new TrackService()