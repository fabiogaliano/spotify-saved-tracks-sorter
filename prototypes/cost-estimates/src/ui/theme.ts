/**
 * Bloomberg Terminal Color Theme
 *
 * Inspired by Bloomberg Terminal's iconic amber-on-black aesthetic.
 * Dense information display with high contrast for terminal environments.
 */

export const BLOOMBERG = {
	// Backgrounds
	bg: '#0a0a0f',
	panel: '#12121a',
	panelAlt: '#1a1a24',

	// Primary (Amber/Orange)
	amber: '#FF8C00',
	amberBright: '#FFA500',
	amberDim: '#CC7000',

	// Text
	text: '#FFFFFF',
	textDim: '#888888',
	textMuted: '#555555',

	// Borders
	border: '#FF8C00',
	borderDim: '#664400',

	// Status Colors
	success: '#00FF00',
	error: '#FF4444',
	warning: '#FFD700',
	info: '#00DDDD',

	// Highlights
	highlight: '#FFD700',
	highlightBg: '#332200',

	// Table specific
	tableHeader: '#FF8C00',
	tableRowAlt: '#0f0f16',
	tableRowHighlight: '#1a1200',
} as const

export type BloombergTheme = typeof BLOOMBERG

// Border styles
export const BORDERS = {
	single: 'single',
	double: 'double',
	rounded: 'rounded',
	bold: 'bold',
} as const

// Common box styling
export const panelStyle = {
	border: true,
	borderStyle: 'single' as const,
	borderColor: BLOOMBERG.borderDim,
	backgroundColor: BLOOMBERG.panel,
	padding: 1,
}

export const panelStyleHighlight = {
	...panelStyle,
	borderColor: BLOOMBERG.amber,
}

// Text styling helpers
export const textStyles = {
	title: { fg: BLOOMBERG.amber, bold: true },
	label: { fg: BLOOMBERG.textDim },
	value: { fg: BLOOMBERG.text },
	success: { fg: BLOOMBERG.success },
	error: { fg: BLOOMBERG.error },
	warning: { fg: BLOOMBERG.warning },
	info: { fg: BLOOMBERG.info },
	muted: { fg: BLOOMBERG.textMuted },
}
