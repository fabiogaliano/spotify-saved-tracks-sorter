import type { Tables, TablesInsert, TablesUpdate } from '~/types/database.types'

export type TrackAnalysis = Tables<'track_analyses'>
export type TrackAnalysisInsert = TablesInsert<'track_analyses'>
export type TrackAnalysisUpdate = TablesUpdate<'track_analyses'>

export interface TrackAnalysisRepository {
  // Get a track analysis by track ID
  getByTrackId(trackId: number): Promise<TrackAnalysis | null>

  // Get all track analyses
  getAllAnalyses(): Promise<TrackAnalysis[]>

  // Insert a new track analysis
  insertAnalysis(analysis: TrackAnalysisInsert): Promise<TrackAnalysis>

  // Delete a track analysis by ID
  deleteAnalysis(id: number): Promise<void>

  // Delete a track analysis by track ID
  deleteAnalysisByTrackId(trackId: number): Promise<void>
}
