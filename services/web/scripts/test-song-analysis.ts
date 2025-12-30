/**
 * Test script for Song Analysis Pipeline
 * Fetches lyrics from Genius, audio features from ReccoBeats,
 * and outputs the complete JSON prompt that would be sent to the LLM
 *
 * Usage: bun run scripts/test-song-analysis.ts [artist] [song] [spotifyTrackId?]
 * Examples:
 *   bun run scripts/test-song-analysis.ts "Olivia Dean" "Man I Need"
 *   bun run scripts/test-song-analysis.ts "Kendrick Lamar" "HUMBLE."
 *   bun run scripts/test-song-analysis.ts "The Weeknd" "Blinding Lights" "0VjIjW4GlUZAMYd2vXMi3b"
 */
import { config } from 'dotenv'
import { resolve } from 'path'

import { buildAnalysisPrompt } from '../app/lib/services/analysis/SongAnalysisService'
import { DefaultLyricsService } from '../app/lib/services/lyrics/LyricsService'
import type { ReccoBeatsAudioFeatures } from '../app/lib/services/reccobeats/ReccoBeatsService'

// Load .env from app/v0/.env (scripts/ -> web/ -> services/ -> v0/)
config({ path: resolve(__dirname, '../../../.env') })

const GENIUS_TOKEN = process.env.GENIUS_CLIENT_TOKEN

if (!GENIUS_TOKEN) {
	console.error('Missing GENIUS_CLIENT_TOKEN in .env')
	process.exit(1)
}

// Parse CLI arguments or use defaults
const args = process.argv.slice(2)
const artist = args[0] || 'Olivia Dean'
const song = args[1] || 'Man I Need'

// Hardcoded audio features for "Olivia Dean - Man I Need" (Spotify ID: 4eMKMpOcXJcJqpHZf9daKn)
const HARDCODED_AUDIO_FEATURES: ReccoBeatsAudioFeatures = {
	id: '4eMKMpOcXJcJqpHZf9daKn',
	tempo: 108,
	energy: 0.65,
	valence: 0.72,
	danceability: 0.78,
	acousticness: 0.25,
	instrumentalness: 0.0,
	liveness: 0.12,
	speechiness: 0.04,
	loudness: -6.2,
}

// Initialize services
const lyricsService = new DefaultLyricsService({ accessToken: GENIUS_TOKEN })

async function main() {
	console.log('🎵 Song Analysis Pipeline Test\n')
	console.log('═'.repeat(70))
	console.log(`\n🎤 Artist: ${artist}`)
	console.log(`🎶 Song: ${song}`)
	console.log('\n' + '─'.repeat(70))

	// Step 1: Fetch lyrics from Genius
	console.log('\n📖 Step 1: Fetching lyrics from Genius API...\n')

	let lyrics
	try {
		lyrics = await lyricsService.getLyrics(artist, song)
		console.log(`   ✅ Found ${lyrics.length} sections`)

		// Show section summary
		const sectionSummary = lyrics.map(section => {
			const lineCount = section.lines?.length || 0
			const annotationCount = section.lines?.filter(l => l.annotation).length || 0
			return `     • ${section.sectionName}: ${lineCount} lines, ${annotationCount} annotations`
		})
		console.log(sectionSummary.join('\n'))
	} catch (error) {
		console.error(`   ❌ Failed to fetch lyrics:`, error)
		process.exit(1)
	}

	// Step 2: Use hardcoded audio features
	console.log('\n🎧 Step 2: Using hardcoded audio features...\n')

	const audioFeatures = HARDCODED_AUDIO_FEATURES
	console.log('   ✅ Audio features (hardcoded):')
	console.log(`     • Tempo: ${audioFeatures.tempo} BPM`)
	console.log(`     • Energy: ${(audioFeatures.energy * 100).toFixed(0)}%`)
	console.log(`     • Valence: ${(audioFeatures.valence * 100).toFixed(0)}%`)
	console.log(`     • Danceability: ${(audioFeatures.danceability * 100).toFixed(0)}%`)
	console.log(`     • Acousticness: ${(audioFeatures.acousticness * 100).toFixed(0)}%`)
	console.log(
		`     • Instrumentalness: ${(audioFeatures.instrumentalness * 100).toFixed(0)}%`
	)

	// Step 3: Build the LLM prompt
	console.log('\n📝 Step 3: Building LLM analysis prompt...\n')

	const fullPrompt = buildAnalysisPrompt(artist, song, lyrics, audioFeatures)

	// Calculate token estimate (rough: ~4 chars per token)
	const estimatedTokens = Math.ceil(fullPrompt.length / 4)
	console.log(`   📊 Prompt Statistics:`)
	console.log(`     • Character count: ${fullPrompt.length.toLocaleString()}`)
	console.log(`     • Estimated tokens: ~${estimatedTokens.toLocaleString()}`)
	console.log(`     • Lyrics sections: ${lyrics.length}`)
	console.log(`     • Audio features: ${audioFeatures ? 'Yes' : 'No'}`)

	// Step 4: Output the complete prompt
	console.log('\n' + '═'.repeat(70))
	console.log('\n🤖 COMPLETE LLM PROMPT:\n')
	console.log('─'.repeat(70))
	console.log(fullPrompt)
	console.log('─'.repeat(70))

	// Step 5: Output structured data for reference
	console.log('\n📦 STRUCTURED DATA (for reference):\n')
	console.log('─'.repeat(70))

	const structuredOutput = {
		metadata: {
			artist,
			song,
			spotifyTrackId: audioFeatures.id,
			lyricsSource: 'Genius API',
			audioFeaturesSource: 'Hardcoded (from ReccoBeats)',
			sectionCount: lyrics.length,
			estimatedPromptTokens: estimatedTokens,
		},
		lyrics,
		audioFeatures,
	}

	console.log(JSON.stringify(structuredOutput, null, 2))

	console.log('\n' + '═'.repeat(70))
	console.log('\n✨ Analysis pipeline test complete!')
	console.log('\n💡 Next steps:')
	console.log('   • This prompt would be sent to the LLM (Google, Anthropic, or OpenAI)')
	console.log('   • The LLM returns structured JSON matching SongAnalysisLlmSchema')
	console.log('   • Audio features are merged with LLM output for final analysis')
}

main().catch(error => {
	console.error('\n❌ Fatal error:', error)
	process.exit(1)
})
