import type { Analysis, Emotional, Meaning, Mood, Playlist, Song, SentimentScore, Context, Theme } from '../../domain/Matching'
import { ApiError } from '../../errors/ApiError'
import { logger } from '../../logging/Logger'

export interface VectorizationService {
  vectorizeText(text: string): Promise<number[]>
  vectorizeSong(song: Song): Promise<number[]>
  vectorizePlaylist(playlist: Playlist): Promise<number[]>
  getSentimentScores(text: string): Promise<SentimentScore>
  extractFeatureVector(embedding: number[], featureType: 'theme' | 'mood' | 'activity' | 'intensity', dimensions?: number): number[]
  extractThemesText(data: Song | Playlist): string
  extractMoodText(data: Song | Playlist): string
  extractActivities(context?: Context): string[]
}

// Default API URL, can be overridden in constructor
const DEFAULT_API_URL = 'http://localhost:8000'

export class DefaultVectorizationService implements VectorizationService {
  private apiUrl: string

  constructor(apiUrl = DEFAULT_API_URL) {
    this.apiUrl = apiUrl
  }

  async vectorizeText(text: string): Promise<number[]> {
    try {
      logger.debug('Vectorizing text', { textLength: text.length })
      
      const response = await fetch(`${this.apiUrl}/vectorize/text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`)
      }

      const result = await response.json()
      return result.embedding
    } catch (error) {
      logger.error('Error vectorizing text', error as Error)
      throw new ApiError(
        'Failed to vectorize text',
        'VECTORIZATION_ERROR',
        500,
        { cause: error, textLength: text.length }
      )
    }
  }

  async vectorizeSong(song: Song): Promise<number[]> {
    try {
      logger.debug('Vectorizing song', { 
        title: song.track.title, 
        artist: song.track.artist 
      })
      
      const response = await fetch(`${this.apiUrl}/vectorize/song`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analyses: [song] })
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`)
      }

      const result = await response.json()
      return result.results[0].embedding
    } catch (error) {
      logger.error('Error vectorizing song', error as Error, { 
        title: song.track.title, 
        artist: song.track.artist 
      })
      throw new ApiError(
        'Failed to vectorize song',
        'VECTORIZATION_ERROR',
        500,
        { cause: error, song: `${song.track.artist} - ${song.track.title}` }
      )
    }
  }

  async vectorizePlaylist(playlist: Playlist): Promise<number[]> {
    try {
      logger.debug('Vectorizing playlist', { playlistId: playlist.id })
      
      const response = await fetch(`${this.apiUrl}/vectorize/playlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playlist })
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`)
      }

      const result = await response.json()
      return result.embedding
    } catch (error) {
      logger.error('Error vectorizing playlist', error as Error, { playlistId: playlist.id })
      throw new ApiError(
        'Failed to vectorize playlist',
        'VECTORIZATION_ERROR',
        500,
        { cause: error, playlistId: playlist.id }
      )
    }
  }

  async getSentimentScores(text: string): Promise<SentimentScore> {
    try {
      if (!text || text.trim().length === 0) {
        return { positive: 0.33, negative: 0.33, neutral: 0.34 }
      }

      logger.debug('Getting sentiment scores', { textLength: text.length })
      
      const response = await fetch(`${this.apiUrl}/analyze/sentiment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      logger.warn('Error getting sentiment scores, returning default', error as Error)
      // Return default values instead of failing
      return { positive: 0.33, negative: 0.33, neutral: 0.34 }
    }
  }

  extractFeatureVector(
    embedding: number[], 
    featureType: 'theme' | 'mood' | 'activity' | 'intensity', 
    dimensions?: number
  ): number[] {
    if (!embedding || embedding.length === 0) {
      return []
    }

    // Determine vector slicing based on feature type
    const dim = dimensions || Math.floor(embedding.length / 5)

    switch (featureType) {
      case 'theme':
        // First segment for themes (concepts, topics)
        return embedding.slice(0, dim)
      case 'mood':
        // Middle segment for emotional content
        const moodStart = Math.floor(embedding.length * 0.4)
        return embedding.slice(moodStart, moodStart + dim)
      case 'activity':
        // Last segment for activities and contexts
        return embedding.slice(embedding.length - dim)
      case 'intensity':
        // Small segment focused on intensity
        const intensityStart = Math.floor(embedding.length * 0.7)
        return embedding.slice(intensityStart, intensityStart + Math.floor(dim / 2))
      default:
        return embedding
    }
  }

  extractThemesText(data: Song | Playlist): string {
    const meaning = 'analysis' in data ? data.analysis.meaning : data.meaning

    // Extract theme names and descriptions with confidence weighting
    const themes = meaning.themes || []

    // Prioritize higher confidence themes
    const themeTexts = themes.map(t => {
      const confidence = t.confidence || 0.5
      const name = t.name || ''
      const description = t.description || ''

      // Repeat high confidence themes more for emphasis
      const repetitions = Math.max(1, Math.round(confidence * 3))
      return Array(repetitions).fill(`${name} ${description}`).join(' ')
    }).filter(Boolean)

    // Get main message
    let mainMessage = meaning.main_message || ''
    if (!mainMessage && meaning.interpretation) {
      mainMessage = meaning.interpretation.main_message || ''
    }

    // Combine all theme information
    return [...themeTexts, mainMessage].join(' ')
  }

  extractMoodText(data: Song | Playlist): string {
    const emotional = 'analysis' in data ? data.analysis.emotional : data.emotional

    // Extract mood and description
    const dominantMood = emotional.dominantMood?.mood || ''
    const moodDescription = emotional.dominantMood?.description || ''

    // Add intensity descriptor if available
    const intensity = emotional.intensity_score
    let intensityText = ''

    if (intensity !== undefined) {
      if (intensity > 0.8) intensityText = 'very intense'
      else if (intensity > 0.6) intensityText = 'intense'
      else if (intensity > 0.4) intensityText = 'moderate'
      else if (intensity > 0.2) intensityText = 'mild'
      else intensityText = 'subtle'
    }

    // Combine mood information
    return [dominantMood, moodDescription, intensityText].filter(Boolean).join(' ')
  }

  extractActivities(context?: Context): string[] {
    if (!context) return []

    const activities: string[] = []

    // Add setting as an activity
    if (context.primary_setting) {
      activities.push(context.primary_setting)
    }

    // Add perfect_for activities
    if (context.situations?.perfect_for) {
      activities.push(...context.situations.perfect_for)
    }

    return activities
  }
}