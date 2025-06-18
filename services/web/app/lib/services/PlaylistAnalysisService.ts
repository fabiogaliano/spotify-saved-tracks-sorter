import { playlistAnalysisRepository } from '~/lib/repositories/PlaylistAnalysisRepository';
import { Json } from '~/types/database.types';

export class PlaylistAnalysisService {
  /**
   * Create or update a playlist analysis
   */
  async saveAnalysis(
    playlistId: number,
    userId: number,
    analysis: Json,
    modelName: string,
    version: number = 1
  ): Promise<number> {
    // Check if analysis already exists
    const existingAnalysis = await playlistAnalysisRepository.getAnalysisByPlaylistId(playlistId);
    
    if (existingAnalysis) {
      // Update existing analysis
      await playlistAnalysisRepository.updateAnalysis(existingAnalysis.id, analysis);
      return existingAnalysis.id;
    } else {
      // Create new analysis
      return await playlistAnalysisRepository.createAnalysis(
        playlistId,
        userId,
        analysis,
        modelName,
        version
      );
    }
  }

  /**
   * Get analysis for a specific playlist
   */
  async getAnalysis(playlistId: number) {
    return await playlistAnalysisRepository.getAnalysisByPlaylistId(playlistId);
  }

  /**
   * Get all analyses for a user
   */
  async getUserAnalyses(userId: number) {
    return await playlistAnalysisRepository.getAnalysesByUserId(userId);
  }

  /**
   * Delete a playlist analysis
   */
  async deleteAnalysis(analysisId: number) {
    return await playlistAnalysisRepository.deleteAnalysis(analysisId);
  }
}

export const playlistAnalysisService = new PlaylistAnalysisService();