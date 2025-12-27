import { getSupabase } from '~/lib/services/DatabaseService'
import { MatchResult } from '~/lib/models/Matching'
import { logger } from '~/lib/logging/Logger'

export interface MatchRepository {
  saveMatchResult(trackId: number, playlistId: number, matchResult: MatchResult, modelName: string): Promise<void>
  getTrackPlaylistMatches(trackId: number): Promise<Array<{ playlist_id: number; score: number; factors: any }>>
  getPlaylistTrackMatches(playlistId: number): Promise<Array<{ track_id: number; score: number; factors: any }>>
  deleteMatchResult(trackId: number, playlistId: number): Promise<void>
}

export class SupabaseMatchRepository implements MatchRepository {
  async saveMatchResult(trackId: number, playlistId: number, matchResult: MatchResult, modelName: string): Promise<void> {
    try {
      logger.debug('Saving match result', { trackId, playlistId, similarity: matchResult.similarity })

      const { error } = await getSupabase()
        .from('track_playlist_matches')
        .upsert({
          track_id: trackId,
          playlist_id: playlistId,
          score: matchResult.similarity,
          factors: matchResult.component_scores,
          model_name: modelName,
          version: 1
        }, {
          onConflict: 'track_id,playlist_id'
        })

      if (error) {
        throw new logger.AppError('Failed to save match result', error.code, 0, { error })
      }

      logger.debug('Successfully saved match result', { trackId, playlistId })
    } catch (error) {
      logger.error('Error saving match result', error as Error, { trackId, playlistId })
      throw new logger.AppError('Failed to save match result', 'match-save-failed', 0, { error })
    }
  }

  async getTrackPlaylistMatches(trackId: number): Promise<Array<{ playlist_id: number; score: number; factors: any }>> {
    try {
      logger.debug('Getting playlist matches for song', { trackId })

      const { data, error } = await getSupabase()
        .from('track_playlist_matches')
        .select('playlist_id, score, factors')
        .eq('track_id', trackId)
        .order('score', { ascending: false })

      if (error) {
        throw new logger.AppError('Failed to get song playlist matches', error.code, 0, { error })
      }

      logger.debug('Successfully got playlist matches for song', {
        trackId,
        matchCount: data?.length
      })

      return data || []
    } catch (error) {
      logger.error('Error getting song playlist matches', error as Error, { trackId })
      throw new logger.AppError('Failed to get song playlist matches', 'match-get-failed', 0, { error })
    }
  }

  async getPlaylistTrackMatches(playlistId: number): Promise<Array<{ track_id: number; score: number; factors: any }>> {
    try {
      logger.debug('Getting song matches for playlist', { playlistId })

      const { data, error } = await getSupabase()
        .from('track_playlist_matches')
        .select('track_id, score, factors')
        .eq('playlist_id', playlistId)
        .order('score', { ascending: false })

      if (error) {
        throw new logger.AppError('Failed to get playlist song matches', error.code, 0, { error })
      }

      logger.debug('Successfully got song matches for playlist', {
        playlistId,
        matchCount: data?.length
      })

      return data || []
    } catch (error) {
      logger.error('Error getting playlist song matches', error as Error, { playlistId })
      throw new logger.AppError('Failed to get playlist song matches', 'match-get-failed', 0, { error })
    }
  }

  async deleteMatchResult(trackId: number, playlistId: number): Promise<void> {
    try {
      logger.debug('Deleting match result', { trackId, playlistId })

      const { error } = await getSupabase()
        .from('track_playlist_matches')
        .delete()
        .eq('track_id', trackId)
        .eq('playlist_id', playlistId)

      if (error) {
        throw new logger.AppError('Failed to delete match result', error.code, 0, { error })
      }

      logger.debug('Successfully deleted match result', { trackId, playlistId })
    } catch (error) {
      logger.error('Error deleting match result', error as Error, { trackId, playlistId })
      throw new logger.AppError('Failed to delete match result', 'match-delete-failed', 0, { error })
    }
  }
}