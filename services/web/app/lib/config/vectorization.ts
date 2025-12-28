/**
 * Vectorization Service Configuration
 */

export const vectorizationConfig = {
	/**
	 * URL of the vectorization Python API
	 * Defaults to localhost for development
	 */
	apiUrl: process.env.VECTORIZATION_API_URL || 'http://localhost:8000',

	/**
	 * Available model types for embedding
	 */
	models: {
		general: 'general',
		creative: 'creative',
		semantic: 'semantic',
		fast: 'fast',
	} as const,

	/**
	 * Default model for different use cases
	 */
	defaults: {
		song: 'creative' as const,
		playlist: 'creative' as const,
		quick: 'fast' as const,
	},

	/**
	 * Cache TTL in milliseconds (1 hour)
	 */
	cacheTtl: 60 * 60 * 1000,
}

export type ModelType = keyof typeof vectorizationConfig.models
