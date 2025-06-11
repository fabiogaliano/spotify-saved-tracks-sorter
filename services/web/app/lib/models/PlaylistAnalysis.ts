export interface PlaylistAnalysisResult {
	descriptionAnalysis: string
	songAnalysis: string[]
}

export interface PlaylistAnalysisService {
	analyzePlaylistWithPrompt(
		playlistName: string,
		playlistDescription: string
	): Promise<{ model: string; analysisJson: any }>
}
