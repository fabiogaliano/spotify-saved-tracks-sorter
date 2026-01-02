/**
 * Embedding Service Module
 *
 * Phase 4 of Model Optimization: DB-first embedding orchestration.
 *
 * Usage:
 *   import { embeddingService } from '~/lib/services/embedding'
 *
 *   // Get or compute embedding for a song
 *   const result = await embeddingService.embedTrack({ song })
 *
 *   // Batch embed multiple tracks
 *   const batch = await embeddingService.embedTrackBatch(inputs, {}, progress => {
 *     console.log(`${progress.completed}/${progress.total}`)
 *   })
 */
export {
	DefaultEmbeddingService,
	type BatchEmbeddingResult,
	type BatchProgress,
	type BatchProgressCallback,
	type EmbeddingKind,
	type EmbeddingOptions,
	type EmbeddingResult,
	type EmbeddingService,
	type TrackInput,
} from './EmbeddingService'

export { embeddingService, createEmbeddingService } from './factory'
