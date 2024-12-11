export interface PlaylistAnalysisResult {
  descriptionAnalysis: string
  songAnalysis: string[]
}

export interface PlaylistAnalysisService {
  analyzePlaylistDescription(playlistDescription: string): Promise<string>
  analyzePlaylistSongs(songTitles: string[]): Promise<string[]>
  analyzePlaylist(playlistDescription: string, songTitles: string[]): Promise<PlaylistAnalysisResult>
}
