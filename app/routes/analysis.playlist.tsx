import { Link, useLoaderData, useFetcher } from '@remix-run/react'
import { useEffect, useState } from 'react'
import type { LoaderFunctionArgs, ActionFunctionArgs } from '@remix-run/node'
import { json } from '@remix-run/node'
import { getSupabase } from '~/core/db/db'
import { playlistRepository } from '~/core/repositories/PlaylistRepository'
import fs from 'fs'
import path from 'path'
import { LlmProviderManager } from '~/core/services/llm/LlmProviderManager'

// Read the playlist analysis prompt
const promptPath = path.join(process.cwd(), 'matching-algorithm', 'prompts', 'playlist-analysis_prompt.txt')
const PLAYLIST_ANALYSIS_PROMPT = fs.readFileSync(promptPath, 'utf-8')

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    // Get all playlists from the database
    const playlists = await playlistRepository.getAllPlaylists()

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
      playlists: playlists || [],
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
        // Get the LLM provider manager
        const llmProviderManager = new LlmProviderManager()
        
        // Fill in the prompt template
        const filledPrompt = PLAYLIST_ANALYSIS_PROMPT
          .replace('{playlist_name}', playlistName.toString())
          .replace('{playlist_description}', playlistDescription.toString())
        
        // Generate the analysis
        const result = await llmProviderManager.generateText(filledPrompt)
        
        // Parse the result
        let analysisJson
        try {
          analysisJson = JSON.parse(result.text)
        } catch (parseError) {
          const jsonMatch = result.text.match(/```(?:json)?(\n|\r\n|\r)?(.*?)```/s)
          if (jsonMatch && jsonMatch[2]) {
            try {
              analysisJson = JSON.parse(jsonMatch[2].trim())
            } catch (extractError) {
              throw new Error('Failed to parse extracted content as JSON')
            }
          } else {
            throw new Error('Failed to parse analysis result as JSON - no JSON code block found')
          }
        }

        // Get the user ID (using a default value for now, should be replaced with actual user ID)
        const userId = 1 // Replace with actual user ID from session

        // Save the analysis to the database
        const { data: insertData, error: insertError } = await getSupabase()
          .from('playlist_analyses')
          .insert({
            playlist_id: Number(playlistId),
            analysis: analysisJson,
            model_name: llmProviderManager.getCurrentModel(),
            user_id: userId,
            version: 1
          })
          .select()

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
  const [analysisStatus, setAnalysisStatus] = useState<Record<number, 'idle' | 'analyzing' | 'analyzed' | 'error'>>({});
  const fetcher = useFetcher()

  // Initialize analysis status
  useEffect(() => {
    if (playlists && playlists.length > 0) {
      const initialStatus: Record<number, 'idle' | 'analyzing' | 'analyzed' | 'error'> = {}
      playlists.forEach(playlist => {
        if (analysisStatusMap[playlist.id]) {
          initialStatus[playlist.id] = 'analyzed'
        } else {
          initialStatus[playlist.id] = 'idle'
        }
      })
      setAnalysisStatus(initialStatus)
    }
  }, [playlists, analysisStatusMap])

  // Update analysis status when fetcher completes
  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data) {
      const { success, playlistId } = fetcher.data;
      if (playlistId) {
        setAnalysisStatus(prev => ({
          ...prev,
          [playlistId]: success ? 'analyzed' : 'error'
        }))
      }
    }
  }, [fetcher.state, fetcher.data])

  // Function to start analysis for a single playlist
  const analyzePlaylist = (playlist: any) => {
    setAnalysisStatus(prev => ({
      ...prev,
      [playlist.id]: 'analyzing'
    }))

    fetcher.submit(
      {
        action: 'analyze',
        playlistId: playlist.id.toString(),
        playlistName: playlist.name,
        playlistDescription: playlist.description || ''
      },
      { method: 'post' }
    )
  }

  // Function to start analysis for all playlists
  const analyzeAllPlaylists = () => {
    // Only analyze playlists that are in 'idle' or 'error' state
    const playlistsToAnalyze = playlists.filter(playlist => 
      analysisStatus[playlist.id] === 'idle' || analysisStatus[playlist.id] === 'error'
    )
    
    playlistsToAnalyze.forEach(playlist => {
      analyzePlaylist(playlist)
    })
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Playlist Analysis</h1>
      
      <div className="mb-6">
        <p className="mb-4">
          This page allows you to analyze your Spotify playlists.
          The analysis will help the system better understand the mood, themes, and context of each playlist.
        </p>
        
        <div className="flex space-x-4 mb-6">
          <button 
            onClick={analyzeAllPlaylists}
            className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded"
          >
            Analyze All Playlists
          </button>
          
          <Link 
            to="/playlists"
            className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded"
          >
            Back to Playlists
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
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
                      ${analysisStatus[playlist.id] === 'analyzed' ? 'bg-green-100 text-green-800' : 
                        analysisStatus[playlist.id] === 'analyzing' ? 'bg-yellow-100 text-yellow-800' : 
                        analysisStatus[playlist.id] === 'error' ? 'bg-red-100 text-red-800' : 
                        'bg-gray-100 text-gray-800'}`}>
                      {analysisStatus[playlist.id] === 'analyzed' ? 'Analyzed' : 
                       analysisStatus[playlist.id] === 'analyzing' ? 'Analyzing...' : 
                       analysisStatus[playlist.id] === 'error' ? 'Error' : 'Not Analyzed'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {analysisStatus[playlist.id] !== 'analyzing' && (
                      <button
                        onClick={() => analyzePlaylist(playlist)}
                        className={`text-blue-600 hover:text-blue-900 ${
                          analysisStatus[playlist.id] === 'analyzed' ? 'mr-2' : ''
                        }`}
                        disabled={analysisStatus[playlist.id] === 'analyzing'}
                      >
                        {analysisStatus[playlist.id] === 'analyzed' ? 'Re-analyze' : 'Analyze'}
                      </button>
                    )}
                    
                    {analysisStatus[playlist.id] === 'analyzing' && (
                      <span className="text-yellow-500">Processing...</span>
                    )}
                    
                    {analysisStatus[playlist.id] === 'analyzed' && (
                      <Link
                        to={`/analysis/view-playlist/${analysisStatusMap[playlist.id].analysisId}`}
                        className="text-green-600 hover:text-green-900 ml-2"
                      >
                        View Analysis
                      </Link>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                  No playlists found. Please sync your Spotify playlists first.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
