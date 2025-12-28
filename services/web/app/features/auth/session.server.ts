// session.server.ts
import { createCookieSessionStorage } from 'react-router'

if (!process.env.SESSION_SECRET) {
	throw new Error('SESSION_SECRET environment variable is not set!')
}

// This sessionStorage is used by remix-auth-spotify
// We keep this as a separate export
export const sessionStorage = createCookieSessionStorage({
	cookie: {
		name: '_session',
		sameSite: 'lax',
		path: '/',
		httpOnly: true,
		secrets: [process.env.SESSION_SECRET],
		secure: process.env.NODE_ENV === 'production',
		maxAge: 60 * 60 * 24 * 7, // 1 week
	},
})

// Export these basic session functions that remix-auth will use
export const { getSession, commitSession, destroySession } = sessionStorage

// NOTE: The following functions are no longer needed since we're storing
// all user data in the Spotify authentication session.
// We've removed:
// - createUserSession
// - getUserSession
// - clearUserSession
