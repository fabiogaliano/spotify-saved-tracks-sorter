export interface PlaylistAnalysisResult {
	descriptionAnalysis: string
	songAnalysis: string[]
}

export interface PlaylistAnalysisService {
	analyzePlaylist(
		playlistName: string,
		playlistDescription: string,
		tracks: Array<{ name: string; artist: string }>
	): Promise<string>
}
