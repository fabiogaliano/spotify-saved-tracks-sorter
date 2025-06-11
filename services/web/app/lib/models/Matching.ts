export interface Theme {
  name: string;
  confidence?: number;
  description: string;
  related_themes?: string[];
  connection?: string;
}

export interface Mood {
  mood: string;
  description: string;
}

export interface Context {
  primary_setting?: string;
  situations?: {
    perfect_for?: string[];
    why?: string;
  };
  fit_scores?: {
    morning?: number;
    working?: number;
    relaxation?: number;
    [key: string]: number | undefined;
  };
}

export interface Meaning {
  themes: Theme[];
  main_message?: string;
  interpretation?: {
    main_message?: string;
    verified?: string[];
    derived?: string[];
  };
}

export interface Emotional {
  dominantMood: Mood;
  progression?: any[];
  intensity_score?: number;
}

export interface Analysis {
  meaning: Meaning;
  emotional: Emotional;
  context: Context;
  matchability?: any;
}

export interface Track {
  id?: string | number;
  artist: string;
  title: string;
  spotify_track_id?: string;
  album?: string;
}

export interface Song {
  track: Track;
  analysis: Analysis;
  timestamp?: string;
}

export interface Playlist {
  id: string | number;
  name?: string;
  description?: string;
  spotify_playlist_id?: string;
  track_ids?: (string | number)[];
  meaning: Meaning;
  emotional: Emotional;
  context: Context;
  matchability?: any;
}

export interface SentimentScore {
  positive: number;
  negative: number;
  neutral: number;
}

export interface MatchScores {
  theme_similarity: number;
  mood_similarity: number;
  mood_compatibility: number;
  sentiment_compatibility: number;
  intensity_match: number;
  activity_match: number;
  fit_score_similarity: number;
  thematic_contradiction: number;
}

export interface MatchResult {
  track_info: Track;
  similarity: number;
  component_scores: MatchScores;
  veto_applied?: boolean;
  veto_reason?: string;
}

export type PlaylistType = 'mood' | 'activity' | 'theme' | 'general';

export interface MatchingService {
  matchSongToPlaylists(song: Song, playlists: Playlist[]): Promise<Array<{ playlist: Playlist; matchResult: MatchResult }>>;
  matchSongsToPlaylist(playlist: Playlist, songs: Song[]): Promise<MatchResult[]>;
  getBestPlaylistForSong(song: Song, playlists: Playlist[]): Promise<{ playlist: Playlist; matchResult: MatchResult } | null>;
}