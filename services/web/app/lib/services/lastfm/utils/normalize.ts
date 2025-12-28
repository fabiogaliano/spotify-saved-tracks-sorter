/**
 * Last.fm-specific normalization utilities
 *
 * Simpler than Genius lyrics search - Last.fm has autocorrect=1 that handles
 * most fuzzy matching. We just need to strip collaborator patterns and suffixes
 * that might confuse album lookups.
 */

/**
 * Patterns that indicate collaborators in track/album names
 * These should be stripped for cleaner album/artist lookups
 */
const COLLABORATOR_PATTERNS = [
	/\s*\(with\s+[^)]+\)\s*/gi,
	/\s*\(feat\.?\s+[^)]+\)\s*/gi,
	/\s*\(featuring\s+[^)]+\)\s*/gi,
	/\s*\(ft\.?\s+[^)]+\)\s*/gi,
]

/**
 * Patterns for version/edition suffixes that don't affect genre
 */
const VERSION_SUFFIX_PATTERNS = [
	/\s*-\s*remaster(ed)?\s*(\d{4})?\s*/gi,
	/\s*-\s*radio\s*edit\s*/gi,
	/\s*-\s*single\s*version\s*/gi,
	/\s*-\s*album\s*version\s*/gi,
	/\s*-\s*live\s*/gi,
	/\s*-\s*acoustic\s*/gi,
	/\s*\(remaster(ed)?\s*(\d{4})?\)\s*/gi,
	/\s*\(deluxe(\s+edition)?\)\s*/gi,
	/\s*\(expanded(\s+edition)?\)\s*/gi,
	/\s*\(\d{4}(\s+edition)?\)\s*/gi,
	/\s*\(\d{4}\s+remaster(ed)?\)\s*/gi,
]

/**
 * Normalize a track or album name for Last.fm lookup
 * Strips collaborator patterns and version suffixes
 */
export function normalizeForLastFm(name: string): string {
	let normalized = name

	// Remove collaborator patterns
	for (const pattern of COLLABORATOR_PATTERNS) {
		normalized = normalized.replace(pattern, '')
	}

	// Remove version suffixes
	for (const pattern of VERSION_SUFFIX_PATTERNS) {
		normalized = normalized.replace(pattern, '')
	}

	// Clean up any double spaces and trim
	return normalized.replace(/\s+/g, ' ').trim()
}

/**
 * Normalize an album name - same logic but could diverge later
 */
export function normalizeAlbumName(album: string): string {
	return normalizeForLastFm(album)
}

/**
 * Extract the primary artist from a potentially collaborative artist string
 * "Sam Fender" → "Sam Fender"
 * "Sam Fender, Olivia Dean" → "Sam Fender"
 */
export function extractPrimaryArtist(artist: string): string {
	// Split on common separators and take first
	const separators = [', ', ' & ', ' and ', ' x ', ' X ', ' vs ', ' vs. ']

	for (const sep of separators) {
		if (artist.includes(sep)) {
			return artist.split(sep)[0].trim()
		}
	}

	return artist
}
