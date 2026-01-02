/**
 * Playlist Profiling Service Factory
 *
 * Creates and exports the singleton PlaylistProfilingService instance
 * with proper dependency injection.
 */
import { playlistProfileRepository } from '~/lib/repositories/PlaylistProfileRepository'

import { embeddingService } from '../embedding'
import {
	DefaultPlaylistProfilingService,
	type PlaylistProfilingService,
} from './PlaylistProfilingService'

/**
 * Create a PlaylistProfilingService with custom dependencies.
 * Useful for testing or custom configurations.
 */
export function createPlaylistProfilingService(
	embeddingServiceInstance = embeddingService,
	profileRepository = playlistProfileRepository
): PlaylistProfilingService {
	return new DefaultPlaylistProfilingService(embeddingServiceInstance, profileRepository)
}

/**
 * Default singleton instance.
 * Uses the default EmbeddingService and PlaylistProfileRepository.
 */
export const playlistProfilingService: PlaylistProfilingService =
	createPlaylistProfilingService()
