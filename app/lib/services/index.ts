import { SpotifyService } from './SpotifyService'
import { SyncService } from './SyncService'
import { DefaultSongAnalysisService } from './analysis/SongAnalysisService'
import { DefaultPlaylistAnalysisService } from './analysis/PlaylistAnalysisService'
import { LlmProviderManager } from './llm/LlmProviderManager'
import { DefaultLyricsService } from './lyrics/LyricsService'
import { DefaultVectorizationService } from './vectorization/VectorizationService'
import { MatchingService } from './matching/MatchingService'
import { SupabaseMatchRepository } from '~/lib/repositories/MatchRepository'

// todo: need to at runtime with user keys
const googleApiKey = process.env.GOOGLE_API_KEY || ''
const llmProviderManager = new LlmProviderManager('google', googleApiKey)

const lyricsService = new DefaultLyricsService({
  accessToken: process.env.GENIUS_CLIENT_TOKEN || ''
})
const matchRepository = new SupabaseMatchRepository()

const songAnalysisService = new DefaultSongAnalysisService(lyricsService, llmProviderManager)
const playlistAnalysisService = new DefaultPlaylistAnalysisService(llmProviderManager)
const vectorizationService = new DefaultVectorizationService()
const matchingService = new MatchingService(vectorizationService, matchRepository)

// Export all services
export {
  llmProviderManager,
  lyricsService,
  songAnalysisService,
  playlistAnalysisService,
  vectorizationService,
  matchRepository,
  matchingService,
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