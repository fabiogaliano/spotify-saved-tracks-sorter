import { LyricsService } from './lyrics-service'; 
import { LlmProviderManager } from './../llms/LlmProviderManager'; 

class SongAnalysis {
  private lyricsService: LyricsService;
  private providerManager: LlmProviderManager;

  constructor(lyricsService: LyricsService, providerManager: LlmProviderManager) {
    this.lyricsService = lyricsService;
    this.providerManager = providerManager;
  }

  async fetchSongLyricsAndAnnotations(songId: string): Promise<string> {
    const lyrics = await this.lyricsService.getLyrics(songId);
    const annotations = 'await this.lyricsService.getAnnotations(songId)'; // TODO: check how annotations are fetched
    return `${lyrics}\n\nAnnotations: ${annotations}`;
  }


  async analyzeSong(songId: string): Promise<string> {
    const lyricsAndAnnotations = await this.fetchSongLyricsAndAnnotations(songId);
    const audioFeatures = 'TODO: get from spotify';
    const prompt = `Analyze the following song: ${lyricsAndAnnotations}\n${audioFeatures}`;

    const analysis = await this.providerManager.generateText(prompt);
    return analysis;
  }
}