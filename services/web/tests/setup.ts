import { SpotifyApi } from '@fostertheweb/spotify-web-sdk'
import { writeFileSync, readFileSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'

const FIXTURE_PATH = resolve(__dirname, '__fixtures__/spotify-playlists.json')
const TOKEN_PATH = resolve(__dirname, 'spotify.session.json')

interface TokenData {
	accessToken: string
	refreshToken: string
	expiresAt: number
	tokenType: string
}

function getTokenFromFile(): TokenData {
	try {
		const tokenData = JSON.parse(readFileSync(TOKEN_PATH, 'utf-8'))
		return tokenData
	} catch (error) {
		console.error('Failed to read token file:', error)
		throw error
	}
}

async function generateFixtures(spotifyApi: SpotifyApi) {
	try {
		console.log('Fetching real data from Spotify API...')
		// TODO: need to filter only user playlists
		const realResponse = await spotifyApi.currentUser.playlists.playlists(20, 0)

		const fixtureDir = dirname(FIXTURE_PATH)
		mkdirSync(fixtureDir, { recursive: true })

		writeFileSync(FIXTURE_PATH, JSON.stringify(realResponse, null, 2))
		console.log(`Fixtures written to ${FIXTURE_PATH}`)
		return realResponse
	} catch (error) {
		console.error('Failed to generate fixtures:', error)
		throw error
	}
}

if (require.main === module) {
	const tokenData = getTokenFromFile()
	const spotifyApi = SpotifyApi.withAccessToken(process.env.SPOTIFY_CLIENT_ID, {
		access_token: tokenData.accessToken,
		expires_in: Math.floor((tokenData.expiresAt - Date.now()) / 1000), // Convert ms to seconds
		token_type: tokenData.tokenType,
		refresh_token: tokenData.refreshToken,
	})

	const playlistTracks = await spotifyApi.playlists.getPlaylistItems(
		'1Mqs5HnL7NgCLd7JFhmMg6',
		'PT',
		'items(added_at,track(id,name,artists(name),album(name)))'
	)
	console.log('playlistTracks: ', playlistTracks)
	writeFileSync('./playlist_tracks_2016-mantra.json', JSON.stringify(playlistTracks))

	//generateFixtures(spotifyApi)
	//	.then(() => process.exit(0))
	//	.catch(() => process.exit(1))
}

export { generateFixtures, FIXTURE_PATH }
