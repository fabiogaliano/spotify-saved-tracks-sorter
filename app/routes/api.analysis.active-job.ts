import { LoaderFunctionArgs } from 'react-router';
import { requireUserSession } from '~/features/auth/auth.utils';
import { jobPersistenceService } from '~/lib/services/JobPersistenceService';

export async function loader({ request }: LoaderFunctionArgs) {
  const userSession = await requireUserSession(request);
  if (!userSession) {
    return Response.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const activeJob = await jobPersistenceService.getActiveJobForUser(userSession.userId);
    
    if (activeJob) {
      console.log('Active job trackStates before serialization:', activeJob.trackStates);
      console.log('Active job trackStates entries:', Array.from(activeJob.trackStates.entries()));
      
      // Convert trackStates Map to a plain object for JSON serialization
      const trackStatesObj = Object.fromEntries(activeJob.trackStates.entries());
      console.log('Serialized trackStates object:', trackStatesObj);
      
      const jobForSerialization = {
        ...activeJob,
        trackStates: trackStatesObj
      };
      return Response.json(jobForSerialization);
    } else {
      return Response.json(null);
    }
  } catch (error) {
    console.error('Error fetching active job:', error);
    return Response.json({ error: 'Failed to fetch active job' }, { status: 500 });
  }
}