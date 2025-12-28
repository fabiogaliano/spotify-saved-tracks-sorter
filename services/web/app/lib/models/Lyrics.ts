import type { LyricsSection } from '../services/lyrics/types/lyrics.types'
import { TransformedLyricsBySection } from '../services/lyrics/utils/lyrics-transformer'

export interface LyricsResult {
	type: 'text' | 'link' | 'group'
	content: string
	annotation?: string
	verified?: boolean
	votesTotal?: number
}

export interface LyricsService {
	getLyrics(artist: string, song: string): Promise<TransformedLyricsBySection[]>
}

export type { LyricsSection }
