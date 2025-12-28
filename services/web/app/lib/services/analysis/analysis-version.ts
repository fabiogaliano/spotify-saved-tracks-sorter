/**
 * Analysis version management
 *
 * Version 1: Basic analysis (legacy)
 * Version 2: Enhanced analysis with cultural context
 */

export const ANALYSIS_VERSION = {
	// Current version for new analyses
	CURRENT: 2,

	// Version history
	VERSIONS: {
		1: 'Basic analysis without cultural context',
		2: 'Enhanced analysis with cultural markers and improved prompts',
	},
} as const

export type AnalysisVersion = keyof typeof ANALYSIS_VERSION.VERSIONS
