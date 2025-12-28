// Theme configuration with Spotify brand colors
export const themeConfig = {
	// Spotify brand colors adapted for light/dark themes
	brand: {
		spotify: {
			light: 'oklch(0.55 0.18 140)', // Adjusted for better contrast on light
			dark: 'oklch(0.65 0.18 140)', // Original Spotify green
			hover: {
				light: 'oklch(0.5 0.18 140)',
				dark: 'oklch(0.7 0.18 140)',
			},
		},
	},

	// Semantic color mappings for status indicators
	status: {
		success: {
			light: 'oklch(0.5 0.16 140)',
			dark: 'oklch(0.65 0.16 140)',
		},
		warning: {
			light: 'oklch(0.55 0.16 85)',
			dark: 'oklch(0.7 0.16 85)',
		},
		error: {
			light: 'oklch(0.5 0.2 27)',
			dark: 'oklch(0.65 0.2 27)',
		},
		info: {
			light: 'oklch(0.45 0.18 260)',
			dark: 'oklch(0.65 0.18 260)',
		},
	},

	// Gradient colors for similarity scores
	similarity: {
		excellent: {
			// 80-100%
			light: 'oklch(0.5 0.16 140)',
			dark: 'oklch(0.65 0.16 140)',
		},
		good: {
			// 60-80%
			light: 'oklch(0.55 0.14 140)',
			dark: 'oklch(0.6 0.14 140)',
		},
		fair: {
			// 40-60%
			light: 'oklch(0.55 0.16 85)',
			dark: 'oklch(0.7 0.16 85)',
		},
		poor: {
			// 0-40%
			light: 'oklch(0.5 0.18 27)',
			dark: 'oklch(0.65 0.18 27)',
		},
	},
}

// Utility function to get theme-aware color
export function getThemeColor(colorPath: string, theme: 'light' | 'dark') {
	const paths = colorPath.split('.')
	let value: any = themeConfig

	for (const path of paths) {
		value = value[path]
		if (!value) return null
	}

	return value[theme] || value
}
