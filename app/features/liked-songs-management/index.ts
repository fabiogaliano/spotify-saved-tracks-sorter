// Main components
export { default as LikedSongsTable } from './LikedSongsTable';

// Hooks
export { useLikedSongsManagement } from './hooks/useLikedSongsManagement';
export { useAnalysisSubscription } from './hooks/useAnalysisSubscription';

// Queries
export {
  useLikedSongs,
  useAnalysisJob,
  useAnalysisStatus,
  useSyncLikedSongs,
  useAnalyzeTracks,
  useUpdateTrackAnalysis,
  likedSongsKeys,
} from './queries/liked-songs-queries';

// UI Store
export { LikedSongsUIProvider, useLikedSongsUIContext } from './store/liked-songs-ui-store';

// Legacy context (deprecated - use React Query hooks instead)
export { LikedSongsProvider, useLikedSongs as useLikedSongsLegacy } from './context';