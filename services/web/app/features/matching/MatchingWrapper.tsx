import { useFetcher } from 'react-router'
import { useEffect } from 'react'
import MatchingPage from './MatchingPage'
import type { AnalyzedTrack, AnalyzedPlaylist } from '~/types/analysis'

interface MatchingWrapperProps {
  // Optional props for when used in dashboard context
  initialPlaylists?: AnalyzedPlaylist[]
  initialTracks?: AnalyzedTrack[]
}

export default function MatchingWrapper({ initialPlaylists, initialTracks }: MatchingWrapperProps) {
  const fetcher = useFetcher<{ playlists: AnalyzedPlaylist[], tracks: AnalyzedTrack[] }>()

  // Load data if not provided as props
  useEffect(() => {
    if (!initialPlaylists && !initialTracks && fetcher.state === 'idle' && !fetcher.data) {
      fetcher.load('/matching')
    }
  }, [fetcher, initialPlaylists, initialTracks])

  // Use provided data or fetched data
  const playlists = initialPlaylists || fetcher.data?.playlists || []
  const tracks = initialTracks || fetcher.data?.tracks || []

  // Show loading state when fetching data
  if (!initialPlaylists && !initialTracks && fetcher.state === 'loading') {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading matching data...</p>
        </div>
      </div>
    )
  }

  // Pass the data to MatchingPage as if it came from a loader
  const mockLoaderData = { playlists, tracks }

  return (
    <div>
      {/* Inject the data into the component context */}
      <MatchingPageWithData data={mockLoaderData} />
    </div>
  )
}

// Helper component to provide data context
function MatchingPageWithData({ data }: { data: { playlists: AnalyzedPlaylist[], tracks: AnalyzedTrack[] } }) {
  // Mock the useLoaderData hook behavior
  const originalUseLoaderData = require('react-router').useLoaderData
  
  // Temporarily override useLoaderData for this component
  const mockUseLoaderData = () => data
  
  // Replace useLoaderData in the module temporarily
  require('react-router').useLoaderData = mockUseLoaderData
  
  try {
    return <MatchingPage />
  } finally {
    // Restore original useLoaderData
    require('react-router').useLoaderData = originalUseLoaderData
  }
}