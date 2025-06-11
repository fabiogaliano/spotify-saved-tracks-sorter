import { LoaderFunctionArgs } from 'react-router';
import { requireUserSession, createResponseWithUpdatedSession } from '~/features/auth/auth.utils';
import { jobPersistenceService } from '~/lib/services/JobPersistenceService';

export async function loader({ request }: LoaderFunctionArgs) {
  const sessionData = await requireUserSession(request);
  if (!sessionData) {
    return Response.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const activeJob = await jobPersistenceService.getActiveJobForUser(sessionData.userId);
    
    if (activeJob) {
      // Convert trackStates Map to a plain object for JSON serialization
      const trackStatesObj = Object.fromEntries(activeJob.trackStates.entries());
      
      const jobForSerialization = {
        ...activeJob,
        trackStates: trackStatesObj
      };
      return createResponseWithUpdatedSession(jobForSerialization, sessionData);
    } else {
      return createResponseWithUpdatedSession(null, sessionData);
    }
  } catch (error) {
    console.error('Error fetching active job:', error);
    return Response.json({ error: 'Failed to fetch active job' }, { status: 500 });
  }
}