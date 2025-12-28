export const PLAYLIST_COLORS = ['blue', 'green', 'purple', 'pink', 'yellow'] as const

export type PlaylistColor = (typeof PLAYLIST_COLORS)[number]

export const getColorForPlaylist = (playlistId: string): PlaylistColor => {
	// Ensures the same playlist always gets the same color
	const charSum = playlistId.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)
	return PLAYLIST_COLORS[charSum % PLAYLIST_COLORS.length]
}

export const getColorClasses = (color: string) => {
	const colorMap: Record<
		string,
		{ bg: string; inner: string; text: string; border: string }
	> = {
		blue: {
			bg: 'bg-blue-500/20',
			inner: 'bg-blue-400/60',
			text: 'text-blue-400',
			border: 'border-blue-500/30',
		},
		green: {
			bg: 'bg-green-500/20',
			inner: 'bg-green-400/60',
			text: 'text-green-400',
			border: 'border-green-500/30',
		},
		purple: {
			bg: 'bg-purple-500/20',
			inner: 'bg-purple-400/60',
			text: 'text-purple-400',
			border: 'border-purple-500/30',
		},
		pink: {
			bg: 'bg-pink-500/20',
			inner: 'bg-pink-400/60',
			text: 'text-pink-400',
			border: 'border-pink-500/30',
		},
		yellow: {
			bg: 'bg-yellow-500/20',
			inner: 'bg-yellow-400/60',
			text: 'text-yellow-400',
			border: 'border-yellow-500/30',
		},
	}

	return colorMap[color] || colorMap.blue
}
