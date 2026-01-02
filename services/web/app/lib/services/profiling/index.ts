/**
 * Playlist Profiling Service Module
 *
 * Phase 6 of Model Optimization: DB-first playlist profile orchestration.
 *
 * Usage:
 *   import { playlistProfilingService } from '~/lib/services/profiling'
 *
 *   // Get or compute profile for a playlist
 *   const profile = await playlistProfilingService.profilePlaylist(playlist, songs)
 *
 *   // Batch profile multiple playlists
 *   const batch = await playlistProfilingService.profilePlaylistBatch(inputs, {}, progress => {
 *     console.log(`${progress.completed}/${progress.total}`)
 *   })
 */
export {
	DefaultPlaylistProfilingService,
	type AudioCentroid,
	type BatchProfilingResult,
	type ComputedPlaylistProfile,
	type EmotionDistribution,
	type GenreDistribution,
	type PlaylistProfilingService,
	type ProfileBatchProgress,
	type ProfileBatchProgressCallback,
	type ProfileKind,
	type ProfilingOptions,
} from './PlaylistProfilingService'

export { playlistProfilingService, createPlaylistProfilingService } from './factory'
