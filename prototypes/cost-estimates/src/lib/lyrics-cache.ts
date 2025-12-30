/**
 * Lyrics Cache Manager
 *
 * Caches fetched lyrics to disk to avoid redundant API calls.
 * Stores EXACTLY what gets sent to the LLM: TransformedLyricsBySection[]
 * File format mirrors what buildAnalysisPrompt receives.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { TransformedLyricsBySection } from '~/lib/services/lyrics/utils/lyrics-transformer'

const CACHE_DIR = join(import.meta.dir, '../../cache/lyrics')
const MANIFEST_PATH = join(CACHE_DIR, 'manifest.json')

export interface LyricsCacheManifest {
	cached: string[] // spotify track IDs with lyrics
	failed: string[] // spotify track IDs that failed (no lyrics available)
}

function ensureCacheDir(): void {
	if (!existsSync(CACHE_DIR)) {
		mkdirSync(CACHE_DIR, { recursive: true })
	}
}

export function loadManifest(): LyricsCacheManifest {
	ensureCacheDir()
	if (!existsSync(MANIFEST_PATH)) {
		return { cached: [], failed: [] }
	}
	try {
		return JSON.parse(readFileSync(MANIFEST_PATH, 'utf-8'))
	} catch {
		return { cached: [], failed: [] }
	}
}

export function saveManifest(manifest: LyricsCacheManifest): void {
	ensureCacheDir()
	writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2))
}

/**
 * Get cached lyrics - returns exactly what buildAnalysisPrompt expects
 */
export function getCachedLyrics(spotifyTrackId: string): TransformedLyricsBySection[] | null {
	const filePath = join(CACHE_DIR, `${spotifyTrackId}.json`)
	if (!existsSync(filePath)) {
		return null
	}
	try {
		return JSON.parse(readFileSync(filePath, 'utf-8'))
	} catch {
		return null
	}
}

/**
 * Save lyrics to cache - stores exactly what buildAnalysisPrompt expects
 */
export function saveLyricsToCache(spotifyTrackId: string, lyrics: TransformedLyricsBySection[]): void {
	ensureCacheDir()
	const filePath = join(CACHE_DIR, `${spotifyTrackId}.json`)
	// Store exactly the lyrics array - same format as buildAnalysisPrompt receives
	writeFileSync(filePath, JSON.stringify(lyrics, null, 2))

	// Update manifest
	const manifest = loadManifest()
	if (!manifest.cached.includes(spotifyTrackId)) {
		manifest.cached.push(spotifyTrackId)
	}
	manifest.failed = manifest.failed.filter((id) => id !== spotifyTrackId)
	saveManifest(manifest)
}

export function markAsFailed(spotifyTrackId: string): void {
	const manifest = loadManifest()
	if (!manifest.failed.includes(spotifyTrackId)) {
		manifest.failed.push(spotifyTrackId)
	}
	saveManifest(manifest)
}

export function getCacheStats(): { cached: number; failed: number } {
	const manifest = loadManifest()
	return {
		cached: manifest.cached.length,
		failed: manifest.failed.length,
	}
}
