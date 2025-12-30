/**
 * Type definitions for cost estimation tool
 */

export interface Provider {
	name: string
	type: 'vectorization' | 'llm' | 'lyrics' | 'audio_features'
	provider: string
	model: string
	cost_per_run?: number
	cost_per_1k_tokens?: number
	cost_per_1m_tokens?: number
	input_cost_per_1m_tokens?: number
	output_cost_per_1m_tokens?: number
	avg_tokens_per_song?: number
	avg_input_tokens_per_song?: number
	avg_output_tokens_per_song?: number
	avg_runtime_seconds?: number
	batch_support?: boolean
	max_batch_size?: number
	dimensions?: number
	notes?: string
}

export interface Config {
	defaults: {
		track_count: number
		batch_sizes: number[]
	}
	providers: Provider[]
}

export interface Track {
	id: number
	name: string
	artist: string
	album: string | null
	spotify_track_id: string
}

export interface CostEstimate {
	provider: Provider
	track_count: number
	total_cost: number
	cost_per_track: number
	estimated_runtime_seconds: number
	batch_size?: number
}

export interface BatchComparison {
	batch_size: number
	total_cost: number
	total_runtime_seconds: number
	api_calls: number
}

export interface CostReport {
	provider: Provider
	track_count: number
	single_estimate: CostEstimate
	batch_comparisons: BatchComparison[]
	recommendations: string[]
}

/**
 * Multi-model comparison types
 */

/** Cost at a specific scale for a single provider */
export interface ScaleCost {
	provider: Provider
	cost: number
	runtime: string
}

/** Comparison row: one scale point across multiple providers */
export interface ScaleComparison {
	tracks: number
	costs: ScaleCost[]
	isHighlighted?: boolean
}
