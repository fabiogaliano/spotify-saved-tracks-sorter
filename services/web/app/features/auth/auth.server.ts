import { Authenticator } from 'remix-auth'

import { type SpotifySession, createSpotifyStrategy } from './spotify-strategy'

// Re-export the type for use elsewhere
export type { SpotifySession } from './spotify-strategy'

// Session key constant - used for storing/retrieving session data
export const SESSION_KEY = 'spotify:session'

if (!process.env.SPOTIFY_CLIENT_ID) {
	throw new Error('Missing SPOTIFY_CLIENT_ID env')
}

if (!process.env.SPOTIFY_CLIENT_SECRET) {
	throw new Error('Missing SPOTIFY_CLIENT_SECRET env')
}

if (!process.env.SPOTIFY_CALLBACK_URL) {
	throw new Error('Missing SPOTIFY_CALLBACK_URL env')
}

const scopes = [
	'user-read-email',
	'user-read-private',
	'playlist-read-private',
	'playlist-modify-private',
	'playlist-modify-public',
	'user-library-read',
	'user-library-modify',
]

export const spotifyStrategy = createSpotifyStrategy({
	clientId: process.env.SPOTIFY_CLIENT_ID,
	clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
	redirectURI: process.env.SPOTIFY_CALLBACK_URL,
	scopes,
})

// remix-auth v4: Authenticator no longer takes sessionStorage
export const authenticator = new Authenticator<SpotifySession>()

authenticator.use(spotifyStrategy)
