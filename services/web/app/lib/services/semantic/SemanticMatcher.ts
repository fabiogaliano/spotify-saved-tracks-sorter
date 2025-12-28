/**
 * SemanticMatcher Service
 *
 * Provides semantic similarity matching for strings using embeddings.
 * Model-agnostic: uses VectorizationService which can be configured to use any model.
 *
 * Use cases:
 * - Theme matching: "Self-Love" ↔ "Self-Confidence"
 * - Mood matching: "empowered" ↔ "Confident and Empowered"
 * - Audience matching: "hip-hop fans" ↔ "rap enthusiasts"
 */
import type { VectorizationService } from '../vectorization/VectorizationService'

export interface SemanticMatcherConfig {
	/** Default similarity threshold (0-1) for considering strings as "similar" */
	defaultThreshold: number
	/** Cache TTL in milliseconds */
	cacheTtlMs: number
	/** Maximum cache size */
	maxCacheSize: number
}

const DEFAULT_CONFIG: SemanticMatcherConfig = {
	defaultThreshold: 0.65,
	cacheTtlMs: 60 * 60 * 1000, // 1 hour
	maxCacheSize: 1000,
}

interface CacheEntry {
	embedding: number[]
	timestamp: number
}

/**
 * SemanticMatcher - Compare strings semantically using embeddings
 */
export class SemanticMatcher {
	private cache: Map<string, CacheEntry> = new Map()
	private config: SemanticMatcherConfig

	constructor(
		private readonly vectorization: VectorizationService,
		config: Partial<SemanticMatcherConfig> = {}
	) {
		this.config = { ...DEFAULT_CONFIG, ...config }
	}

	/**
	 * Check if two strings are semantically similar
	 */
	async areSimilar(
		str1: string,
		str2: string,
		threshold: number = this.config.defaultThreshold
	): Promise<boolean> {
		// Fast path: exact match (case-insensitive)
		if (this.normalize(str1) === this.normalize(str2)) {
			return true
		}

		// Fast path: substring match
		const norm1 = this.normalize(str1)
		const norm2 = this.normalize(str2)
		if (norm1.includes(norm2) || norm2.includes(norm1)) {
			return true
		}

		// Semantic comparison
		const similarity = await this.getSimilarity(str1, str2)
		return similarity >= threshold
	}

	/**
	 * Get similarity score between two strings (0-1)
	 */
	async getSimilarity(str1: string, str2: string): Promise<number> {
		// Get embeddings (cached)
		const [emb1, emb2] = await Promise.all([
			this.getEmbedding(str1),
			this.getEmbedding(str2),
		])

		return this.cosineSimilarity(emb1, emb2)
	}

	/**
	 * Find strings from candidates that are similar to query
	 */
	async findSimilar(
		query: string,
		candidates: string[],
		threshold: number = this.config.defaultThreshold
	): Promise<Array<{ value: string; similarity: number }>> {
		if (candidates.length === 0) return []

		const queryEmb = await this.getEmbedding(query)
		const candidateEmbs = await this.getEmbeddingsBatch(candidates)

		const results: Array<{ value: string; similarity: number }> = []

		for (let i = 0; i < candidates.length; i++) {
			const similarity = this.cosineSimilarity(queryEmb, candidateEmbs[i])
			if (similarity >= threshold) {
				results.push({ value: candidates[i], similarity })
			}
		}

		return results.sort((a, b) => b.similarity - a.similarity)
	}

	/**
	 * Count how many items from list1 have a semantic match in list2
	 */
	async countMatches(
		list1: string[],
		list2: string[],
		threshold: number = this.config.defaultThreshold
	): Promise<number> {
		if (list1.length === 0 || list2.length === 0) return 0

		// Get all embeddings in batch
		const [embs1, embs2] = await Promise.all([
			this.getEmbeddingsBatch(list1),
			this.getEmbeddingsBatch(list2),
		])

		let matchCount = 0

		for (let i = 0; i < list1.length; i++) {
			// Check if any item in list2 is similar
			for (let j = 0; j < list2.length; j++) {
				// Fast path: substring match
				const norm1 = this.normalize(list1[i])
				const norm2 = this.normalize(list2[j])
				if (norm1.includes(norm2) || norm2.includes(norm1)) {
					matchCount++
					break
				}

				// Semantic match
				const similarity = this.cosineSimilarity(embs1[i], embs2[j])
				if (similarity >= threshold) {
					matchCount++
					break
				}
			}
		}

		return matchCount
	}

	/**
	 * Compute full similarity matrix between two lists
	 * Returns matrix[i][j] = similarity(list1[i], list2[j])
	 */
	async computeSimilarityMatrix(list1: string[], list2: string[]): Promise<number[][]> {
		const [embs1, embs2] = await Promise.all([
			this.getEmbeddingsBatch(list1),
			this.getEmbeddingsBatch(list2),
		])

		const matrix: number[][] = []

		for (let i = 0; i < list1.length; i++) {
			const row: number[] = []
			for (let j = 0; j < list2.length; j++) {
				row.push(this.cosineSimilarity(embs1[i], embs2[j]))
			}
			matrix.push(row)
		}

		return matrix
	}

	// ===========================================================================
	// Private Methods
	// ===========================================================================

	/**
	 * Get embedding for a string (with caching)
	 */
	private async getEmbedding(str: string): Promise<number[]> {
		const normalized = this.normalize(str)
		const cached = this.cache.get(normalized)

		if (cached && Date.now() - cached.timestamp < this.config.cacheTtlMs) {
			return cached.embedding
		}

		// Use 'fast' model for short strings (themes, moods)
		const embedding = await this.vectorization.embed(normalized)

		// Cache the result
		this.cacheEmbedding(normalized, embedding)

		return embedding
	}

	/**
	 * Get embeddings for multiple strings (with caching)
	 */
	private async getEmbeddingsBatch(strings: string[]): Promise<number[][]> {
		const normalized = strings.map(s => this.normalize(s))
		const results: number[][] = new Array(strings.length)
		const uncachedIndices: number[] = []
		const uncachedStrings: string[] = []

		// Check cache first
		for (let i = 0; i < normalized.length; i++) {
			const cached = this.cache.get(normalized[i])
			if (cached && Date.now() - cached.timestamp < this.config.cacheTtlMs) {
				results[i] = cached.embedding
			} else {
				uncachedIndices.push(i)
				uncachedStrings.push(normalized[i])
			}
		}

		// Fetch uncached embeddings in batch
		if (uncachedStrings.length > 0) {
			const embeddings = await this.vectorization.embedBatch(uncachedStrings)

			for (let i = 0; i < uncachedIndices.length; i++) {
				const idx = uncachedIndices[i]
				results[idx] = embeddings[i]
				this.cacheEmbedding(uncachedStrings[i], embeddings[i])
			}
		}

		return results
	}

	/**
	 * Cache an embedding with FIFO eviction
	 */
	private cacheEmbedding(key: string, embedding: number[]): void {
		// Evict oldest entry if cache is full
		if (this.cache.size >= this.config.maxCacheSize) {
			const oldestKey = this.cache.keys().next().value
			if (oldestKey) {
				this.cache.delete(oldestKey)
			}
		}

		this.cache.set(key, {
			embedding,
			timestamp: Date.now(),
		})
	}

	/**
	 * Normalize string for consistent comparison
	 */
	private normalize(str: string): string {
		return str.toLowerCase().trim()
	}

	/**
	 * Calculate cosine similarity between two vectors
	 */
	private cosineSimilarity(vec1: number[], vec2: number[]): number {
		if (vec1.length !== vec2.length || vec1.length === 0) {
			return 0
		}

		let dotProduct = 0
		let norm1 = 0
		let norm2 = 0

		for (let i = 0; i < vec1.length; i++) {
			dotProduct += vec1[i] * vec2[i]
			norm1 += vec1[i] * vec1[i]
			norm2 += vec2[i] * vec2[i]
		}

		const magnitude = Math.sqrt(norm1) * Math.sqrt(norm2)
		return magnitude === 0 ? 0 : dotProduct / magnitude
	}

	/**
	 * Clear the embedding cache
	 */
	clearCache(): void {
		this.cache.clear()
	}

	/**
	 * Get cache statistics
	 */
	getCacheStats(): { size: number; maxSize: number } {
		return {
			size: this.cache.size,
			maxSize: this.config.maxCacheSize,
		}
	}
}

/**
 * Factory function to create SemanticMatcher
 */
export function createSemanticMatcher(
	vectorization: VectorizationService,
	config?: Partial<SemanticMatcherConfig>
): SemanticMatcher {
	return new SemanticMatcher(vectorization, config)
}
