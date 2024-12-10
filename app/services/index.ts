export { getSupabase, getOrCreateUser as getOrCreateUserDB } from './db';
export { LyricsScraper } from './analysis/lyrics-service';
export { authenticator, spotifyStrategy } from './auth.server';
export { initializeSpotifyApi, getSpotifyApi, clearSpotifyApi } from './spotify/spotify.server';
export { sessionStorage, getSession, commitSession, destroySession } from './session.server';
