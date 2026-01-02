/**
 * Embedding Service Factory
 *
 * Creates and exports the singleton EmbeddingService instance
 * with proper dependency injection.
 */
import { trackEmbeddingRepository } from '~/lib/repositories/TrackEmbeddingRepository'

import { DefaultVectorizationService } from '../vectorization/VectorizationService'
import { DefaultEmbeddingService, type EmbeddingService } from './EmbeddingService'

/**
 * Create an EmbeddingService with custom dependencies.
 * Useful for testing or custom configurations.
 */
export function createEmbeddingService(
	vectorizationService = new DefaultVectorizationService(),
	embeddingRepository = trackEmbeddingRepository
): EmbeddingService {
	return new DefaultEmbeddingService(vectorizationService, embeddingRepository)
}

/**
 * Default singleton instance.
 * Uses the default VectorizationService and TrackEmbeddingRepository.
 */
export const embeddingService: EmbeddingService = createEmbeddingService()
