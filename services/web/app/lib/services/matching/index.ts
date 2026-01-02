/**
 * Matching Services Module
 *
 * Exports matching-related services:
 * - MatchingService: Core matching algorithm
 * - MatchCachingService: Cache-first wrapper for matching
 */

// Types and interfaces
export {
	type CachedMatchingInput,
	type CachedMatchingResult,
	type CacheStats,
	type CachingOptions,
	type MatchCachingService,
	DefaultMatchCachingService,
} from './MatchCachingService'

export { MatchingService } from './MatchingService'

// Factory functions
export { createMatchCachingService, createFullMatchCachingService } from './factory'
