export interface SongAnalysisService {
  analyzeSong(artist: string, song: string): Promise<string>
  fetchSongLyricsAndAnnotations(artist: string, song: string): Promise<string>
}
