/**
 * Cost Calculator for vectorization and LLM operations
 * Performs dry-run cost estimation without making actual API calls
 */

import type {
	BatchComparison,
	CostEstimate,
	CostReport,
	Provider,
	Track,
} from '../types'

/**
 * Calculate cost for a single provider
 */
export function calculateCost(
	provider: Provider,
	trackCount: number
): CostEstimate {
	let totalCost = 0
	let estimatedRuntime = 0

	if (provider.type === 'vectorization') {
		if (provider.cost_per_run !== undefined) {
			// Fixed cost per run (like Replicate)
			totalCost = provider.cost_per_run * trackCount
		} else if (provider.cost_per_1k_tokens !== undefined) {
			// Token-based pricing (like OpenAI embeddings)
			const avgTokens = provider.avg_tokens_per_song ?? 150
			const totalTokens = avgTokens * trackCount
			totalCost = (totalTokens / 1000) * provider.cost_per_1k_tokens
		} else if (provider.cost_per_1m_tokens !== undefined) {
			// Million token pricing (like Voyage/Cohere)
			const avgTokens = provider.avg_tokens_per_song ?? 150
			const totalTokens = avgTokens * trackCount
			totalCost = (totalTokens / 1_000_000) * provider.cost_per_1m_tokens
		}

		// Estimate runtime
		const runtimePerCall = provider.avg_runtime_seconds ?? 1
		estimatedRuntime = runtimePerCall * trackCount
	} else if (provider.type === 'llm') {
		// LLM pricing: input + output tokens
		const inputTokens = provider.avg_input_tokens_per_song ?? 2500
		const outputTokens = provider.avg_output_tokens_per_song ?? 800

		const totalInputTokens = inputTokens * trackCount
		const totalOutputTokens = outputTokens * trackCount

		const inputCost =
			(totalInputTokens / 1_000_000) *
			(provider.input_cost_per_1m_tokens ?? 0)
		const outputCost =
			(totalOutputTokens / 1_000_000) *
			(provider.output_cost_per_1m_tokens ?? 0)

		totalCost = inputCost + outputCost

		// Estimate ~2-3 seconds per track for LLM
		estimatedRuntime = 2.5 * trackCount
	}

	return {
		provider,
		track_count: trackCount,
		total_cost: totalCost,
		cost_per_track: trackCount > 0 ? totalCost / trackCount : 0,
		estimated_runtime_seconds: estimatedRuntime,
	}
}

/**
 * Calculate cost with different batch sizes
 * For batch-supporting providers, larger batches can reduce overhead
 */
export function calculateBatchComparisons(
	provider: Provider,
	trackCount: number,
	batchSizes: number[]
): BatchComparison[] {
	const comparisons: BatchComparison[] = []

	for (const batchSize of batchSizes) {
		const effectiveBatchSize = provider.batch_support
			? Math.min(batchSize, provider.max_batch_size ?? batchSize)
			: 1

		const apiCalls = Math.ceil(trackCount / effectiveBatchSize)

		// For non-batch providers, cost doesn't change
		// For batch providers, fewer API calls might mean slight efficiency gains
		let totalCost: number
		let totalRuntime: number

		if (provider.cost_per_run !== undefined) {
			// Replicate charges per run, so no batch savings
			totalCost = provider.cost_per_run * trackCount
			totalRuntime = (provider.avg_runtime_seconds ?? 1) * trackCount
		} else {
			// Token-based pricing - batching doesn't affect cost, just latency
			const estimate = calculateCost(provider, trackCount)
			totalCost = estimate.total_cost
			// Batching can reduce total time due to parallelism
			const parallelFactor = Math.min(effectiveBatchSize, 10) / 10
			totalRuntime = estimate.estimated_runtime_seconds * (1 - parallelFactor * 0.5)
		}

		comparisons.push({
			batch_size: effectiveBatchSize,
			total_cost: totalCost,
			total_runtime_seconds: totalRuntime,
			api_calls: apiCalls,
		})
	}

	return comparisons
}

/**
 * Generate recommendations based on analysis
 */
function generateRecommendations(
	provider: Provider,
	trackCount: number,
	estimate: CostEstimate,
	batchComparisons: BatchComparison[]
): string[] {
	const recommendations: string[] = []

	// Cost thresholds
	if (estimate.total_cost > 10) {
		recommendations.push(
			`⚠️ High cost warning: $${estimate.total_cost.toFixed(2)} for ${trackCount} tracks`
		)
	}

	if (estimate.total_cost > 50) {
		recommendations.push(
			`🚨 Consider processing in smaller batches to test quality first`
		)
	}

	// For Replicate specifically
	if (provider.provider === 'replicate' && !provider.batch_support) {
		recommendations.push(
			`💡 Replicate charges per-run. Consider batching at application level to manage rate limits.`
		)
	}

	// Runtime estimates
	const runtimeMinutes = estimate.estimated_runtime_seconds / 60
	if (runtimeMinutes > 60) {
		recommendations.push(
			`⏱️ Estimated runtime: ${(runtimeMinutes / 60).toFixed(1)} hours`
		)
	} else if (runtimeMinutes > 10) {
		recommendations.push(
			`⏱️ Estimated runtime: ${runtimeMinutes.toFixed(0)} minutes`
		)
	}

	// Cost per track insight
	recommendations.push(
		`📊 Cost per track: $${estimate.cost_per_track.toFixed(6)}`
	)

	// Scaling projections
	const cost1k = estimate.cost_per_track * 1000
	const cost10k = estimate.cost_per_track * 10000
	recommendations.push(
		`📈 Projected costs: 1K tracks = $${cost1k.toFixed(2)}, 10K tracks = $${cost10k.toFixed(2)}`
	)

	return recommendations
}

/**
 * Generate full cost report for a provider
 */
export function generateCostReport(
	provider: Provider,
	trackCount: number,
	batchSizes: number[]
): CostReport {
	const singleEstimate = calculateCost(provider, trackCount)
	const batchComparisons = calculateBatchComparisons(
		provider,
		trackCount,
		batchSizes
	)
	const recommendations = generateRecommendations(
		provider,
		trackCount,
		singleEstimate,
		batchComparisons
	)

	return {
		provider,
		track_count: trackCount,
		single_estimate: singleEstimate,
		batch_comparisons: batchComparisons,
		recommendations,
	}
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
	if (amount < 0.01) {
		return `$${amount.toFixed(6)}`
	} else if (amount < 1) {
		return `$${amount.toFixed(4)}`
	}
	return `$${amount.toFixed(2)}`
}

/**
 * Format duration for display
 */
export function formatDuration(seconds: number): string {
	if (seconds < 60) {
		return `${seconds.toFixed(1)}s`
	} else if (seconds < 3600) {
		return `${(seconds / 60).toFixed(1)}m`
	}
	return `${(seconds / 3600).toFixed(1)}h`
}
