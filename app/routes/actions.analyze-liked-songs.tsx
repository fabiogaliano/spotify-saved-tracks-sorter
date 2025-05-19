/**
 * Action endpoint for submitting track analysis jobs
 */

import { ActionFunctionArgs } from 'react-router';
import { requireUserSession } from '~/features/auth/auth.utils';
import { getAnalysisJobService } from '~/lib/services';

// Define the expected request payload
interface AnalyzeTracksRequest {
  trackIds: number[];
}

/**
 * Action function to handle track analysis job submission
 */
export async function action({ request }: ActionFunctionArgs) {
  // Ensure user is authenticated
  const userSession = await requireUserSession(request);
  if (!userSession) {
    return Response.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    // Parse request body
    const body = await request.json() as AnalyzeTracksRequest;

    if (!body.trackIds || !Array.isArray(body.trackIds) || body.trackIds.length === 0) {
      return Response.json({ error: 'No track IDs provided' }, { status: 400 });
    }

    // Get the analysis job service
    const analysisJobService = getAnalysisJobService();

    // Create a new analysis job
    const jobId = await analysisJobService.createJob(userSession.userId, body.trackIds);

    // Return the job ID to the client
    return Response.json({ success: true, jobId });
  } catch (error) {
    console.error('Error creating analysis job:', error);
    return Response.json(
      {
        error: 'Failed to create analysis job',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
