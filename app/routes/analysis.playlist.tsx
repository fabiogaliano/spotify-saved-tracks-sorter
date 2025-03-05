import { Link, useLoaderData, useFetcher, useNavigate } from '@remix-run/react'
import { useEffect, useState } from 'react'
import type { LoaderFunctionArgs, ActionFunctionArgs } from '@remix-run/node'
import { json } from '@remix-run/node'
import { getSupabase } from '~/core/db/db'
import { playlistRepository } from '~/core/repositories/PlaylistRepository'
import fs from 'fs'
import path from 'path'
import { llmProviderManager } from '~/core/services'
import { useAnalysisStatusStore } from '~/core/stores/analysisStatusStore'

// Read the playlist analysis prompt
const promptPath = path.join(process.cwd(), 'matching-algorithm', 'prompts', 'playlist-analysis_prompt.txt')
const PLAYLIST_ANALYSIS_PROMPT = fs.readFileSync(promptPath, 'utf-8')

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    // Get flagged playlists from the database
    // Using a default user ID of 1 for now - this should be replaced with the actual user ID from the session
    const userId = 1; // Replace with actual user ID from session

    // Add a method to get flagged playlists
    const { data: flaggedPlaylists, error: playlistsError } = await getSupabase()
      .from('playlists')
      .select('*')
      .eq('user_id', userId)
      .eq('is_flagged', true)
      .order('name');

    if (playlistsError) {
      console.error('Error fetching flagged playlists:', playlistsError);
    }

    // Get playlist analysis status
    const { data: playlistAnalyses, error } = await getSupabase()
      .from('playlist_analyses')
      .select('playlist_id, id, created_at')

    if (error) {
      console.error('Error fetching playlist analyses:', error)
    }

    // Create a map of playlist_id to analysis status
    const analysisStatusMap = (playlistAnalyses || []).reduce((acc, analysis) => {
      acc[analysis.playlist_id] = {
        analyzed: true,
        analysisId: analysis.id
      }
      return acc
    }, {})

    return {
      playlists: flaggedPlaylists || [],
      analysisStatusMap
    }
  } catch (error) {
    console.error('Error loading playlists:', error)
    return {
      playlists: [],
      analysisStatusMap: {}
    }
  }
}

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData()
  const action = formData.get('action')

  if (action === 'analyze') {
    const playlistId = formData.get('playlistId')
    const playlistName = formData.get('playlistName')
    const playlistDescription = formData.get('playlistDescription') || ''

    if (!playlistId || !playlistName) {
      return json({ success: false, error: 'Missing required playlist information' }, { status: 400 })
    }

    try {
      // First check if analysis already exists
      const { data, error } = await getSupabase()
        .from('playlist_analyses')
        .select('id')
        .eq('playlist_id', playlistId)
        .maybeSingle()

      if (error) throw error

      // If analysis exists, delete it first if we're re-analyzing
      if (data?.id) {
        const { error: deleteError } = await getSupabase()
          .from('playlist_analyses')
          .delete()
          .eq('id', data.id)

        if (deleteError) throw deleteError
      }

      // Start the analysis process
      try {

        // Fill in the prompt template
        const filledPrompt = PLAYLIST_ANALYSIS_PROMPT
          .replace('{playlist_name}', playlistName.toString())
          .replace('{playlist_description}', playlistDescription.toString())

        console.log('Generating analysis for playlist:', playlistName)
        // Generate the analysis
        const result = await llmProviderManager.generateText(filledPrompt)

        if (!result) {
          throw new Error('Failed to generate analysis: No response from LLM provider')
        }

        console.log('Analysis generation completed')

        // Parse the result
        let analysisJson
        try {
          analysisJson = JSON.parse(result.text)
          console.log('Successfully parsed analysis JSON directly')
        } catch (parseError) {
          console.log('Failed to parse result directly as JSON, trying to extract from code block')
          const jsonMatch = result.text.match(/```(?:json)?(\n|\r\n|\r)?(.*?)```/s)
          if (jsonMatch && jsonMatch[2]) {
            try {
              analysisJson = JSON.parse(jsonMatch[2].trim())
              console.log('Successfully parsed analysis JSON from code block')
            } catch (extractError) {
              console.error('Failed to parse extracted content as JSON:', extractError)
              throw new Error('Failed to parse extracted content as JSON')
            }
          } else {
            console.error('No JSON code block found in result')
            console.error('Raw result:', result.text)
            throw new Error('Failed to parse analysis result as JSON - no JSON code block found')
          }
        }

        // Get the user ID (using a default value for now, should be replaced with actual user ID)
        const userId = 1 // Replace with actual user ID from session

        // Save the analysis to the database
        console.log('Saving playlist analysis to database:', {
          playlist_id: Number(playlistId),
          model_name: llmProviderManager.getCurrentModel()
        })

        const { data: insertData, error: insertError } = await getSupabase()
          .from('playlist_analyses')
          .insert({
            playlist_id: Number(playlistId),
            analysis: analysisJson,
            model_name: llmProviderManager.getCurrentModel(),
            user_id: userId,
            version: 1,
            created_at: new Date().toISOString() // Explicitly set creation timestamp
          })
          .select()

        if (!insertData || insertData.length === 0) {
          console.error('No data returned from insert operation')
          throw new Error('Failed to save playlist analysis')
        }

        console.log('Successfully saved playlist analysis with ID:', insertData[0].id)

        if (insertError) throw insertError

        return json({
          success: true,
          playlistId,
          analysisId: insertData?.[0]?.id
        })
      } catch (analysisError) {
        console.error('Error during playlist analysis:', analysisError)
        return json({
          success: false,
          error: 'Failed to analyze playlist',
          playlistId,
          details: analysisError.message
        }, { status: 500 })
      }
    } catch (dbError) {
      console.error('Database error during analysis:', dbError)
      return json({
        success: false,
        error: 'Database error',
        playlistId,
        details: dbError.message
      }, { status: 500 })
    }
  }

  return json({ success: false, error: 'Unknown action' }, { status: 400 })
}

export default function PlaylistAnalysis() {
  const { playlists, analysisStatusMap } = useLoaderData<typeof loader>()
  const analysisStore = useAnalysisStatusStore()
  const [hasAnalyzedPlaylists, setHasAnalyzedPlaylists] = useState(false)
  const fetcher = useFetcher()
  const navigate = useNavigate()

  // Initialize analysis status for playlists
  useEffect(() => {
    if (!playlists || playlists.length === 0) return;
    
    // Initialize analysis status for all playlists
    let analyzedCount = 0;
    playlists.forEach(playlist => {
      // If the playlist is already analyzed according to the database
      if (analysisStatusMap[playlist.id]) {
        analysisStore.setTrackStatus(playlist.id.toString(), 'analyzed');
        analyzedCount++;
      } else {
        // Set as idle if not analyzed
        analysisStore.setTrackStatus(playlist.id.toString(), 'idle');
      }
    })
    
    // Update the hasAnalyzedPlaylists state
    setHasAnalyzedPlaylists(analyzedCount > 0);
  }, [playlists, analysisStatusMap])

  // Track the currently analyzing playlist ID
  useEffect(() => {
    if (fetcher.state === 'submitting' && fetcher.submission) {
      const playlistId = fetcher.submission.get('playlistId');
      if (playlistId) {
        console.log(`Playlist ${playlistId} is now being analyzed`);
        analysisStore.setCurrentlyAnalyzing(playlistId.toString());
        analysisStore.setTrackStatus(playlistId.toString(), 'analyzing');
      }
    }
  }, [fetcher.state, fetcher.submission]);

  // Update analysis status when fetcher completes and process next playlist if needed
  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data) {
      const { success, playlistId, analysisId } = fetcher.data;
      if (playlistId) {
        console.log(`Playlist ${playlistId} analysis completed with success: ${success}`);
        analysisStore.setTrackStatus(playlistId.toString(), success ? 'analyzed' : 'error');
        
        // If successful, update hasAnalyzedPlaylists
        if (success) {
          setHasAnalyzedPlaylists(true);
        }

        // Check if there are more playlists to analyze
        const nextPlaylist = analysisStore.getNextTrackToAnalyze();
        if (nextPlaylist) {
          // Remove this playlist from the queue
          analysisStore.removeFromQueue(nextPlaylist.id);

          // Set as currently analyzing
          analysisStore.setCurrentlyAnalyzing(nextPlaylist.id);

          // Submit the next playlist for analysis
          const formData = new FormData();
          formData.append('action', 'analyze');
          formData.append('playlistId', nextPlaylist.id.toString());
          formData.append('playlistName', nextPlaylist.name);
          formData.append('playlistDescription', nextPlaylist.description || '');

          // Short timeout to ensure the UI updates before starting the next request
          setTimeout(() => {
            fetcher.submit(formData, { method: 'post' });
          }, 500);
        } else {
          // No more playlists to analyze
          analysisStore.setCurrentlyAnalyzing(null);
        }
      }
    }
  }, [fetcher.state, fetcher.data])

  // Function to start analysis for a single playlist
  const analyzePlaylist = (playlist: any) => {
    analysisStore.setCurrentlyAnalyzing(playlist.id.toString());
    analysisStore.setTrackStatus(playlist.id.toString(), 'analyzing');

    const formData = new FormData();
    formData.append('action', 'analyze');
    formData.append('playlistId', playlist.id.toString());
    formData.append('playlistName', playlist.name);
    formData.append('playlistDescription', playlist.description || '');

    fetcher.submit(formData, { method: 'post' });
  }

  // Function to start analysis for all playlists
  const analyzeAllPlaylists = () => {
    // Only analyze playlists that are in 'idle' or 'error' state
    const playlistsToAnalyze = playlists.filter(playlist => {
      const status = analysisStore.getTrackStatus(playlist.id.toString());
      return status === 'idle' || status === 'error';
    });

    if (playlistsToAnalyze.length === 0) return;

    // Process first playlist immediately
    const firstPlaylist = playlistsToAnalyze[0];
    analysisStore.setCurrentlyAnalyzing(firstPlaylist.id.toString());
    analysisStore.setTrackStatus(firstPlaylist.id.toString(), 'analyzing');

    // Queue the rest of the playlists
    if (playlistsToAnalyze.length > 1) {
      const remainingPlaylists = playlistsToAnalyze.slice(1).map(p => ({
        id: p.id.toString(),
        name: p.name,
        description: p.description || ''
      }));

      // Set all remaining playlists as queued
      remainingPlaylists.forEach(playlist => {
        analysisStore.setTrackStatus(playlist.id, 'queued');
      });

      // Store in the queue
      analysisStore.setQueuedTracks(remainingPlaylists);
    }

    // Submit the first playlist for analysis
    const formData = new FormData();
    formData.append('action', 'analyze');
    formData.append('playlistId', firstPlaylist.id.toString());
    formData.append('playlistName', firstPlaylist.name);
    formData.append('playlistDescription', firstPlaylist.description || '');

    fetcher.submit(formData, { method: 'post' });
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Flagged Playlist Analysis</h1>

      <div className="mb-6">
        <p className="mb-4">
          This page displays your flagged Spotify playlists that are candidates for sorting your tracks into.
          Analyze these playlists to help the system better understand their mood, themes, and context.
        </p>

        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-4">
            <Link
              to="/playlists"
              className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-3 rounded-full"
              aria-label="Back to Playlists"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
            </Link>
            
            <button
              onClick={analyzeAllPlaylists}
              className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded"
            >
              Analyze All Playlists
            </button>
          </div>
          
          <Link
            to="/matching"
            className={`py-2 px-4 rounded ${hasAnalyzedPlaylists 
              ? 'bg-purple-600 hover:bg-purple-700 text-white' 
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
            aria-disabled={!hasAnalyzedPlaylists}
            onClick={(e) => !hasAnalyzedPlaylists && e.preventDefault()}
          >
            Continue to Matching
          </Link>
        </div>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Playlist</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {playlists.length > 0 ? (
              playlists.map((playlist) => (
                <tr key={playlist.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{playlist.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500 truncate max-w-xs">
                      {playlist.description || 'No description'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${analysisStore.getTrackStatus(playlist.id.toString()) === 'analyzed' ? 'bg-green-100 text-green-800' :
                        analysisStore.getTrackStatus(playlist.id.toString()) === 'analyzing' ? 'bg-yellow-100 text-yellow-800' :
                          analysisStore.getTrackStatus(playlist.id.toString()) === 'queued' ? 'bg-blue-100 text-blue-800' :
                            analysisStore.getTrackStatus(playlist.id.toString()) === 'error' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'}`}>
                      {analysisStore.getTrackStatus(playlist.id.toString()) === 'analyzed' ? 'Analyzed' :
                        analysisStore.getTrackStatus(playlist.id.toString()) === 'analyzing' ? 'Analyzing...' :
                          analysisStore.getTrackStatus(playlist.id.toString()) === 'queued' ? 'Queued' :
                            analysisStore.getTrackStatus(playlist.id.toString()) === 'error' ? 'Error' : 'Not Analyzed'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {analysisStore.getTrackStatus(playlist.id.toString()) === 'error' && (
                      <button
                        onClick={() => analyzePlaylist(playlist)}
                        className="text-blue-600 hover:text-blue-900"
                        disabled={analysisStore.getTrackStatus(playlist.id.toString()) === 'analyzing'}
                      >
                        Analyze
                      </button>
                    )}
                    {/* Removed View Analysis button */}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                  No flagged playlists found. Please flag some playlists as candidates for sorting your tracks.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
