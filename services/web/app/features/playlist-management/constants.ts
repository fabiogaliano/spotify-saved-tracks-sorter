// React Query cache times
export const QUERY_STALE_TIME = {
	PLAYLISTS: 5 * 60 * 1000, // 5 minutes
	TRACKS: 2 * 60 * 1000, // 2 minutes
} as const

export const QUERY_CACHE_TIME = {
	DEFAULT: 10 * 60 * 1000, // 10 minutes
} as const

// UI constants
export const COMPONENT_SIZES = {
	ICON: {
		sm: 'h-3 w-3',
		md: 'h-5 w-5',
		lg: 'h-6 w-6',
	},
	CARD: {
		sm: { outer: 'w-6 h-6', inner: 'w-4 h-4' },
		md: { outer: 'w-10 h-10', inner: 'w-7 h-7' },
		lg: { outer: 'w-32 h-32', inner: 'w-24 h-24' },
	},
} as const

// Local storage keys
export const STORAGE_KEYS = {
	SELECTED_TAB: 'selectedTab',
	SELECTED_PLAYLIST_PREFIX: 'selectedPlaylistId_',
} as const
