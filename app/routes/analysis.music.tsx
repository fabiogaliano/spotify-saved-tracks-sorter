import { Link, useLoaderData, useFetcher } from '@remix-run/react'
import { useTrackSortingStore } from '~/core/stores/trackSortingStore'
import { useAnalysisStatusStore } from '~/core/stores/analysisStatusStore'
import { useEffect, useState } from 'react'
import type { LoaderFunctionArgs, ActionFunctionArgs } from '@remix-run/node'
import { json } from '@remix-run/node'
import { trackRepository } from '~/core/repositories/TrackRepository'
import { getSupabase } from '~/core/db/db'
import { songAnalysisService } from '~/core/services'

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    // Get all tracks from the database
    // This will be used to display track details for the IDs in the store
    console.log('Starting loader function')
    const allTracks = await trackRepository.getAllTracks()
    console.log('All tracks fetched:', allTracks.length)

    // Get track analysis status
    const { data: trackAnalyses, error } = await getSupabase()
      .from('track_analyses')
      .select('track_id, id, created_at')

    if (error) {
      console.error('Error fetching track analyses:', error)
    }

    // Create a map of track_id to analysis status
    const analysisStatusMap = (trackAnalyses || []).reduce((acc, analysis) => {
      acc[analysis.track_id] = {
        analyzed: true,
        analysisId: analysis.id
      }
      return acc
    }, {})

    return {
      tracks: allTracks || [],
      analysisStatusMap
    }
  } catch (error) {
    console.error('Error loading tracks:', error)
    return {
      tracks: [],
      analysisStatusMap: {}
    }
  }
}

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData()
  const action = formData.get('action')

  if (action === 'analyze') {
    const trackId = formData.get('trackId')
    const spotifyTrackId = formData.get('spotifyTrackId')
    const artist = formData.get('artist')
    const name = formData.get('name')

    if (!trackId || !spotifyTrackId || !artist || !name) {
      return json({ success: false, error: 'Missing required track information' }, { status: 400 })
    }

    try {
      // First check if analysis already exists
      const { data, error } = await getSupabase()
        .from('track_analyses')
        .select('id')
        .eq('track_id', trackId)
        .maybeSingle()

      if (error) throw error

      // If analysis exists, delete it first if we're re-analyzing
      if (data?.id) {
        const { error: deleteError } = await getSupabase()
          .from('track_analyses')
          .delete()
          .eq('id', data.id)

        if (deleteError) throw deleteError
      }

      // Start the analysis process
      try {
        // Use the song analysis service to analyze the track
        const { model, analysisJson } = JSON.parse(await songAnalysisService.analyzeSong(
          artist.toString(),
          name.toString()
        ))


        // Save the analysis to the database
        const { data: insertData, error: insertError } = await getSupabase()
          .from('track_analyses')
          .insert({
            track_id: Number(trackId),
            analysis: analysisJson,
            model_name: model,
            version: 1
          })
          .select()

        if (insertError) throw insertError

        return json({
          success: true,
          trackId,
          analysisId: insertData?.[0]?.id
        })
      } catch (analysisError) {
        console.error('Error during track analysis:', analysisError)
        return json({
          success: false,
          error: 'Failed to analyze track',
          trackId,
          details: analysisError.message
        }, { status: 500 })
      }
    } catch (dbError) {
      console.error('Database error during analysis:', dbError)
      return json({
        success: false,
        error: 'Database error',
        trackId,
        details: dbError.message
      }, { status: 500 })
    }
  }

  return json({ success: false, error: 'Unknown action' }, { status: 400 })
}

export default function MusicAnalysis() {
  const { tracks, analysisStatusMap } = useLoaderData<typeof loader>()
  const trackStore = useTrackSortingStore()
  const analysisStore = useAnalysisStatusStore()
  const [sortedTrackIds, setSortedTrackIds] = useState<string[]>([])
  const [sortedTracks, setSortedTracks] = useState<any[]>([])
  const fetcher = useFetcher()

  // Get the sorted track IDs from the store when the component mounts
  useEffect(() => {
    const sortedIds = trackStore.getSortedTrackIds()
    console.log('Sorted track IDs from store:', sortedIds)
    setSortedTrackIds(sortedIds)

    // Debug the tracks we received from the server
    console.log('Tracks from server:', tracks ? tracks.length : 0)

    // Match the IDs with full track information
    if (tracks && tracks.length > 0 && sortedIds.length > 0) {
      // Simple filtering approach
      const matchedTracks = tracks.filter(track => sortedIds.includes(track.spotify_track_id))

      console.log('Matched tracks:', matchedTracks.length, matchedTracks.map(t => t.spotify_track_id))
      console.log('Sorted IDs not found in tracks:',
        sortedIds.filter(id => !matchedTracks.some(track => track.spotify_track_id === id)))

      setSortedTracks(matchedTracks)
    }
  }, [trackStore, tracks])

  // Initialize the analysis status for tracks - separate effect to avoid loops
  useEffect(() => {
    if (!tracks || !sortedTrackIds.length) return;

    const matchedTracks = tracks.filter(track => sortedTrackIds.includes(track.spotify_track_id))

    // Initialize analysis status for all tracks
    matchedTracks.forEach(track => {
      // If the track is already analyzed according to the database
      if (analysisStatusMap[track.id]) {
        analysisStore.setTrackStatus(track.id.toString(), 'analyzed');
      }
    })
  }, [tracks, sortedTrackIds, analysisStatusMap])

  // Handle migration from sessionStorage to Zustand store - run only once
  useEffect(() => {
    // Check if there are tracks in the analysis queue from sessionStorage (for backward compatibility)
    const remainingTracksJSON = sessionStorage.getItem('remainingTracksToAnalyze');
    if (remainingTracksJSON) {
      try {
        const remainingTracks = JSON.parse(remainingTracksJSON);
        if (remainingTracks.length > 0) {
          // Set the first track as analyzing and the rest as queued
          const [firstTrack, ...restTracks] = remainingTracks;

          // Set first track as analyzing
          analysisStore.setCurrentlyAnalyzing(firstTrack.id.toString());
          analysisStore.setTrackStatus(firstTrack.id.toString(), 'analyzing');

          // Set rest as queued
          restTracks.forEach((track: any) => {
            analysisStore.setTrackStatus(track.id.toString(), 'queued');
          });

          // Store in the queue
          analysisStore.setQueuedTracks(restTracks);

          // Remove from sessionStorage as we've migrated to the store
          sessionStorage.removeItem('remainingTracksToAnalyze');
        }
      } catch (error) {
        console.error('Error parsing remaining tracks:', error);
        sessionStorage.removeItem('remainingTracksToAnalyze');
      }
    }
  }, [])

  // Track the currently analyzing track ID
  useEffect(() => {
    if (fetcher.state === 'submitting' && fetcher.submission) {
      const trackId = fetcher.submission.get('trackId');
      if (trackId) {
        console.log(`Track ${trackId} is now being analyzed`);
        analysisStore.setCurrentlyAnalyzing(trackId.toString());
        analysisStore.setTrackStatus(trackId.toString(), 'analyzing');
      }
    }
  }, [fetcher.state, fetcher.submission]);

  // Update analysis status when fetcher completes and process next track if needed
  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data) {
      const { success, trackId } = fetcher.data;
      if (trackId) {
        console.log(`Track ${trackId} analysis completed with success: ${success}`);
        analysisStore.setTrackStatus(trackId.toString(), success ? 'analyzed' : 'error');

        // Check if there are more tracks to analyze
        const nextTrack = analysisStore.getNextTrackToAnalyze();
        if (nextTrack) {
          // Remove this track from the queue
          analysisStore.removeFromQueue(nextTrack.id);

          // Set as currently analyzing
          analysisStore.setCurrentlyAnalyzing(nextTrack.id);

          // Submit the next track for analysis
          const formData = new FormData();
          formData.append('action', 'analyze');
          formData.append('trackId', nextTrack.id.toString());
          formData.append('spotifyTrackId', nextTrack.spotify_track_id);
          formData.append('artist', nextTrack.artist);
          formData.append('name', nextTrack.name);

          // Short timeout to ensure the UI updates before starting the next request
          setTimeout(() => {
            fetcher.submit(formData, { method: 'post' });
          }, 500);
        } else {
          // No more tracks to analyze
          analysisStore.setCurrentlyAnalyzing(null);
        }
      }
    }
  }, [fetcher.state, fetcher.data]);

  // Function to start analysis for a single track
  const analyzeTrack = (track: any) => {
    analysisStore.setCurrentlyAnalyzing(track.id.toString());
    analysisStore.setTrackStatus(track.id.toString(), 'analyzing');

    const formData = new FormData();
    formData.append('action', 'analyze');
    formData.append('trackId', track.id.toString());
    formData.append('spotifyTrackId', track.spotify_track_id);
    formData.append('artist', track.artist);
    formData.append('name', track.name);

    fetcher.submit(formData, { method: 'post' });
  }

  // Function to start analysis for all selected tracks
  const analyzeAllTracks = () => {
    // Only analyze tracks that are in 'idle' or 'error' state
    const tracksToAnalyze = sortedTracks.filter(track => {
      const status = analysisStore.getTrackStatus(track.id.toString());
      return status === 'idle' || status === 'error';
    });

    if (tracksToAnalyze.length === 0) return;

    // Process first track immediately
    const firstTrack = tracksToAnalyze[0];
    analysisStore.setCurrentlyAnalyzing(firstTrack.id.toString());
    analysisStore.setTrackStatus(firstTrack.id.toString(), 'analyzing');

    // Queue the rest of the tracks
    if (tracksToAnalyze.length > 1) {
      const remainingTracks = tracksToAnalyze.slice(1).map(t => ({
        id: t.id.toString(),
        spotify_track_id: t.spotify_track_id,
        artist: t.artist,
        name: t.name
      }));

      // Set all remaining tracks as queued
      remainingTracks.forEach(track => {
        analysisStore.setTrackStatus(track.id, 'queued');
      });

      // Store in the queue
      analysisStore.setQueuedTracks(remainingTracks);
    }

    // Submit the first track for analysis
    const formData = new FormData();
    formData.append('action', 'analyze');
    formData.append('trackId', firstTrack.id.toString());
    formData.append('spotifyTrackId', firstTrack.spotify_track_id);
    formData.append('artist', firstTrack.artist);
    formData.append('name', firstTrack.name);

    fetcher.submit(formData, { method: 'post' });
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Music Analysis</h1>

      <div className="mb-6">
        <p className="mb-4">
          This page allows you to analyze the tracks you've selected for sorting.
          The analysis will help the system better understand the mood, themes, and context of each song.
        </p>

        <div className="flex space-x-4 mb-6">
          <button
            onClick={analyzeAllTracks}
            className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded"
          >
            Analyze All Tracks
          </button>

          <Link
            to="/"
            className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded"
          >
            Back to Sorting
          </Link>
        </div>
      </div>

      {/* Debug information section */}


      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Track</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Artist</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedTracks.length > 0 ? (
              sortedTracks.map((track) => (
                <tr key={track.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{track.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{track.artist}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${analysisStore.getTrackStatus(track.id.toString()) === 'analyzed' ? 'bg-green-100 text-green-800' :
                        analysisStore.getTrackStatus(track.id.toString()) === 'analyzing' ? 'bg-yellow-100 text-yellow-800' :
                          analysisStore.getTrackStatus(track.id.toString()) === 'queued' ? 'bg-blue-100 text-blue-800' :
                            analysisStore.getTrackStatus(track.id.toString()) === 'error' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'}`}>
                      {analysisStore.getTrackStatus(track.id.toString()) === 'analyzed' ? 'Analyzed' :
                        analysisStore.getTrackStatus(track.id.toString()) === 'analyzing' ? 'Analyzing...' :
                          analysisStore.getTrackStatus(track.id.toString()) === 'queued' ? 'Queued' :
                            analysisStore.getTrackStatus(track.id.toString()) === 'error' ? 'Error' : 'Not Analyzed'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {analysisStore.getTrackStatus(track.id.toString()) === 'error' && (
                      <button
                        onClick={() => analyzeTrack(track)}
                        className="text-blue-600 hover:text-blue-900"
                        disabled={analysisStore.getTrackStatus(track.id.toString()) === 'analyzing'}
                      >
                        Analyze
                      </button>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                  No tracks selected for sorting. Please go to the sorting page first.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
