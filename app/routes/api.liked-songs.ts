import { LoaderFunctionArgs } from 'react-router';
import { requireUserSession } from '~/features/auth/auth.utils';
import { trackService } from '~/lib/services/TrackService';

export async function loader({ request }: LoaderFunctionArgs) {
  const userSession = await requireUserSession(request);
  if (!userSession) {
    return Response.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const likedSongs = await trackService.getUserTracksWithAnalysis(userSession.userId);
    return Response.json(likedSongs);
  } catch (error) {
    console.error('Error fetching liked songs:', error);
    return Response.json({ error: 'Failed to fetch liked songs' }, { status: 500 });
  }
}