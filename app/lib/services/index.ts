import { SpotifyService } from './SpotifyService'
import { SyncService } from './SyncService'

// Import repository instances
import { trackRepository } from '~/lib/repositories/TrackRepository'
import { playlistRepository } from '~/lib/repositories/PlaylistRepository'

// Initialize existing services
const spotifyService = new SpotifyService()
const syncService = new SyncService(spotifyService, trackRepository, playlistRepository)

// Mock services that don't exist (for now)
const llmProviderManager = {
  getProvider: () => {
    console.warn('Mock LLM provider called')
    return {
      analyze: async () => ({
        id: '1',
        result: 'Mock analysis',
      })
    }
  }
}

const songAnalysisService = {
  analyze: async () => {
    console.warn('Mock song analysis service called')
    return { id: '1', result: 'Mock analysis' }
  }
}

const playlistAnalysisService = {
  analyze: async () => {
    console.warn('Mock playlist analysis service called')
    return { id: '1', result: 'Mock analysis' }
  }
}

const lyricsService = {
  getLyrics: async () => {
    console.warn('Mock lyrics service called')
    return 'Mock lyrics'
  }
}

const vectorizationService = {
  vectorize: async () => {
    console.warn('Mock vectorization service called')
    return [0.1, 0.2, 0.3]
  }
}

const matchRepository = {
  saveMatches: async () => {
    console.warn('Mock match repository called')
    return []
  },
  getMatches: async () => {
    console.warn('Mock match repository called')
    return []
  }
}

const matchingService = {
  matchSongsToPlaylists: async () => {
    console.warn('Mock matching service called')
    return []
  }
}

// Export all services
export {
  spotifyService,
  syncService,
  llmProviderManager,
  songAnalysisService,
  playlistAnalysisService,
  lyricsService,
  vectorizationService,
  matchRepository,
  matchingService
}