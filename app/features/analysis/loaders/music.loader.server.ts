import { LoaderFunctionArgs, json } from '@remix-run/node'
import { trackAnalysisRepository } from '~/lib/repositories/TrackAnalysisRepository'
import type { AnalysisStatus } from '~/types/analysis'

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const trackAnalyses = await trackAnalysisRepository.getAllAnalyses()

    const analysisStatusMap: Record<number, AnalysisStatus> = trackAnalyses.reduce((acc, analysis) => {
      acc[analysis.track_id] = {
        analyzed: true,
        analysisId: analysis.id,
      }
      return acc
    }, {} as Record<number, AnalysisStatus>)

    return json({
      analysisStatusMap,
    })
  } catch (error) {
    console.error('Error loading track analyses:', error)
    return json({
      analysisStatusMap: {} as Record<number, AnalysisStatus>,
    })
  }
} 