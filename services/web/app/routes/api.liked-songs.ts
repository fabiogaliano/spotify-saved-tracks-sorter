import { LoaderFunctionArgs } from 'react-router';
import { getUserSession, createResponseWithUpdatedSession } from '~/features/auth/auth.utils';
import { trackService } from '~/lib/services/TrackService';

export async function loader({ request }: LoaderFunctionArgs) {
  const sessionData = await getUserSession(request);
  if (!sessionData) {
    return Response.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const likedSongs = await trackService.getUserTracksWithAnalysis(sessionData.userId);
    return createResponseWithUpdatedSession(likedSongs, sessionData);
  } catch (error) {
    console.error('Error fetching liked songs:', error);
    return Response.json({ error: 'Failed to fetch liked songs' }, { status: 500 });
  }
}
