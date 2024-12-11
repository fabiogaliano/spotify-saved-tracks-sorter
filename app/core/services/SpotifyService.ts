import { getSpotifyApi } from '~/core/api/spotify.api'
import type { SpotifyTrackDTO } from '~/core/domain/Track'
import type { SpotifyPlaylistDTO } from '~/core/domain/Playlist'
import { SpotifyApiError } from  '~/core/errors/ApiError'
import { logger } from '~/core/logging/Logger'
import { MaxInt } from '@fostertheweb/spotify-web-sdk'

export class SpotifyService {
  async getLikedTracks(): Promise<SpotifyTrackDTO[]> {
    const LIMIT: MaxInt<50> = 50;
    let offset = 0;
    const allTracks: SpotifyTrackDTO[] = [];
    let shouldContinue = true;

    try {
      logger.info('fetch liked tracks');
      const spotifyApi = getSpotifyApi();

      while (shouldContinue) {
        const response = await this.fetchWithRetry(() => spotifyApi.currentUser.tracks.savedTracks(LIMIT, offset));
        allTracks.push(...response.items as SpotifyTrackDTO[]);

        if (response.items.length < LIMIT) {
          shouldContinue = false;
        }
        offset += LIMIT;
      }

      logger.debug('liked tracks fetched', { count: allTracks.length });
      return allTracks;
    } catch (error) {
      logger.error('fetch liked tracks failed', error as Error);
      throw new SpotifyApiError('Failed to fetch liked tracks', 500, { error });
    }
  }

  async getPlaylists(): Promise<SpotifyPlaylistDTO[]> {
    const LIMIT: MaxInt<50> = 50;
    let offset = 0;
    const allPlaylists: SpotifyPlaylistDTO[] = [];
    let shouldContinue = true;

    try {
      logger.info('fetch playlists');
      const spotifyApi = getSpotifyApi();
      const currentUser = await this.fetchWithRetry(() => spotifyApi.currentUser.profile());

      while (shouldContinue) {
        const playlists = await this.fetchWithRetry(() => spotifyApi.playlists.getUsersPlaylists(currentUser.id, LIMIT, offset));
        const filteredPlaylists = playlists.items.filter(p => 
          p.owner.id === currentUser.id && 
          p.description?.toLowerCase().startsWith('ai:')
        );

        allPlaylists.push(...filteredPlaylists);

        if (playlists.items.length < LIMIT) {
          shouldContinue = false;
        }
        offset += LIMIT;
      }

      logger.debug('playlists fetched', { 
        totalPlaylists: allPlaylists.length,
        userId: currentUser.id 
      });

      return allPlaylists;
    } catch (error) {
      logger.error('fetch playlists failed', error as Error);
      throw new SpotifyApiError('Failed to fetch playlists', 500, { error });
    }
  }

  private async fetchWithRetry<T>(fetchFunction: () => Promise<T>, maxRetries: number = 3): Promise<T> {
    let attempt = 0;

    while (attempt <= maxRetries) {
      try {
        return await fetchFunction();
      } catch (error: any) {
        if (error.status === 429) {
          const retryAfter = parseInt(error.headers.get('Retry-After') || '1', 10);
          console.warn(`Rate limited. Retrying after ${retryAfter} seconds... (Attempt ${attempt + 1}/${maxRetries})`);
          await this.sleep(retryAfter * 1000);
          attempt++;
        } else {
          throw error;
        }
      }
    }

    throw new Error('Maximum retry attempts reached. Unable to complete the request.');
  }

  private sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
