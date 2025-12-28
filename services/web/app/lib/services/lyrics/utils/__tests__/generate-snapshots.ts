/**
 * Lyrics Snapshot Generator
 *
 * Captures current Genius API output as test snapshots for the LyricsService.
 * These snapshots are used to detect:
 * - Parser regressions (our code broke)
 * - Genius HTML changes (their structure changed)
 *
 * If a snapshot already exists, creates a timestamped version for comparison.
 * This lets you diff old vs new before deciding to replace the baseline.
 *
 * Run with: source .env && bun run lyrics:snapshot
 */
import { existsSync, writeFileSync } from 'fs'
import { join } from 'path'

import { DefaultLyricsService } from '../../LyricsService'
import type { TransformedLyricsBySection } from '../lyrics-transformer'

const TEST_SONGS = [
	{ artist: 'Daniel Caesar', song: 'Best Part' },
	{ artist: 'Sam Fender', song: 'Rein Me In' },
	{ artist: 'Kendrick Lamar', song: 'All The Stars' },
	{ artist: 'The Weeknd', song: 'Blinding Lights' },
	{ artist: 'Westside Gunn', song: '327' },
]

export interface Snapshot {
	metadata: {
		captureDate: string
		artist: string
		song: string
	}
	result: TransformedLyricsBySection[]
}

const SNAPSHOTS_DIR = join(import.meta.dir, 'snapshots')

async function generateSnapshots() {
	const token = process.env.GENIUS_CLIENT_TOKEN
	if (!token) {
		console.error('ERROR: GENIUS_CLIENT_TOKEN environment variable not set')
		console.error('Run with: source .env && bun run lyrics:snapshot')
		process.exit(1)
	}

	const service = new DefaultLyricsService({ accessToken: token })
	const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
	const today = new Date().toISOString().split('T')[0]

	console.log('📸 Capturing lyrics snapshots from Genius API...\n')

	let newCount = 0
	let updateCount = 0

	for (const { artist, song } of TEST_SONGS) {
		try {
			console.log(`Fetching: ${artist} - ${song}`)
			const result = await service.getLyrics(artist, song)

			const snapshot: Snapshot = {
				metadata: {
					captureDate: today,
					artist,
					song,
				},
				result,
			}

			const slug = `${artist}-${song}`.toLowerCase().replace(/[^a-z0-9]+/g, '-')
			const baseFilename = `${slug}.json`
			const basePath = join(SNAPSHOTS_DIR, baseFilename)

			let savedFilename: string

			if (existsSync(basePath)) {
				// Existing baseline - create timestamped version for comparison
				savedFilename = `${slug}_${timestamp}.json`
				updateCount++
				console.log(`  ⚡ Baseline exists, creating: ${savedFilename}`)
			} else {
				// No baseline - create it
				savedFilename = baseFilename
				newCount++
				console.log(`  ✨ New baseline: ${savedFilename}`)
			}

			const filepath = join(SNAPSHOTS_DIR, savedFilename)
			writeFileSync(filepath, JSON.stringify(snapshot, null, 2))

			const totalLines = result.reduce((acc, s) => acc + s.lines.length, 0)
			const annotatedLines = result.reduce(
				(acc, s) => acc + s.lines.filter(l => l.annotations?.length).length,
				0
			)
			console.log(
				`     ${result.length} sections, ${totalLines} lines, ${annotatedLines} annotated\n`
			)
		} catch (error) {
			console.error(`  ✗ Failed: ${artist} - ${song}`, error)
		}
	}

	console.log('─'.repeat(50))
	console.log(`Done! ${newCount} new baselines, ${updateCount} timestamped snapshots.`)

	if (updateCount > 0) {
		console.log(`\n💡 To compare old vs new:`)
		console.log(`   diff snapshots/<song>.json snapshots/<song>_${timestamp}.json`)
		console.log(`\n   To replace baseline with new snapshot:`)
		console.log(`   mv snapshots/<song>_${timestamp}.json snapshots/<song>.json`)
	}
}

generateSnapshots()
