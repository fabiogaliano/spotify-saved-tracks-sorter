import { DefaultSongAnalysisService } from './analysis/SongAnalysisService'
import { DefaultPlaylistAnalysisService } from './analysis/PlaylistAnalysisService'
import { LlmProviderManager } from './llm/LlmProviderManager'
import { DefaultLyricsService } from './lyrics/LyricsService'
import { SpotifyService } from './SpotifyService'
import { SyncService } from './SyncService'
import { DefaultVectorizationService } from './vectorization/VectorizationService'
import { MatchingService } from './matching/MatchingService'
import { SupabaseMatchRepository } from '../repositories/MatchRepository'

const googleApiKey = process.env.GOOGLE_API_KEY || ''
const llmProviderManager = new LlmProviderManager('google', googleApiKey)

const lyricsService = new DefaultLyricsService({
  accessToken: process.env.GENIUS_CLIENT_TOKEN || ''
})

const songAnalysisService = new DefaultSongAnalysisService(lyricsService, llmProviderManager)
const playlistAnalysisService = new DefaultPlaylistAnalysisService(llmProviderManager)

const vectorizationService = new DefaultVectorizationService()

const matchRepository = new SupabaseMatchRepository()

const matchingService = new MatchingService(vectorizationService, matchRepository)

const spotifyService = new SpotifyService()

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