import { LlmProviderManager } from './../llms/LlmProviderManager'; 


class PlaylistAnalysis {
  private llmProviderManager: LlmProviderManager;

  constructor(llmProviderManager: LlmProviderManager) {
    this.llmProviderManager = llmProviderManager;
  }

  async analyzePlaylistDescription(playlistDescription: string): Promise<string> {
    const prompt = `Analyze the following playlist description and identify the mood or theme: ${playlistDescription}`;
    const analysis = await this.llmProviderManager.generateText(prompt);
    return analysis;
  }

  async analyzePlaylistSongs(songTitles: string[]): Promise<string[]> {
    const results: string[] = [];
    for (const songTitle of songTitles) {
      const prompt = `Analyze the lyrics and theme of this song: ${songTitle}`;
      const analysis = await this.llmProviderManager.generateText(prompt);
      results.push(analysis);
    }
    return results;
  }

  async analyzePlaylist(playlistDescription: string, songTitles: string[]) {
    const descriptionAnalysis = await this.analyzePlaylistDescription(playlistDescription);
    const songAnalysis = await this.analyzePlaylistSongs(songTitles);

    return {
      descriptionAnalysis,
      songAnalysis
    };
  }
}