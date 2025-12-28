/**
 * Test script for LastFmService
 * Fetches real tracks from the database and tests genre lookup
 *
 * Usage: bun run scripts/test-lastfm.ts
 */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

import { LastFmService } from '../app/lib/services/lastfm'

// Load .env from app/v0/.env (scripts/ -> web/ -> services/ -> v0/)
config({ path: resolve(__dirname, '../../../.env') })

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_KEY
const LASTFM_API_KEY = process.env.LASTFM_API_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
	console.error('Missing SUPABASE_URL or SUPABASE_KEY')
	process.exit(1)
}

if (!LASTFM_API_KEY) {
	console.error('Missing LASTFM_API_KEY')
	process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
const lastfm = new LastFmService(LASTFM_API_KEY)

async function main() {
	console.log('🎵 Testing LastFmService with real tracks from database\n')

	// Fetch 10 random tracks from the database
	const { data: tracks, error } = await supabase
		.from('tracks')
		.select('id, name, artist, album')
		.limit(10)

	if (error) {
		console.error('Failed to fetch tracks:', error)
		process.exit(1)
	}

	if (!tracks || tracks.length === 0) {
		console.error('No tracks found in database')
		process.exit(1)
	}

	console.log(`Found ${tracks.length} tracks to test\n`)
	console.log('─'.repeat(60))

	let successCount = 0
	let failCount = 0

	for (const track of tracks) {
		console.log(`\n🎤 ${track.artist} - ${track.name}`)
		if (track.album) {
			console.log(`   📀 Album: ${track.album}`)
		}

		const result = await lastfm.getTagsWithFallback(
			track.artist,
			track.name,
			track.album ?? undefined
		)

		if (result) {
			successCount++
			const topTags = result.tags.slice(0, 5)
			const sourceEmoji =
				result.sourceLevel === 'track' ? '🎵'
				: result.sourceLevel === 'album' ? '📀'
				: '👤'
			console.log(
				`   ✅ ${sourceEmoji} [${result.sourceLevel}] Tags: ${topTags.join(', ')}`
			)

			// Show scores for top 3
			const topWithScores = result.tagsWithScores.slice(0, 3)
			console.log(
				`   📊 Scores: ${topWithScores.map(t => `${t.name}(${t.score})`).join(', ')}`
			)
		} else {
			failCount++
			console.log(`   ❌ No tags found`)
		}
	}

	console.log('\n' + '─'.repeat(60))
	console.log(
		`\n📈 Results: ${successCount}/${tracks.length} tracks found (${failCount} failed)`
	)

	// Test batch method with fallback
	console.log('\n🔄 Testing batch method with fallback...')
	const batchInput = tracks.slice(0, 5).map(t => ({
		artist: t.artist,
		track: t.name,
		album: t.album ?? undefined,
	}))

	const batchResults = await lastfm.getTagsWithFallbackBatch(batchInput)
	console.log(`   Batch returned ${batchResults.size} results`)

	// Show source level breakdown
	const sourceCounts = { track: 0, album: 0, artist: 0 }
	for (const result of batchResults.values()) {
		sourceCounts[result.sourceLevel]++
	}
	console.log(
		`   Sources: track=${sourceCounts.track}, album=${sourceCounts.album}, artist=${sourceCounts.artist}`
	)

	console.log('\n✨ Done!')
}

main().catch(console.error)
