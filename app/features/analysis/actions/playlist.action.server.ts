import { ActionFunctionArgs, json } from '@remix-run/node'
import { getSupabase } from '~/lib/db/db'
import { playlistRepository } from '~/lib/repositories/PlaylistRepository'
import { llmProviderManager } from '~/lib/services'

// Define a more specific type for playlist tracks that matches database return
interface DbPlaylistTrack {
  track_id: number;
  spotify_track_id: string;
  name: string;
  artist: string;
  [key: string]: any;
}

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData()
  const action = formData.get('action')

  if (action === 'analyze') {
    const playlistId = formData.get('playlistId')
    const playlistName = formData.get('playlistName')
    const playlistDescription = formData.get('playlistDescription') || ''
    const promptTemplate = formData.get('prompt') || 'Analyze this playlist: {playlist_name}'

    if (!playlistId || !playlistName) {
      return json({ success: false, error: 'Missing required playlist information' }, { status: 400 })
    }

    try {
      // First check if analysis already exists
      const { data, error } = await getSupabase()
        .from('playlist_analyses')
        .select('id')
        .eq('playlist_id', Number(playlistId))
        .limit(1)

      if (error) {
        console.error('Error checking existing analysis:', error)
        return json({
          success: false,
          playlistId,
          error: 'Database error when checking existing analysis',
          details: error.message
        }, { status: 500 })
      }

      if (data && data.length > 0) {
        // Analysis already exists
        return json({
          success: true,
          playlistId,
          analysisId: data[0].id,
          alreadyAnalyzed: true
        })
      }

      // Get the tracks in the playlist
      const playlistTracks = await playlistRepository.getPlaylistTracks(Number(playlistId))

      // Format tracks for the prompt
      const tracksFormatted = (playlistTracks as DbPlaylistTrack[])
        .filter(track => track.name && track.artist)
        .map(track => `"${track.name}" by ${track.artist}`)
        .join('\n');

      // Fill in the prompt template
      const filledPrompt = promptTemplate.toString()
        .replace('{playlist_name}', playlistName.toString())
        .replace('{playlist_description}', playlistDescription.toString())
        .replace('{tracks}', tracksFormatted)

      console.log('Generating analysis for playlist:', playlistName)

      // Generate the analysis using the LLM provider
      const result = await llmProviderManager.getProvider().analyze()

      if (!result) {
        throw new Error('Failed to generate analysis: No response from LLM provider')
      }

      console.log('Analysis generation completed')

      // Parse the result
      let analysisJson = result.result

      // Get the current user ID - using 1 as default for now
      const userId = 1 // This should be replaced with actual user ID from session

      console.log('Saving playlist analysis to database:', {
        playlist_id: Number(playlistId),
        model_name: 'mock-model'
      })

      const { data: insertData, error: insertError } = await getSupabase()
        .from('playlist_analyses')
        .insert({
          playlist_id: Number(playlistId),
          analysis: analysisJson,
          model_name: 'mock-model',
          user_id: userId,
          version: 1,
          created_at: new Date().toISOString()
        })
        .select('id')

      if (insertError) {
        console.error('Error inserting analysis:', insertError)
        return json({
          success: false,
          playlistId,
          error: 'Failed to save analysis to database',
          details: insertError.message
        }, { status: 500 })
      }

      return json({
        success: true,
        playlistId,
        analysisId: insertData[0].id
      })

    } catch (error: any) {
      console.error('Error in playlist analysis:', error)
      return json({
        success: false,
        playlistId,
        error: 'Error analyzing playlist',
        details: error.message || String(error)
      }, { status: 500 })
    }
  }

  return json({
    success: false,
    error: 'Invalid action'
  }, { status: 400 })
} 