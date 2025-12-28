import type { OAuth2Tokens } from 'arctic'
import { OAuth2Strategy } from 'remix-auth-oauth2'

import { userService } from '~/lib/services/UserService'

// Spotify API response types
export interface SpotifyImage {
	url: string
	height: number | null
	width: number | null
}

export interface SpotifyProfileResponse {
	id: string
	display_name: string
	email: string
	country: string
	explicit_content: {
		filter_enabled: boolean
		filter_locked: boolean
	}
	external_urls: {
		spotify: string
	}
	followers: {
		href: string | null
		total: number
	}
	href: string
	images: SpotifyImage[]
	product: string
	type: string
	uri: string
}

// Session data structure (matches existing SpotifySession)
export type SpotifySession = {
	accessToken: string
	refreshToken: string
	expiresAt: number
	tokenType: string
	user: {
		id: string
		email: string
		name: string
		image?: string
	}
	appUser: {
		id: number
		hasSetupCompleted: boolean
	}
}

export interface SpotifyStrategyOptions {
	clientId: string
	clientSecret: string
	redirectURI: string
	scopes?: string[]
}

export class SpotifyStrategy extends OAuth2Strategy<SpotifySession> {
	public name = 'spotify'
	private userInfoURL = 'https://api.spotify.com/v1/me'

	constructor(
		options: SpotifyStrategyOptions,
		verify: (params: {
			request: Request
			tokens: OAuth2Tokens
			profile: SpotifyProfileResponse
		}) => Promise<SpotifySession>
	) {
		super(
			{
				clientId: options.clientId,
				clientSecret: options.clientSecret,
				redirectURI: options.redirectURI,
				authorizationEndpoint: 'https://accounts.spotify.com/authorize',
				tokenEndpoint: 'https://accounts.spotify.com/api/token',
				scopes: options.scopes || ['user-read-email'],
			},
			async ({ request, tokens }) => {
				// Fetch user profile from Spotify
				const profile = await this.fetchUserProfile(tokens.accessToken())

				// Call the verify callback with profile data
				return verify({ request, tokens, profile })
			}
		)
	}

	private async fetchUserProfile(accessToken: string): Promise<SpotifyProfileResponse> {
		const response = await fetch(this.userInfoURL, {
			headers: {
				Accept: 'application/json',
				Authorization: `Bearer ${accessToken}`,
			},
		})

		if (!response.ok) {
			throw new Error(`Failed to fetch Spotify profile: ${response.statusText}`)
		}

		return response.json()
	}
}

// Factory function to create the strategy with standard verify logic
export function createSpotifyStrategy(options: SpotifyStrategyOptions): SpotifyStrategy {
	return new SpotifyStrategy(options, async ({ tokens, profile }) => {
		// Get or create the user in our database
		const appUser = await userService.getOrCreateUser(profile.id, profile.email)

		// Calculate expiration time (arctic uses accessTokenExpiresInSeconds)
		const expiresInSeconds = tokens.accessTokenExpiresInSeconds()
		const expiresAt = Date.now() + expiresInSeconds * 1000

		return {
			accessToken: tokens.accessToken(),
			refreshToken: tokens.hasRefreshToken() ? tokens.refreshToken() : '',
			expiresAt,
			tokenType: tokens.tokenType() || 'Bearer',
			user: {
				id: profile.id,
				email: profile.email,
				name: profile.display_name,
				image: profile.images?.[0]?.url,
			},
			appUser: {
				id: appUser.id,
				hasSetupCompleted: appUser.has_setup_completed,
			},
		}
	})
}
