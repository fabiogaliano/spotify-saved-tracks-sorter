import { supabase } from '../db/db'
import { MatchResult } from '../domain/Matching'
import { DbError } from '../errors/DbError'
import { logger } from '../logging/Logger'

export interface MatchRepository {
  saveMatchResult(songId: number, playlistId: number, matchResult: MatchResult, modelName: string): Promise<void>
  getSongPlaylistMatches(songId: number): Promise<Array<{ playlist_id: number; score: number; factors: any }>>
  getPlaylistSongMatches(playlistId: number): Promise<Array<{ song_id: number; score: number; factors: any }>>
  deleteMatchResult(songId: number, playlistId: number): Promise<void>
}

export class SupabaseMatchRepository implements MatchRepository {
  async saveMatchResult(songId: number, playlistId: number, matchResult: MatchResult, modelName: string): Promise<void> {
    try {
      logger.debug('Saving match result', { songId, playlistId, similarity: matchResult.similarity })
      
      const { error } = await supabase
        .from('song_playlist_matches')
        .upsert({
          song_id: songId,
          playlist_id: playlistId,
          score: matchResult.similarity,
          factors: matchResult.component_scores,
          model_name: modelName,
          version: '1.0'
        }, {
          onConflict: 'song_id,playlist_id'
        })
      
      if (error) {
        throw new DbError('Failed to save match result', error.message, error)
      }
      
      logger.debug('Successfully saved match result', { songId, playlistId })
    } catch (error) {
      logger.error('Error saving match result', error as Error, { songId, playlistId })
      throw new DbError('Failed to save match result', 'match-save-failed', error)
    }
  }

  async getSongPlaylistMatches(songId: number): Promise<Array<{ playlist_id: number; score: number; factors: any }>> {
    try {
      logger.debug('Getting playlist matches for song', { songId })
      
      const { data, error } = await supabase
        .from('song_playlist_matches')
        .select('playlist_id, score, factors')
        .eq('song_id', songId)
        .order('score', { ascending: false })
      
      if (error) {
        throw new DbError('Failed to get song playlist matches', error.message, error)
      }
      
      logger.debug('Successfully got playlist matches for song', { 
        songId, 
        matchCount: data?.length 
      })
      
      return data || []
    } catch (error) {
      logger.error('Error getting song playlist matches', error as Error, { songId })
      throw new DbError('Failed to get song playlist matches', 'match-get-failed', error)
    }
  }

  async getPlaylistSongMatches(playlistId: number): Promise<Array<{ song_id: number; score: number; factors: any }>> {
    try {
      logger.debug('Getting song matches for playlist', { playlistId })
      
      const { data, error } = await supabase
        .from('song_playlist_matches')
        .select('song_id, score, factors')
        .eq('playlist_id', playlistId)
        .order('score', { ascending: false })
      
      if (error) {
        throw new DbError('Failed to get playlist song matches', error.message, error)
      }
      
      logger.debug('Successfully got song matches for playlist', { 
        playlistId, 
        matchCount: data?.length 
      })
      
      return data || []
    } catch (error) {
      logger.error('Error getting playlist song matches', error as Error, { playlistId })
      throw new DbError('Failed to get playlist song matches', 'match-get-failed', error)
    }
  }

  async deleteMatchResult(songId: number, playlistId: number): Promise<void> {
    try {
      logger.debug('Deleting match result', { songId, playlistId })
      
      const { error } = await supabase
        .from('song_playlist_matches')
        .delete()
        .eq('song_id', songId)
        .eq('playlist_id', playlistId)
      
      if (error) {
        throw new DbError('Failed to delete match result', error.message, error)
      }
      
      logger.debug('Successfully deleted match result', { songId, playlistId })
    } catch (error) {
      logger.error('Error deleting match result', error as Error, { songId, playlistId })
      throw new DbError('Failed to delete match result', 'match-delete-failed', error)
    }
  }
}