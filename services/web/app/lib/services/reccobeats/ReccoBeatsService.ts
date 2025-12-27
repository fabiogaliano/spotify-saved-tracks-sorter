import { logger } from '~/lib/logging/Logger'
import { ConcurrencyLimiter } from '~/lib/utils/concurrency'

/**
 * ReccoBeats API types
 */
export interface ReccoBeatsTrack {
  id: string
  trackTitle: string
  artists: Array<{
    id: string
    name: string
    href: string
  }>
  durationMs: number
  isrc?: string
  href: string
  popularity: number
}

export interface ReccoBeatsAudioFeatures {
  id: string
  acousticness: number    // 0.0-1.0
  danceability: number    // 0.0-1.0
  energy: number          // 0.0-1.0
  instrumentalness: number // 0.0-1.0
  liveness: number        // 0.0-1.0
  loudness: number        // typically -60 to 0 dB
  speechiness: number     // 0.0-1.0
  tempo: number           // BPM
  valence: number         // 0.0-1.0 (musical positivity)
}

export interface ReccoBeatsError {
  timestamp: string
  error: string
  path: string
  status: number
}

export interface ReccoBeatsValidationError {
  status: 4004
  errors: Array<{
    path: string
    message: string
  }>
}

/**
 * Service for interacting with ReccoBeats API
 * Handles rate limiting and provides audio features for matching
 * No authentication required - public API
 */
export class ReccoBeatsService {
  private readonly baseUrl = 'https://api.reccobeats.com/v1'
  private readonly headers: HeadersInit
  // Limit to 5 concurrent requests with 50ms minimum interval between starts
  private readonly limiter = new ConcurrencyLimiter(5, 50)

  constructor() {
    this.headers = {
      'Content-Type': 'application/json'
    }
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      let errorBody: unknown = null
      try {
        errorBody = await response.json()
      } catch {
        errorBody = await response.text().catch(() => null)
      }

      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After')
        throw new Error(`Rate limit exceeded. Retry after ${retryAfter || 'unknown'} seconds`)
      }

      throw new Error(`ReccoBeats API error: ${typeof errorBody === 'object' ? JSON.stringify(errorBody) : errorBody || response.statusText}`)
    }

    return response.json()
  }

  private async getReccoBeatsId(spotifyTrackId: string): Promise<string | null> {
    try {
      return await this.limiter.run(async () => {
        const response = await fetch(
          `${this.baseUrl}/track?ids=${spotifyTrackId}`,
          {
            method: 'GET',
            headers: this.headers
          }
        )

        const result = await this.handleResponse<{ content: ReccoBeatsTrack[] }>(response)

        if (result.content && result.content.length > 0) {
          return result.content[0].id
        }

        return null
      })
    } catch (error) {
      logger.error('Failed to get ReccoBeats ID', {
        spotifyTrackId,
        error: error instanceof Error ? error.message : String(error)
      })
      return null
    }
  }

  async getAudioFeatures(spotifyTrackId: string): Promise<ReccoBeatsAudioFeatures | null> {
    const results = await this.getAudioFeaturesBatch([spotifyTrackId]);
    return results.get(spotifyTrackId) || null;
  }

  async getAudioFeaturesBatch(spotifyTrackIds: string[]): Promise<Map<string, ReccoBeatsAudioFeatures>> {
    const results = new Map<string, ReccoBeatsAudioFeatures>();
    const failedIds: string[] = [];

    // Process all tracks with concurrency limiting
    const promises = spotifyTrackIds.map(async (spotifyTrackId) => {
      try {
        // getReccoBeatsId already uses the limiter
        const reccoBeatsId = await this.getReccoBeatsId(spotifyTrackId);
        if (!reccoBeatsId) {
          throw new Error('No ReccoBeats ID found');
        }

        // Wrap the audio-features fetch in the limiter
        const features = await this.limiter.run(async () => {
          const response = await fetch(
            `${this.baseUrl}/track/${reccoBeatsId}/audio-features`,
            { method: 'GET', headers: this.headers }
          );
          return this.handleResponse<ReccoBeatsAudioFeatures>(response);
        });

        return { spotifyTrackId, features };
      } catch (error) {
        failedIds.push(spotifyTrackId);
        return null;
      }
    });

    // Wait for all promises to settle
    const settledResults = await Promise.allSettled(promises);
    
    // Process successful results
    for (const result of settledResults) {
      if (result.status === 'fulfilled' && result.value) {
        results.set(result.value.spotifyTrackId, result.value.features);
      }
    }

    // Log summary
    if (failedIds.length > 0) {
      logger.warn(`Failed to process ${failedIds.length} tracks`, {
        sampleFailedIds: failedIds.slice(0, 5),
        totalFailed: failedIds.length
      });
    }

    logger.debug('Audio features fetch completed', {
      requested: spotifyTrackIds.length,
      succeeded: results.size,
      failed: failedIds.length,
      successRate: `${((results.size / spotifyTrackIds.length) * 100).toFixed(1)}%`
    });

    return results;
  }

  async getTrack(spotifyTrackId: string): Promise<ReccoBeatsTrack | null> {
    try {
      return await this.limiter.run(async () => {
        const response = await fetch(
          `${this.baseUrl}/track?ids=${spotifyTrackId}`,
          {
            method: 'GET',
            headers: this.headers
          }
        )

        const result = await this.handleResponse<{ content: ReccoBeatsTrack[] }>(response)
        return result.content?.[0] || null
      })
    } catch (error) {
      logger.error('Failed to get track info', {
        spotifyTrackId,
        error: error instanceof Error ? error.message : String(error)
      })
      return null
    }
  }
}

/**
 * Factory function to create ReccoBeats service
 * No API key needed - public API
 */
export function createReccoBeatsService(): ReccoBeatsService {
  try {
    return new ReccoBeatsService()
  } catch (error) {
    logger.error('Failed to create ReccoBeats service', {
      error: error instanceof Error ? error.message : String(error)
    })
    // Return a new instance anyway as there's no authentication to fail
    return new ReccoBeatsService()
  }
}