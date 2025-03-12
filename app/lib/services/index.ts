import { SpotifyService } from './SpotifyService'
import { SyncService } from './SyncService'
import { DefaultSongAnalysisService } from './analysis/SongAnalysisService'
import { DefaultPlaylistAnalysisService } from './analysis/PlaylistAnalysisService'
import { LlmProviderManager } from './llm/LlmProviderManager'
import { DefaultLyricsService } from './lyrics/LyricsService'
import { DefaultVectorizationService } from './vectorization/VectorizationService'
import { MatchingService } from './matching/MatchingService'
import { SupabaseMatchRepository } from '~/lib/repositories/MatchRepository'
import { trackRepository } from '~/lib/repositories/TrackRepository'
import { playlistRepository } from '~/lib/repositories/PlaylistRepository'

// Initialize LLM provider manager with Google API key
const googleApiKey = process.env.GOOGLE_API_KEY || ''
const llmProviderManager = new LlmProviderManager('google', googleApiKey)

// Initialize lyrics service with Genius API token
const lyricsService = new DefaultLyricsService({
  accessToken: process.env.GENIUS_CLIENT_TOKEN || ''
})

// Initialize analysis services
const songAnalysisService = new DefaultSongAnalysisService(lyricsService, llmProviderManager)
const playlistAnalysisService = new DefaultPlaylistAnalysisService(llmProviderManager)

// Initialize vectorization service
const vectorizationService = new DefaultVectorizationService()

// Initialize repositories
const matchRepository = new SupabaseMatchRepository()

// Initialize matching service
const matchingService = new MatchingService(vectorizationService, matchRepository)

// Initialize Spotify service
const spotifyService = new SpotifyService()

// Export all services
export {
  llmProviderManager,
  lyricsService,
  songAnalysisService,
  playlistAnalysisService,
  vectorizationService,
  matchRepository,
  matchingService,
  spotifyService,
  SyncService // Export the class itself, not an instance
}

// Export types for external use
export type {
  SpotifyService,
  LlmProviderManager,
  DefaultLyricsService as LyricsService,
  DefaultSongAnalysisService as SongAnalysisService,
  DefaultPlaylistAnalysisService as PlaylistAnalysisService,
  DefaultVectorizationService as VectorizationService,
  MatchingService
}