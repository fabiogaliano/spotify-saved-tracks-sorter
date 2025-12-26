import { ActionFunctionArgs } from 'react-router';
import { trackAnalysisRepository } from "~/lib/repositories/TrackAnalysisRepository";
import { sqsService, AnalysisJobPayload } from "~/lib/services/queue/SQSService";
import { requireUserSession } from '~/features/auth/auth.utils';

export const action = async ({ request }: ActionFunctionArgs) => {
  const userSession = await requireUserSession(request);
  if (!userSession) {
    return { success: false, error: 'Authentication required', status: 401 };
  }

  const formData = await request.formData();
  const formAction = formData.get('action');

  if (formAction === 'analyze') {
    const trackId = formData.get('trackId') as string;
    const artist = formData.get('artist') as string;
    const name = formData.get('name') as string;

    if (!trackId || !artist || !name) {
      return { success: false, error: 'Missing required track information', status: 400 };
    }

    try {
      const existingAnalysis = await trackAnalysisRepository.getByTrackId(Number(trackId));

      if (existingAnalysis) {
        return { success: true, trackId, analysisId: existingAnalysis.id, alreadyAnalyzed: true };
      }

      const jobPayload: Omit<AnalysisJobPayload, 'batchId'> = {
        type: 'track',
        trackId,
        artist,
        title: name,
        userId: userSession.userId,
      };

      await sqsService.enqueueAnalysisJob(jobPayload);
      console.log(`Enqueued analysis for trackId: ${trackId}`);
      return { success: true, trackId, queued: true };

    } catch (error) {
      console.error('Error in analysis action:', error);
      return {
        success: false,
        error: 'Failed to process analysis request.',
        status: 500,
      };
    }
  }

  return { success: false, error: 'Unknown action', status: 400 }
} 