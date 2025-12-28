import type {
	PlaylistAnalysis,
	SongAnalysis,
} from '../services/analysis/analysis-schemas'

// Re-export the analysis types
export type { SongAnalysis, PlaylistAnalysis }

export interface Track {
	id: string | number
	artist: string
	title: string
	spotify_track_id?: string
	album?: string
}

/** Track input for creation - before database assigns ID */
export interface TrackInput {
	artist: string
	title: string
	spotify_track_id?: string
	album?: string
}

export interface Song {
	id: number // Internal database ID
	spotifyTrackId?: string // Spotify/ReccoBeats ID
	track: Track
	analysis: SongAnalysis
	timestamp?: string
}

export interface Playlist {
	id: string | number
	name?: string
	title?: string // Alias used in api.matching.tsx
	description?: string
	spotify_playlist_id?: string
	track_ids?: (string | number)[]
	// Playlist analysis fields (typed from PlaylistAnalysis)
	meaning?: PlaylistAnalysis['meaning']
	emotional?: PlaylistAnalysis['emotional']
	context?: PlaylistAnalysis['context']
	curation?: PlaylistAnalysis['curation']
	matching_profile?: PlaylistAnalysis['matching_profile']
}

export interface SentimentScore {
	positive: number
	negative: number
	neutral: number
}

export interface MatchScores {
	theme_similarity: number
	mood_similarity: number
	mood_compatibility: number
	sentiment_compatibility: number
	intensity_match: number
	activity_match: number
	fit_score_similarity: number
	thematic_contradiction: number
}

export interface MatchResult {
	track_info: Track
	similarity: number
	component_scores: MatchScores
	veto_applied?: boolean
	veto_reason?: string
}

export type PlaylistType = 'mood' | 'activity' | 'theme' | 'general'

export interface MatchingService {
	matchSongToPlaylists(
		song: Song,
		playlists: Playlist[]
	): Promise<Array<{ playlist: Playlist; matchResult: MatchResult }>>
	matchSongsToPlaylist(playlist: Playlist, songs: Song[]): Promise<MatchResult[]>
	getBestPlaylistForSong(
		song: Song,
		playlists: Playlist[]
	): Promise<{ playlist: Playlist; matchResult: MatchResult } | null>
}
