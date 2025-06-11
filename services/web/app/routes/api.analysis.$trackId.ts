import { trackAnalysisRepository } from '~/lib/repositories/TrackAnalysisRepository';

export async function loader({ params }: { params: { trackId: string } }) {
  const trackId = parseInt(params.trackId, 10);
  
  if (isNaN(trackId)) {
    return new Response(JSON.stringify({ error: 'Invalid track ID' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // Fetch the analysis data for the track
    const analysis = await trackAnalysisRepository.getByTrackId(trackId);
    
    if (!analysis) {
      return new Response(JSON.stringify({ error: 'Analysis not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify(analysis), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error(`Error fetching analysis for track ${trackId}:`, error);
    return new Response(JSON.stringify({ error: 'Failed to fetch analysis' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
