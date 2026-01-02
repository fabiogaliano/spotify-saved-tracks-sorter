/**
 * Match Caching Service Factory
 *
 * Creates the singleton MatchCachingService instance with proper dependency injection.
 * Follows the same pattern as EmbeddingService and PlaylistProfilingService factories.
 */
import {
	matchContextRepository,
	matchResultRepository,
} from '~/lib/repositories/MatchCacheRepository'
import { SupabaseMatchRepository } from '~/lib/repositories/MatchRepository'

import { embeddingService } from '../embedding'
import { playlistProfilingService } from '../profiling'
import { SemanticMatcher } from '../semantic/SemanticMatcher'
import { DefaultVectorizationService } from '../vectorization/VectorizationService'
import {
	DefaultMatchCachingService,
	type MatchCachingService,
} from './MatchCachingService'
import { MatchingService } from './MatchingService'

/**
 * Create a MatchCachingService with custom dependencies.
 * Useful for testing or custom configurations.
 */
export function createMatchCachingService(
	matchingService: MatchingService,
	contextRepository = matchContextRepository,
	resultRepository = matchResultRepository
): MatchCachingService {
	return new DefaultMatchCachingService(
		matchingService,
		contextRepository,
		resultRepository,
		embeddingService,
		playlistProfilingService
	)
}

/**
 * Create a fully-wired MatchCachingService with all dependencies.
 * This creates new instances of all services - use the singleton export instead
 * for most cases.
 */
export function createFullMatchCachingService(): MatchCachingService {
	const vectorizationService = new DefaultVectorizationService()
	const semanticMatcher = new SemanticMatcher(vectorizationService, {
		defaultThreshold: 0.65,
		cacheTtlMs: 60 * 60 * 1000,
		maxCacheSize: 500,
	})
	const matchRepository = new SupabaseMatchRepository()

	const matchingService = new MatchingService(
		matchRepository,
		vectorizationService,
		semanticMatcher,
		embeddingService,
		playlistProfilingService
	)

	return new DefaultMatchCachingService(
		matchingService,
		matchContextRepository,
		matchResultRepository,
		embeddingService,
		playlistProfilingService
	)
}
