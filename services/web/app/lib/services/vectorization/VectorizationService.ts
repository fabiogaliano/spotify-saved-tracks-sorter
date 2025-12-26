/**
 * Vectorization Service
 *
 * Orchestrates text extraction and embedding generation.
 * TypeScript handles schema knowledge, Python handles ML embedding.
 */

import type { Song, Playlist, SentimentScore } from '~/lib/models/Matching'
import { logger } from '~/lib/logging/Logger'
import { vectorCache } from './VectorCache'
import { vectorizationConfig, type ModelType } from '~/lib/config/vectorization'
import {
  extractSongText,
  extractPlaylistText,
  combineVectorizationText,
  type VectorizationText,
} from './analysis-extractors'

/**
 * Weights for hybrid embedding combination
 */
export interface EmbeddingWeights {
  metadata: number
  analysis: number
  context: number
}

const DEFAULT_WEIGHTS: EmbeddingWeights = {
  metadata: 0.3,
  analysis: 0.5,
  context: 0.2,
}

/**
 * Service interface for vectorization operations
 */
export interface VectorizationService {
  // High-level methods for domain objects
  vectorizeSong(song: Song): Promise<number[]>
  vectorizePlaylist(playlist: Playlist): Promise<number[]>

  // Generic text embedding
  embed(text: string, model?: ModelType): Promise<number[]>
  embedBatch(texts: string[], model?: ModelType): Promise<number[][]>
  embedHybrid(text: VectorizationText, weights?: EmbeddingWeights): Promise<number[]>

  // Sentiment analysis
  getSentimentScores(text: string): Promise<SentimentScore>
}

/**
 * Default implementation using Python vectorization API
 */
export class DefaultVectorizationService implements VectorizationService {
  private readonly apiUrl: string

  constructor(apiUrl?: string) {
    this.apiUrl = apiUrl || vectorizationConfig.apiUrl
  }

  /**
   * Generate embedding for a Song using extraction + hybrid embedding
   */
  async vectorizeSong(song: Song): Promise<number[]> {
    const songId = `${song.track.artist}-${song.track.title}`

    // Check cache first
    const cached = vectorCache.getTrackEmbedding(songId, song.analysis)
    if (cached) {
      return cached
    }

    try {
      logger.debug('Vectorizing song', {
        title: song.track.title,
        artist: song.track.artist,
      })

      // Extract text from song analysis
      const text = extractSongText(song)

      // Get hybrid embedding
      const embedding = await this.embedHybrid(text)

      // Cache result
      vectorCache.setTrackEmbedding(songId, song.analysis, embedding)

      return embedding
    } catch (error) {
      throw new logger.AppError(
        'Failed to vectorize song',
        'VECTORIZATION_ERROR',
        500,
        { cause: error, song: `${song.track.artist} - ${song.track.title}` }
      )
    }
  }

  /**
   * Generate embedding for a Playlist using extraction + hybrid embedding
   */
  async vectorizePlaylist(playlist: Playlist): Promise<number[]> {
    const playlistId = String(playlist.id)

    // Check cache first
    const cached = vectorCache.getPlaylistEmbedding(playlistId, playlist)
    if (cached) {
      return cached
    }

    try {
      logger.debug('Vectorizing playlist', { playlistId })

      // Extract text from playlist analysis
      const text = extractPlaylistText(playlist)

      // Get hybrid embedding
      const embedding = await this.embedHybrid(text)

      // Cache result
      vectorCache.setPlaylistEmbedding(playlistId, playlist, embedding)

      return embedding
    } catch (error) {
      throw new logger.AppError(
        'Failed to vectorize playlist',
        'VECTORIZATION_ERROR',
        500,
        { cause: error, playlistId }
      )
    }
  }

  /**
   * Generate embedding for plain text
   */
  async embed(text: string, model: ModelType = 'general'): Promise<number[]> {
    try {
      logger.debug('Embedding text', { textLength: text.length, model })

      const response = await fetch(`${this.apiUrl}/embed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, model_type: model }),
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()
      return result.embedding
    } catch (error) {
      throw new logger.AppError(
        'Failed to embed text',
        'VECTORIZATION_ERROR',
        500,
        { cause: error, textLength: text.length }
      )
    }
  }

  /**
   * Batch embed multiple texts
   */
  async embedBatch(texts: string[], model: ModelType = 'general'): Promise<number[][]> {
    try {
      logger.debug('Batch embedding', { count: texts.length, model })

      const response = await fetch(`${this.apiUrl}/embed/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texts, model_type: model }),
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()
      return result.embeddings
    } catch (error) {
      throw new logger.AppError(
        'Failed to batch embed',
        'VECTORIZATION_ERROR',
        500,
        { cause: error, count: texts.length }
      )
    }
  }

  /**
   * Generate hybrid embedding from categorized text with weights
   */
  async embedHybrid(
    text: VectorizationText,
    weights: EmbeddingWeights = DEFAULT_WEIGHTS
  ): Promise<number[]> {
    try {
      logger.debug('Hybrid embedding', {
        metadataLen: text.metadata.length,
        analysisLen: text.analysis.length,
        contextLen: text.context.length,
      })

      const response = await fetch(`${this.apiUrl}/embed/hybrid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          texts: {
            metadata: text.metadata,
            analysis: text.analysis,
            context: text.context,
          },
          weights,
        }),
      })

      if (!response.ok) {
        // Fallback to simple embed if hybrid fails
        logger.warn('Hybrid embed failed, falling back to simple embed')
        const combined = combineVectorizationText(text)
        return this.embed(combined, 'creative')
      }

      const result = await response.json()
      return result.embedding
    } catch (error) {
      // Fallback to simple embed
      logger.warn('Hybrid embed error, falling back to simple embed', { error })
      const combined = combineVectorizationText(text)
      return this.embed(combined, 'creative')
    }
  }

  /**
   * Analyze sentiment of text
   */
  async getSentimentScores(text: string): Promise<SentimentScore> {
    try {
      if (!text?.trim()) {
        return { positive: 0.33, negative: 0.33, neutral: 0.34 }
      }

      logger.debug('Analyzing sentiment', { textLength: text.length })

      const response = await fetch(`${this.apiUrl}/sentiment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      logger.warn('Sentiment analysis failed, returning defaults', { error })
      return { positive: 0.33, negative: 0.33, neutral: 0.34 }
    }
  }
}

// Re-export extractor functions and types for convenience
export type { VectorizationText }
export { extractSongText, extractPlaylistText, combineVectorizationText }
