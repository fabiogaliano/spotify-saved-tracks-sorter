import { SupabaseMatchRepository } from '~/lib/repositories/MatchRepository'

import { SpotifyService } from './SpotifyService'
import { SyncService } from './SyncService'
import { PlaylistAnalysisService } from './analysis/PlaylistAnalysisService'
import { SongAnalysisService } from './analysis/SongAnalysisService'
import { embeddingService } from './embedding'
import { LlmProviderManager } from './llm/LlmProviderManager'
import { DefaultLyricsService } from './lyrics/LyricsService'
import { MatchingService } from './matching/MatchingService'
import { playlistProfilingService } from './profiling'
import { SemanticMatcher } from './semantic/SemanticMatcher'
import { DefaultVectorizationService } from './vectorization/VectorizationService'

// todo: need to at runtime with user keys
const googleApiKey = process.env.GOOGLE_API_KEY || ''
const llmProviderManager = new LlmProviderManager('google', googleApiKey)

const lyricsService = new DefaultLyricsService({
	accessToken: process.env.GENIUS_CLIENT_TOKEN || '',
})
const matchRepository = new SupabaseMatchRepository()

// Vectorization service (uses env var for API URL)
const vectorizationService = new DefaultVectorizationService()

// Semantic matcher for theme/mood/string similarity
const semanticMatcher = new SemanticMatcher(vectorizationService, {
	defaultThreshold: 0.65,
	cacheTtlMs: 60 * 60 * 1000, // 1 hour
	maxCacheSize: 500,
})

// Analysis services
const songAnalysisService = new SongAnalysisService(lyricsService, llmProviderManager)
const playlistAnalysisService = new PlaylistAnalysisService(llmProviderManager)

// Matching service (uses vectorization, semantic matcher, and DB-first services)
const matchingService = new MatchingService(
	matchRepository,
	vectorizationService,
	semanticMatcher,
	embeddingService,
	playlistProfilingService
)

// Export all services
export {
	llmProviderManager,
	lyricsService,
	songAnalysisService,
	playlistAnalysisService,
	vectorizationService,
	semanticMatcher,
	matchRepository,
	matchingService,
	embeddingService,
	playlistProfilingService,
	SyncService,
	SpotifyService,
}

// Export types for external use
export type {
	LlmProviderManager,
	DefaultLyricsService as LyricsService,
	SongAnalysisService,
	PlaylistAnalysisService,
	DefaultVectorizationService as VectorizationService,
	MatchingService,
}
