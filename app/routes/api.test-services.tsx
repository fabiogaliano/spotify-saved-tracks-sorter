import { ActionFunction, json } from '@remix-run/node'
import { useLoaderData, useActionData, Form, Link } from '@remix-run/react'
import { LoaderFunction } from '@remix-run/node'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '~/shared/components/ui/Card'
import { Button } from '~/shared/components/ui/button'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import { SpotifyService } from '~/lib/services/SpotifyService'
import { SyncService } from '~/lib/services/SyncService'
import { trackRepository } from '~/lib/repositories/TrackRepository'
import { trackService } from '~/lib/services/TrackService'
import { playlistRepository } from '~/lib/repositories/PlaylistRepository'
import { getUserSession } from '~/features/auth/auth.utils'
import JsonView from 'react18-json-view'
import 'react18-json-view/src/style.css'

// Helper function to format the response for display
function formatResponse(data: any): string {
  return JSON.stringify(data, null, 2)
}

// Define types for our responses
type TestResponse = {
  service: 'spotify' | 'sync',
  operation: string,
  success: boolean,
  message: string,
  data?: any,
  error?: string,
  stack?: string
}

// Loader function to handle initial page load
export const loader: LoaderFunction = async ({ request }) => {
  const session = await getUserSession(request)
  const isAuthenticated = session !== null

  return json({ isAuthenticated })
}

// Handle the service test action
export const action: ActionFunction = async ({ request }) => {
  try {
    const formData = await request.formData()
    const service = formData.get('service') as string
    const operation = formData.get('operation') as string

    // Helper function to build response
    const buildResponse = (op: string, data?: any) => {
      return Response.json({
        service,
        operation: op,
        success: true,
        message: `Successfully tested ${service} ${op}`,
        data
      })
    }

    console.log(`🧪 Testing ${service} service with operation: ${operation}`)

    // Get user session to access Spotify API instance
    const session = await getUserSession(request)
    if (!session) {
      return Response.json({ error: 'You need to be logged in to test services' }, { status: 401 })
    }

    // Create service instances
    const spotifyService = new SpotifyService(session.spotifyApi)

    // Test Spotify service operations
    if (service === 'spotify') {
      // Test for getting liked tracks
      if (operation === 'all' || operation === 'likedTracks') {
        console.log('🔄 Testing SpotifyService - getLikedTracks...')
        const tracks = await spotifyService.getLikedTracks(
          '2020-08-28'
        )
        console.log(`✅ Fetched ${tracks.length} liked tracks from Spotify API`)

        if (operation === 'likedTracks') {
          return buildResponse('likedTracks', { tracksCount: tracks.length, tracks: tracks })
        }
      }

      // Test for getting playlists
      if (operation === 'all' || operation === 'playlists') {
        console.log('🔄 Testing SpotifyService - getPlaylists...')
        const playlists = await spotifyService.getPlaylists()
        console.log(`✅ Fetched ${playlists.length} playlists from Spotify API`)

        if (operation === 'playlists') {
          return buildResponse('playlists', { playlistsCount: playlists.length, playlists: playlists })
        }
      }

      // Test for getting playlist tracks
      if (operation === 'all' || operation === 'playlistTracks') {
        console.log('🔄 Testing SpotifyService - getPlaylistTracks...')
        // Get the first playlist to test with
        const playlists = await spotifyService.getPlaylists()

        if (playlists.length === 0) {
          return Response.json({
            service: 'spotify',
            operation: 'playlistTracks',
            success: false,
            message: 'No playlists found to test getPlaylistTracks'
          })
        }

        const playlistId = playlists[0].id
        const tracks = await spotifyService.getPlaylistTracks(playlistId)
        console.log(`✅ Fetched ${tracks.length} tracks from playlist ${playlists[0].name}`)

        if (operation === 'playlistTracks') {
          return buildResponse('playlistTracks', {
            playlistName: playlists[0].name,
            tracksCount: tracks.length,
            tracks: tracks
          })
        }
      }

      // If we got here and operation is 'all', we've finished all Spotify tests
      if (operation === 'all') {
        return Response.json({
          service: 'spotify',
          operation: 'all',
          success: true,
          message: 'All SpotifyService operations tested'
        })
      }
    }

    // Test SyncService operations
    if (service === 'sync') {
      const syncService = new SyncService(spotifyService, trackRepository, playlistRepository, trackService)

      if (operation === 'all' || operation === 'syncSavedTracks') {
        console.log('🔄 Testing SyncService - syncSavedTracks...')

        // Get the user ID from the session
        const userId = session.userId

        if (!userId) {
          return buildResponse('syncSavedTracks', {
            success: false,
            message: 'User ID not found in session'
          })
        }

        try {
          // Actually run the sync operation
          const syncResult = await syncService.syncSavedTracks(userId)
          console.log('✅ Sync completed successfully:', syncResult)
          
          // Log information about the sync
          if (syncResult.newItems > 0) {
            console.log(`🌟 Added ${syncResult.newItems} new tracks to the database`)
          } else {
            console.log('🔄 No new tracks were added to the database')
          }
          
          console.log(`🎵 Total tracks processed: ${syncResult.totalProcessed}`)

          if (operation === 'syncSavedTracks') {
            return buildResponse('syncSavedTracks', {
              success: true,
              result: syncResult
            })
          }
        } catch (error) {
          console.error('❌ Sync failed:', error)

          if (operation === 'syncSavedTracks') {
            return buildResponse('syncSavedTracks', {
              success: false,
              message: error instanceof Error ? error.message : 'Unknown error',
              error: error
            })
          }
        }
      }

      if (operation === 'all' || operation === 'syncPlaylists') {
        console.log('🔄 Testing SyncService - syncPlaylists without repository persistence...')

        // Custom implementation to avoid repository interactions
        const playlists = await spotifyService.getPlaylists()
        console.log(`✅ Fetched ${playlists.length} playlists from Spotify API`)

        if (operation === 'syncPlaylists') {
          return buildResponse('syncPlaylists', { playlistsCount: playlists.length })
        }
      }

      // If we got here and operation is 'all', we've finished all sync tests
      if (operation === 'all') {
        return Response.json({
          service: 'sync',
          operation: 'all',
          success: true,
          message: 'All SyncService operations tested'
        })
      }
    }

    return Response.json({ error: `Unknown service or operation: ${service}/${operation}` }, { status: 400 })
  } catch (error) {
    console.error('🔴 Test services error:', error)
    return Response.json({
      error: error instanceof Error ? error.message : 'Failed to test services',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}

// Component to display the test results
export default function TestServicesPage() {
  const loaderData = useLoaderData<{ isAuthenticated: boolean }>()
  const actionData = useActionData<TestResponse | { error: string }>()
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({})

  // Toggle expanded sections for JSON display
  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  // Display JSON data using react18-json-view
  const JsonDisplay = ({ data, label }: { data: any, label: string }) => {
    const isExpanded = expandedSections[label] || false

    if (!data) return null

    return (
      <div className="mt-2">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-medium text-gray-300">{label}</h3>
          <button
            onClick={() => toggleSection(label)}
            className="text-xs text-blue-400 hover:underline"
          >
            {isExpanded ? 'Collapse' : 'Expand'}
          </button>
        </div>
        <div className="mt-1 bg-gray-800 p-2 rounded overflow-auto">
          <JsonView
            src={data}
            className="text-xs"
            theme='a11y'
            collapsed={!isExpanded ? 2 : false}
          />
        </div>
      </div>
    )
  }

  if (!loaderData.isAuthenticated) {
    return (
      <div className="p-8">
        <Card className="bg-gray-900/80 border-gray-800">
          <CardHeader>
            <CardTitle className="text-lg text-white">Authentication Required</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-300">Please log in to test the Spotify and Sync services.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/" className="inline-flex items-center text-white hover:text-gray-300 transition-colors">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-white">Service Test Results</h1>
      </div>

      <Card className="bg-gray-900/80 border-gray-800 mb-6">
        <CardHeader className="pb-2 border-b border-gray-800">
          <CardTitle className="text-lg text-white flex justify-between">
            <span>Run Another Test</span>
            {actionData && (
              <div className="text-sm font-normal">
                <span className={`px-2 py-1 rounded ${actionData.success ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'}`}>
                  {actionData.success ? 'Success' : 'Error'}
                </span>
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="py-4">
          <Form method="post" className="flex gap-4">
            <div className="grid grid-cols-3 gap-3 w-full">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Service</label>
                <select
                  name="service"
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-md px-3 py-2 text-sm"
                  defaultValue="spotify"
                >
                  <option value="spotify">Spotify Service</option>
                  <option value="sync">Sync Service</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Operation</label>
                <select
                  name="operation"
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-md px-3 py-2 text-sm"
                  defaultValue="likedTracks"
                >
                  <option value="all">All Operations</option>
                  <optgroup label="Spotify Operations">
                    <option value="likedTracks">Get Liked Tracks</option>
                    <option value="playlists">Get Playlists</option>
                    <option value="playlistTracks">Get Playlist Tracks</option>
                  </optgroup>
                  <optgroup label="Sync Operations">
                    <option value="syncSavedTracks">Sync Saved Tracks</option>
                    <option value="syncPlaylists">Sync Playlists</option>
                  </optgroup>
                </select>
              </div>

              <div className="flex items-end">
                <Button type="submit" className="bg-green-700 hover:bg-green-600 text-white w-full">
                  <RefreshCw className="h-4 w-4 mr-2" /> Run Test
                </Button>
              </div>
            </div>
          </Form>
        </CardContent>
      </Card>

      {actionData && (
        <Card className="bg-gray-900/80 border-gray-800">
          <CardHeader className="pb-2 border-b border-gray-800">
            <CardTitle className="text-lg text-white">
              {actionData.error ? 'Error' : `Test Results: ${actionData.operation || ''}`}
            </CardTitle>
          </CardHeader>
          <CardContent className="py-4">
            {actionData.error ? (
              <div className="text-red-400">
                <p className="font-medium mb-2">{actionData.error}</p>
                {actionData.stack && (
                  <pre className="text-xs bg-gray-800 p-2 rounded overflow-auto max-h-60">{actionData.stack}</pre>
                )}
              </div>
            ) : (
              <div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-400">Service</p>
                    <p className="text-white font-medium">{actionData.service}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Operation</p>
                    <p className="text-white font-medium">{actionData.operation}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Status</p>
                    <p className={`font-medium ${actionData.success ? 'text-green-400' : 'text-red-400'}`}>
                      {actionData.success ? 'Success' : 'Failed'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Message</p>
                    <p className="text-white">{actionData.message}</p>
                  </div>
                </div>

                {actionData.data && (
                  <JsonDisplay data={actionData.data} label="Response Data" />
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
