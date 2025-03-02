import { DefaultSongAnalysisService } from './analysis/SongAnalysisService'
import { DefaultPlaylistAnalysisService } from './analysis/PlaylistAnalysisService'
import { LlmProviderManager } from './llm/LlmProviderManager'
import { TestLyricsService } from './lyrics/TestLyricsService'
import { SpotifyService } from './SpotifyService'
import { SyncService } from './SyncService'
import { DefaultVectorizationService } from './vectorization/VectorizationService'
import { MatchingService } from './matching/MatchingService'
import { SupabaseMatchRepository } from '../repositories/MatchRepository'

// Initialize LLM Provider
const llmProviderManager = new LlmProviderManager()

// Initialize Lyrics Service
const lyricsService = new TestLyricsService()

// Initialize Analysis Services
const songAnalysisService = new DefaultSongAnalysisService(lyricsService, llmProviderManager)
const playlistAnalysisService = new DefaultPlaylistAnalysisService(llmProviderManager)

// Initialize Vectorization Service
const vectorizationService = new DefaultVectorizationService()

// Initialize Match Repository
const matchRepository = new SupabaseMatchRepository()

// Initialize Matching Service
const matchingService = new MatchingService(vectorizationService, matchRepository)

// Initialize SpotifyService (could be used by SyncService)
const spotifyService = new SpotifyService()

// Initialize SyncService (could use all the services above)
const syncService = new SyncService()

export {
  llmProviderManager,
  lyricsService,
  songAnalysisService,
  playlistAnalysisService,
  vectorizationService,
  matchRepository,
  matchingService,
  spotifyService,
  syncService
}