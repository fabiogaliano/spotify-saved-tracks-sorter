import type { Database } from '~/types/database.types'

export type TrackAnalysis = Database['public']['Tables']['track_analyses']['Row']
export type TrackAnalysisInsert = Database['public']['Tables']['track_analyses']['Insert']
export type TrackAnalysisUpdate = Database['public']['Tables']['track_analyses']['Update']

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
