import { Link, useLoaderData } from '@remix-run/react'
import { useTrackSortingStore } from '~/core/stores/trackSortingStore'
import { useEffect, useState } from 'react'
import type { LoaderFunctionArgs } from '@remix-run/node'
import { trackRepository } from '~/core/repositories/TrackRepository'

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    // Get all tracks from the database
    // This will be used to display track details for the IDs in the store
    const allTracks = await trackRepository.getAllTracks()
    return { tracks: allTracks || [] }
  } catch (error) {
    console.error('Error loading tracks:', error)
    return { tracks: [] }
  }
}

export default function Matching() {
  const { tracks } = useLoaderData<typeof loader>()
  const trackStore = useTrackSortingStore()
  const [sortedTrackIds, setSortedTrackIds] = useState<string[]>([])
  const [sortedTracks, setSortedTracks] = useState<any[]>([])

  // Get the sorted track IDs from the store when the component mounts
  useEffect(() => {    
    const sortedIds = trackStore.getSortedTrackIds()
    console.log('Sorted track IDs from store:', sortedIds)
    setSortedTrackIds(sortedIds)
    
    // Match the IDs with full track information
    if (tracks && tracks.length > 0) {
      const matchedTracks = tracks.filter(track => 
        sortedIds.includes(track.spotify_track_id)
      )
      console.log('Matched tracks:', matchedTracks)
      setSortedTracks(matchedTracks)
    }
  }, [trackStore, tracks])

  // If we don't have any sorted tracks, show a message
  if (sortedTrackIds.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4">No tracks selected for sorting</h2>
          <p className="mb-6">Return to the home page and select tracks to sort.</p>
          <Link 
            to="/"
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
          >
            Back to Home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[120rem] mx-auto px-2 sm:px-6 lg:px-10 py-6 lg:py-14">
      <nav className="space-y-6 lg:space-y-10 mb-6 lg:mb-12">
        <div className="flex flex-col-reverse sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-4 lg:pb-8">
          <div className="w-full sm:w-auto">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-medium text-gray-900 break-words text-center sm:text-left">
              Selected Tracks for Matching
            </h1>
          </div>
          <div>
            <Link
              to="/"
              className="inline-flex items-center px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md transition-colors"
            >
              Back to Library
            </Link>
          </div>
        </div>
      </nav>

      <main>
        <div className="space-y-6">
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900">
                {sortedTrackIds.length} Tracks Selected for Sorting
              </h3>
              
              {sortedTracks.length > 0 ? (
                <ul className="mt-6 divide-y divide-gray-200">
                  {sortedTracks.map(track => (
                    <li key={track.spotify_track_id} className="py-4 flex items-start space-x-4">
                      <div className="w-12 h-12 flex-shrink-0 bg-gray-100 rounded-md flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-medium text-gray-900 truncate">
                          {track.name}
                        </p>
                        <p className="text-sm text-gray-600 truncate">
                          {track.artist}
                        </p>
                        {track.album && (
                          <p className="text-sm text-gray-500 mt-1">
                            Album: {track.album}
                          </p>
                        )}
                      </div>
                      <div className="ml-2 flex-shrink-0">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Selected
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : sortedTrackIds.length > 0 ? (
                <div className="mt-6 text-center py-4 border border-gray-100 rounded-lg">
                  <p className="text-gray-600">Track details couldn't be loaded, but {sortedTrackIds.length} tracks are selected for sorting.</p>
                  <div className="mt-3 text-sm">
                    <ul className="divide-y divide-gray-100">
                      {sortedTrackIds.map(id => (
                        <li key={id} className="py-2 px-3 text-xs font-mono text-gray-500">{id}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : null}
              
              <div className="mt-8 flex justify-center">
                <Link 
                  to="/"
                  className="inline-flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-md transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                  </svg>
                  Back to Library
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
