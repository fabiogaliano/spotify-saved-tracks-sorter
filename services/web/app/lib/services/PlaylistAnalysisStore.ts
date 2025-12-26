import { playlistAnalysisRepository } from '~/lib/repositories/PlaylistAnalysisRepository';
import { ANALYSIS_VERSION } from './analysis/analysis-version';
import { Json } from '~/types/database.types';

export class PlaylistAnalysisStore {
  async saveAnalysis(
    playlistId: number,
    userId: number,
    analysis: Json,
    modelName: string,
    version: number = ANALYSIS_VERSION.CURRENT
  ): Promise<number> {
    const existingAnalysis = await playlistAnalysisRepository.getAnalysisByPlaylistId(playlistId);

    if (existingAnalysis) {
      await playlistAnalysisRepository.updateAnalysis(existingAnalysis.id, analysis);
      return existingAnalysis.id;
    } else {
      return await playlistAnalysisRepository.createAnalysis(
        playlistId,
        userId,
        analysis,
        modelName,
        version
      );
    }
  }

  async getAnalysis(playlistId: number) {
    return await playlistAnalysisRepository.getAnalysisByPlaylistId(playlistId);
  }

  async getUserAnalyses(userId: number) {
    return await playlistAnalysisRepository.getAnalysesByUserId(userId);
  }

  async deleteAnalysis(analysisId: number) {
    return await playlistAnalysisRepository.deleteAnalysis(analysisId);
  }
}

export const playlistAnalysisStore = new PlaylistAnalysisStore();