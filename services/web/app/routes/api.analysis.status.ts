import { trackAnalysisRepository } from '~/lib/repositories/TrackAnalysisRepository';
import { trackAnalysisAttemptsRepository } from '~/lib/repositories/TrackAnalysisAttemptsRepository';

// Types for analysis status API responses
export interface BaseAnalysisStatusResponse {
  trackId: number;
}

export interface AnalyzedStatusResponse extends BaseAnalysisStatusResponse {
  status: 'analyzed';
}

export interface FailedStatusResponse extends BaseAnalysisStatusResponse {
  status: 'failed';
  error: string;
  errorType: string;
  attemptId: number;
}

export interface PendingStatusResponse extends BaseAnalysisStatusResponse {
  status: 'pending';
  attemptId?: number;
}

export interface ErrorStatusResponse {
  error: string;
  status: 'unknown';
  trackId: number;
}

export type AnalysisStatusResponse =
  | AnalyzedStatusResponse
  | FailedStatusResponse
  | PendingStatusResponse;

// In-memory cache with TTL and size limits
const createCache = <T>() => {
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  const MAX_CACHE_SIZE = 1000;
  const cache = new Map<number, { value: T; timestamp: number }>();

  return {
    get(key: number): T | null {
      const entry = cache.get(key);
      if (!entry) return null;

      // Check if entry is expired
      if (Date.now() - entry.timestamp > CACHE_TTL) {
        cache.delete(key);
        return null;
      }

      return entry.value;
    },

    set(key: number, value: T) {
      // Remove oldest entry if we've reached max size
      if (cache.size >= MAX_CACHE_SIZE) {
        const firstKey = cache.keys().next().value;
        if (firstKey !== undefined) {
          cache.delete(firstKey);
        }
      }

      cache.set(key, {
        value,
        timestamp: Date.now()
      });
    },

    delete(key: number) {
      cache.delete(key);
    },

    clear() {
      cache.clear();
    }
  };
};

// Cache for analysis statuses
const analysisStatusCache = createCache<'analyzed' | 'failed'>();

export async function loader({ request }: { request: Request }) {
  const url = new URL(request.url);
  const trackId = url.searchParams.get('trackId');

  if (!trackId) {
    const errorResponse: ErrorStatusResponse = {
      error: 'trackId is required',
      status: 'unknown',
      trackId: 0
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const trackIdNum = parseInt(trackId, 10);

  // Check in-memory cache first for better performance
  const cachedStatus = analysisStatusCache.get(trackIdNum);
  if (cachedStatus) {
    const response: AnalysisStatusResponse = cachedStatus === 'analyzed'
      ? { status: 'analyzed', trackId: trackIdNum }
      : { status: 'failed', trackId: trackIdNum, error: 'Unknown error', errorType: 'UNKNOWN', attemptId: 0 };

    return new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // If not in cache, check the database
  try {
    // First check for failed attempts in track_analysis_attempts
    const latestAttempt = await trackAnalysisAttemptsRepository.getLatestAttemptForTrack(trackIdNum);

    if (latestAttempt) {
      // If the attempt is failed, return failed status with error details
      if (latestAttempt.status === 'FAILED') {
        // Cache the failed status with TTL
        analysisStatusCache.set(trackIdNum, 'failed');

        const failedResponse: FailedStatusResponse = {
          status: 'failed',
          trackId: trackIdNum,
          error: latestAttempt.error_message || 'Analysis failed',
          errorType: latestAttempt.error_type || 'UNKNOWN',
          attemptId: latestAttempt.id
        };

        return new Response(JSON.stringify(failedResponse), {
          headers: { 'Content-Type': 'application/json' }
        });
      } else {
        // Any other status (processing, pending, etc.) means it's still in progress
        const pendingResponse: PendingStatusResponse = {
          status: 'pending',
          trackId: trackIdNum,
          attemptId: latestAttempt.id
        };

        return new Response(JSON.stringify(pendingResponse), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // If no attempt found or not failed, check track_analyses for successful analyses
    const analysis = await trackAnalysisRepository.getByTrackId(trackIdNum);

    if (analysis) {
      // If we found an analysis, it's a successful one (failures are now only in track_analysis_attempts)
      analysisStatusCache.set(trackIdNum, 'analyzed');

      const analyzedResponse: AnalyzedStatusResponse = {
        status: 'analyzed',
        trackId: trackIdNum
      };

      return new Response(JSON.stringify(analyzedResponse), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // No analysis or attempt found
    const pendingResponse: PendingStatusResponse = {
      status: 'pending',
      trackId: trackIdNum
    };

    return new Response(JSON.stringify(pendingResponse), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error checking analysis status:', error);
    const errorResponse: ErrorStatusResponse = {
      error: 'Failed to check analysis status',
      status: 'unknown',
      trackId: trackIdNum
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
