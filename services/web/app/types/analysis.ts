export interface AnalysisStatus {
  analyzed: boolean;
  analysisId: number;
}

// These types align with the matching-algorithm.ts types
export interface TrackInfo {
  id: number;  // Database primary key is always integer
  spotify_track_id: string;
  name: string;
  artist: string;
  album?: string;
}

export interface AnalyzedTrack extends TrackInfo {
  analysis?: any; // This should match the Analysis type in matching-algorithm.ts
}

export interface AnalyzedPlaylist {
  id: number;
  spotify_playlist_id: string;
  name: string;
  description?: string;
  track_count?: number;
  is_flagged?: boolean;
  analysis?: any; // This should match parts of the Playlist type in matching-algorithm.ts
} 