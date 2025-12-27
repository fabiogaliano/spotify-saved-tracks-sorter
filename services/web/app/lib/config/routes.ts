/**
 * Centralized configuration for all API routes in the application.
 * This helps maintain consistency and makes it easier to update routes.
 */

const API = '/api';
const ACTIONS = '/actions';

/**
 * Get the WebSocket URL for real-time connections.
 * Derives from current origin with protocol switching (http->ws, https->wss).
 * Falls back to localhost:3001 for SSR/non-browser contexts.
 */
export function getWebSocketUrl(path: string = '/ws'): string {
  if (typeof window === 'undefined') {
    // SSR fallback - will be replaced on client hydration
    return `ws://localhost:3001${path}`;
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.hostname;
  // Use port 3001 for WebSocket server in development, same port in production
  const port = window.location.port === '5173' ? '3001' : window.location.port;
  const portSuffix = port ? `:${port}` : '';

  return `${protocol}//${host}${portSuffix}${path}`;
}

export const apiRoutes = {
  auth: {
    spotify: {
      login: '/auth/spotify',
      callback: '/auth/spotify/callback',
      logout: '/auth/logout',
    },
  },

  user: {
    preferences: `${API}/user-preferences`,
    updatePreferences: `${ACTIONS}/update-preferences`,
  },

  llmProvider: {
    base: `${API}/llm-provider`,
    validate: `${API}/provider-keys/validate`,
    statuses: `${API}/provider-keys/statuses`,
  },

  likedSongs: {
    base: `${API}/liked-songs`,
    sync: `${ACTIONS}/sync-liked-songs`,
    analyze: `${ACTIONS}/track-analysis`,
  },


  playlists: {
    base: `${API}/playlists`,
    create: `${ACTIONS}/create-ai-playlist`,
    sync: `${ACTIONS}/sync-playlists`,
    syncTracks: `${ACTIONS}/sync-playlist-tracks`,
    loadTracks: `${ACTIONS}/load-playlist-tracks`,
    updateDescription: `${ACTIONS}/update-playlist-description`,
    addTrack: `${API}/playlist/add-track`,
    analysis: (playlistId: string) => `${API}/playlist-analysis/${playlistId}`,
    image: (playlistId: string) => `${API}/playlist-image/${playlistId}`,
  },

  matching: {
    base: `${API}/matching`,
    data: (userId: string) => `${API}/matching-data/${userId}`,
  },

  analysis: {
    activeJob: `${API}/analysis/active-job`,
    status: `${API}/analysis/status`,
    track: (trackId: string) => `${API}/analysis/${trackId}`,
    batch: `${API}/analysis/batch`,
  },


  // Config routes
  config: {
    base: '/config',

  },

  // Test routes
  test: {
    services: `${API}/test-services`,
  },
} as const;

/**
 * Helper function to get the full URL for an API endpoint
 * @param path The API path (can be a string or a function that returns a string)
 * @param params Optional parameters for dynamic routes
 */
export function getApiUrl<T extends any[]>(path: string | ((...args: T) => string), ...params: T): string {
  return typeof path === 'function' ? path(...params) : path;
}

/**
 * Creates a fetcher function that includes authentication headers
 * @param request The request object from the loader/action
 */
export function createAuthenticatedFetcher(request?: Request) {
  return async (url: string, init?: RequestInit) => {
    const headers = new Headers(init?.headers);

    // Add any auth headers from the request
    if (request) {
      const cookie = request.headers.get('Cookie');
      if (cookie) {
        headers.set('Cookie', cookie);
      }
    }

    const response = await fetch(url, {
      ...init,
      headers,
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    // Handle empty responses (204 No Content, 304 Not Modified)
    if (response.status === 204 || response.status === 304) {
      return null;
    }

    // Check content-type before parsing as JSON
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      return response.json();
    }

    // Return text for non-JSON responses, or null if empty
    const text = await response.text();
    return text || null;
  };
}
