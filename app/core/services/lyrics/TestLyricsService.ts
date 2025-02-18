import { writeFileSync } from 'fs'
import { DefaultLyricsService } from './LyricsService'

const TOKEN = process.env.GENIUS_CLIENT_TOKEN || 'Token provided'
console.log('Using access token:', TOKEN)

async function testLyricsService() {
	const service = new DefaultLyricsService({
		accessToken: TOKEN,
	})

	const testCases = [{ artist: 'Taylor Swift', song: 'closure' }]

	for (const { artist, song } of testCases) {
		try {
			console.log(`Fetching lyrics for ${artist} - ${song}...`)
			const lyrics = await service.getLyrics(artist, song)

			const outputFile = `${artist.replace(/[^a-zA-Z0-9]/g, '')}-${song.replace(
				/[^a-zA-Z0-9]/g,
				''
			)}.json`
			writeFileSync(outputFile, JSON.stringify(lyrics, null, 2))
			console.log(`✅ Saved lyrics to ${outputFile}`)
		} catch (error) {
			console.error(`❌ Error fetching lyrics for ${artist} - ${song}:`, error)
		}
	}
}

testLyricsService().catch(console.error)
