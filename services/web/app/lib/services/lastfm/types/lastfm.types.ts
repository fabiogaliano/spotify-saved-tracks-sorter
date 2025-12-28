/**
 * Last.fm API type definitions
 * @see https://www.last.fm/api/show/track.getTopTags
 */

/**
 * A tag (genre/descriptor) from Last.fm
 */
export interface LastFmTag {
	name: string
	/** Relevance score 0-100 (higher = more relevant) */
	count: number
	url: string
}

/**
 * Response from track.getTopTags API endpoint
 */
export interface LastFmTopTagsResponse {
	toptags: {
		tag: LastFmTag[]
		'@attr': {
			artist: string
			track: string
		}
	}
}

/**
 * Response from album.getTopTags API endpoint
 */
export interface LastFmAlbumTopTagsResponse {
	toptags: {
		tag: LastFmTag[]
		'@attr': {
			artist: string
			album: string
		}
	}
}

/**
 * Response from artist.getTopTags API endpoint
 */
export interface LastFmArtistTopTagsResponse {
	toptags: {
		tag: LastFmTag[]
		'@attr': {
			artist: string
		}
	}
}

/**
 * Last.fm API error response
 */
export interface LastFmErrorResponse {
	error: number
	message: string
}

/**
 * Source level for genre lookup (track is most specific, artist is broadest)
 */
export type GenreSourceLevel = 'track' | 'album' | 'artist'

/**
 * Normalized genre lookup result
 */
export interface GenreLookupResult {
	/** Top tags (all returned tags) */
	tags: string[]
	/** Tags with their relevance scores */
	tagsWithScores: Array<{ name: string; score: number }>
	/** Where the tags came from */
	sourceLevel: GenreSourceLevel
	source: 'lastfm'
}
