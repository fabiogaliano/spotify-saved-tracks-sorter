import { ActionFunctionArgs } from 'react-router';
import { songAnalysisService } from '~/lib/services'
import { trackAnalysisRepository } from '~/lib/repositories/TrackAnalysisRepository'

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData()
  const action = formData.get('action')

  if (action === 'analyze') {
    const trackId = formData.get('trackId')
    const spotifyTrackId = formData.get('spotifyTrackId')
    const artist = formData.get('artist')
    const name = formData.get('name')

    if (!trackId || !spotifyTrackId || !artist || !name) {
      return { success: false, error: 'Missing required track information', status: 400 }
    }

    try {
      const existingAnalysis = await trackAnalysisRepository.getByTrackId(Number(trackId))

      if (existingAnalysis) {
        return { success: true, trackId, analysisId: existingAnalysis.id, alreadyAnalyzed: true }
      }

      try {
        const { model, analysisJson } = JSON.parse(
          await songAnalysisService.analyzeSong(artist.toString(), name.toString())
        )

        const newAnalysis = await trackAnalysisRepository.insertAnalysis({
          track_id: Number(trackId),
          analysis: analysisJson,
          model_name: model,
          version: 1,
        })

        return { success: true, trackId, analysisId: newAnalysis.id }
      } catch (analysisError) {
        console.error('Error during track analysis:', analysisError)
        return {
          success: false,
          error: 'Failed to analyze track',
          trackId,
          details: analysisError instanceof Error ? analysisError.message : String(analysisError),
          status: 500
        }
      }
    } catch (dbError) {
      console.error('Database error during analysis:', dbError)
      return {
        success: false,
        error: 'Database error',
        trackId,
        details: dbError instanceof Error ? dbError.message : String(dbError),
        status: 500
      }
    }
  }

  return { success: false, error: 'Unknown action', status: 400 }
} 