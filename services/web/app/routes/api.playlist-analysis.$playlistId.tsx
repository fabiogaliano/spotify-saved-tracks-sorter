import type { LoaderFunctionArgs } from 'react-router';
import { requireUserSession } from '~/features/auth/auth.utils';
import { playlistAnalysisService } from '~/lib/services/PlaylistAnalysisService';
import { logger } from '~/lib/logging/Logger';

export async function loader({ request, params }: LoaderFunctionArgs) {
  const userSession = await requireUserSession(request);
  if (!userSession) {
    return Response.json({ error: 'Authentication required' }, { status: 401 });
  }

  const playlistId = params.playlistId;
  if (!playlistId) {
    return Response.json({ error: 'Playlist ID is required' }, { status: 400 });
  }

  try {
    const numericPlaylistId = parseInt(playlistId);
    if (isNaN(numericPlaylistId)) {
      return Response.json({ error: 'Invalid playlist ID' }, { status: 400 });
    }

    const analysis = await playlistAnalysisService.getAnalysis(numericPlaylistId);
    
    if (!analysis) {
      return Response.json({ error: 'Analysis not found' }, { status: 404 });
    }

    return Response.json({
      success: true,
      analysis: analysis.analysis,
      modelName: analysis.model_name,
      createdAt: analysis.created_at
    });
  } catch (error) {
    logger.error('Error fetching playlist analysis:', error);
    return Response.json(
      { error: 'Failed to fetch playlist analysis' },
      { status: 500 }
    );
  }
}