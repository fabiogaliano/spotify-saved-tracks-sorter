import { trackRepository } from '~/lib/repositories/TrackRepository'
import type { SavedTrackRow, TrackAnalysis, TrackAnalysisStats, TrackWithAnalysis } from '~/lib/models/Track'

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

  async getTrackAnalysisStats(
    userIdOrTracks: number | TrackWithAnalysis[]
  ): Promise<TrackAnalysisStats> {
    const savedTracks = Array.isArray(userIdOrTracks)
      ? userIdOrTracks
      : await this.getUserTracksWithAnalysis(userIdOrTracks);

    const total = savedTracks.length;
    const withAnalysis = savedTracks.filter(track => track.analysis !== null).length;

    return {
      total,
      withAnalysis,
      analysisPercentage: total > 0 ? (withAnalysis / total) * 100 : 0
    }
  }
}

export const trackService = new TrackService()