import type { MatchResult, MatchScores, Playlist, Song } from '~/lib/models/Matching'
import { MatchRepository } from '~/lib/repositories/MatchRepository'
import { logger } from '~/lib/logging/Logger'
import { MATCHING_WEIGHTS } from './matching-config'
import type { SongAnalysis } from '../analysis/analysis-schemas'
import type { ReccoBeatsAudioFeatures } from '../reccobeats/ReccoBeatsService'
import type { VectorizationService } from '../vectorization/VectorizationService'
import type { SemanticMatcher } from '../semantic/SemanticMatcher'

interface PlaylistProfile {
  vector: number[]
  genres: string[]
  moods: string[]
  themes: string[]
  audioFeatures?: ReccoBeatsAudioFeatures[]  // Audio features from playlist songs
  avgAudioFeatures?: Partial<ReccoBeatsAudioFeatures>  // Average audio features
  listeningContexts?: Record<string, number>  // Average listening context scores
  emotionalJourneyTypes?: string[]  // Types of emotional journeys
  existingSongs?: Song[]  // Sample of existing songs for flow calculation
  method: 'learned_from_songs' | 'from_description'
}

export class MatchingService {
  constructor(
    private readonly matchRepository: MatchRepository,
    private readonly vectorization: VectorizationService,
    private readonly semanticMatcher: SemanticMatcher
  ) {}

  /**
   * Main matching function using hybrid approach
   */
  async matchSongsToPlaylist(
    playlist: Playlist,
    songs: Song[],
    existingPlaylistSongs: Song[] = []
  ): Promise<MatchResult[]> {
    try {
      logger.info('Starting hybrid matching', {
        playlistId: playlist.id,
        songCount: songs.length,
        existingSongs: existingPlaylistSongs.length
      })

      // Fetch audio features for all songs in parallel
      // Note: Audio features now come from song analysis JSON

      // Profile the playlist
      const profile = await this.profilePlaylist(playlist, existingPlaylistSongs)

      // Process songs in parallel with progress tracking
      const results = await Promise.all(
        songs.map(song => this.scoreSong(song, profile))
      )

      // Sort by score
      results.sort((a, b) => b.similarity - a.similarity)

      logger.info('Matching completed', {
        playlistId: playlist.id,
        topScore: results[0]?.similarity,
        matchesAbove70: results.filter(r => r.similarity >= 0.7).length
      })

      return results
    } catch (error) {
      logger.error('Error in hybrid matching', error as Error)
      throw error
    }
  }

  /**
   * Profile playlist from existing songs or metadata
   */
  private async profilePlaylist(
    playlist: Playlist,
    existingSongs: Song[] = []
  ): Promise<PlaylistProfile> {
    if (existingSongs.length >= 3) {
      // Learn from existing songs
      return this.profileFromSongs(playlist, existingSongs)
    } else {
      // Use playlist metadata and description
      return this.profileFromDescription(playlist)
    }
  }

  /**
   * Learn playlist profile from its songs
   */
  private async profileFromSongs(
    playlist: Playlist,
    songs: Song[]
  ): Promise<PlaylistProfile> {
    logger.debug('Profiling playlist from songs', { count: songs.length })

    // Get embeddings for a sample of songs (increased from 10 to 20)
    const sampleSize = Math.min(20, songs.length)
    const sampledSongs = songs.slice(0, sampleSize)

    // Use VectorizationService for embeddings (benefits from cache)
    const embeddings = await Promise.all(
      sampledSongs.map(song => this.vectorization.vectorizeSong(song))
    )

    // Calculate centroid of embeddings
    const vectors = embeddings.filter(Boolean) as number[][]
    const centroid = this.calculateCentroid(vectors)

    // Extract patterns
    const genres = this.extractCommonGenres(songs)
    const moods = this.extractCommonMoods(songs)
    const themes = this.extractCommonThemes(songs)

    // Extract listening contexts averages
    const listeningContexts = this.extractAverageListeningContexts(songs)

    // Extract emotional journey types
    const emotionalJourneyTypes = this.extractEmotionalJourneyTypes(songs)

    // Get audio features for sampled songs
    const audioFeatures: ReccoBeatsAudioFeatures[] = []
    let avgAudioFeatures: Partial<ReccoBeatsAudioFeatures> = {}

    for (const song of sampledSongs) {
      // Get audio features from analysis if available
      if (song.analysis?.audio_features) {
        audioFeatures.push(song.analysis.audio_features as ReccoBeatsAudioFeatures)
      }
    }

    // Calculate average audio features
    if (audioFeatures.length > 0) {
      avgAudioFeatures = this.calculateAverageAudioFeatures(audioFeatures)
    }

    return {
      vector: centroid,
      genres,
      moods,
      themes,
      audioFeatures: audioFeatures.length > 0 ? audioFeatures : undefined,
      avgAudioFeatures,
      listeningContexts,
      emotionalJourneyTypes,
      existingSongs: songs.slice(0, 10),
      method: 'learned_from_songs'
    }
  }

  /**
   * Create profile from playlist description
   */
  private async profileFromDescription(playlist: Playlist): Promise<PlaylistProfile> {
    logger.debug('Profiling playlist from description', { playlistId: playlist.id })

    // Use VectorizationService for playlist embedding (benefits from cache)
    const vector = await this.vectorization.vectorizePlaylist(playlist)

    // Extract metadata from playlist analysis
    const moods = playlist.emotional?.dominantMood ? [playlist.emotional.dominantMood.mood] : []
    const themes = playlist.meaning?.core_themes?.map(t => t.name) || []

    return {
      vector,
      genres: [], // TODO: Extract from Last.fm when available
      moods,
      themes,
      method: 'from_description'
    }
  }

  /**
   * Score a single song against the playlist profile
   */
  private async scoreSong(song: Song, profile: PlaylistProfile): Promise<MatchResult> {
    // Get embedding for the song using VectorizationService (cached)
    const songEmbedding = await this.vectorization.vectorizeSong(song)

    // Tier 1: Quick metadata scoring with semantic mood matching
    const metadataScore = await this.calculateMetadataScore(song, profile)

    // Tier 2: Vector similarity
    const vectorScore = songEmbedding && profile.vector
      ? this.cosineSimilarity(songEmbedding, profile.vector)
      : 0

    // Tier 3: Audio features from analysis
    let audioScore = 0
    if (song.analysis?.audio_features && profile.avgAudioFeatures) {
      // Use audio features from analysis
      audioScore = this.calculateAudioFeatureScoreFromAnalysis(song.analysis.audio_features, profile)
    }

    // Tier 4: Deep analysis (only for high-potential matches)
    let contextScore = 0
    let thematicScore = 0
    let flowScore = 0.5 // Default neutral

    // Use weighted early scores to decide if deep analysis is worth it
    // This respects the same importance hierarchy as final scoring
    const weights = this.getAdaptiveWeights(song, profile)
    const weightedEarlyScore =
      weights.metadata * metadataScore +
      weights.vector * vectorScore +
      weights.audio * audioScore

    if (song.analysis && weightedEarlyScore > MATCHING_WEIGHTS.tiers.deepAnalysisThreshold) {
      contextScore = this.calculateContextAlignment(song, profile)
      thematicScore = await this.calculateThematicAlignment(song, profile)
      // Calculate flow compatibility if we have existing playlist songs
      if (profile.audioFeatures && profile.audioFeatures.length > 0) {
        flowScore = this.calculateFlowCompatibility(song, profile.existingSongs || [])
      }
    }

    // Reuse weights from above for final score calculation

    const finalScore =
      weights.metadata * metadataScore +
      weights.vector * vectorScore +
      weights.audio * audioScore +
      weights.context * contextScore +
      weights.thematic * thematicScore +
      weights.flow * flowScore

    // Build component scores for transparency
    const moodScore = await this.extractMoodScore(song, profile)
    const componentScores: MatchScores = {
      theme_similarity: thematicScore,
      mood_similarity: moodScore,
      mood_compatibility: moodScore,
      sentiment_compatibility: 0.5, // Default
      intensity_match: 0.5, // Default
      activity_match: 0.5, // Default
      fit_score_similarity: vectorScore,
      thematic_contradiction: 0
    }

    return {
      track_info: song.track,
      similarity: finalScore,
      component_scores: componentScores,
      veto_applied: finalScore < MATCHING_WEIGHTS.scoring.vetoThreshold,
      veto_reason: finalScore < MATCHING_WEIGHTS.scoring.vetoThreshold ? 'Low compatibility' : undefined
    }
  }

  /**
   * Calculate metadata score with semantic mood matching
   */
  private async calculateMetadataScore(song: Song, profile: PlaylistProfile): Promise<number> {
    let score = 0
    let factors = 0

    // Genre matching
    if (profile.genres.length > 0) {
      factors++
      // Note: In production, we'd get genres from Last.fm API
      const genreMatch = this.checkGenreMatch(song, profile.genres)
      if (genreMatch) score += MATCHING_WEIGHTS.scoring.genre.weight
    }

    // Mood matching (semantic)
    if (profile.moods.length > 0 && song.analysis?.emotional?.dominant_mood) {
      factors++
      const songMood = song.analysis.emotional.dominant_mood

      // Use semantic matching for moods
      let moodMatch = false
      for (const profileMood of profile.moods) {
        if (await this.semanticMatcher.areSimilar(songMood, profileMood, 0.6)) {
          moodMatch = true
          break
        }
      }

      if (moodMatch) score += (MATCHING_WEIGHTS.scoring.mood.match - MATCHING_WEIGHTS.scoring.mood.neutral)
    }

    // Era matching (if we had release date)
    // This would be added when we have more metadata

    return factors > 0 ? score : 0 // No metadata to match against - let other factors determine score
  }

  /**
   * Calculate context alignment using listening contexts and audience
   */
  private calculateContextAlignment(song: Song, profile: PlaylistProfile): number {
    if (!song.analysis?.context || !profile.listeningContexts) {
      return 0
    }

    let score = 0
    let factors = 0

    // Compare listening contexts
    const songContexts = song.analysis.context.listening_contexts
    if (songContexts && profile.listeningContexts) {
      Object.entries(profile.listeningContexts).forEach(([context, avgScore]) => {
        if (context in songContexts) {
          factors++
          const ctxScore = songContexts[context as keyof typeof songContexts]
          // Higher score if both playlist and song are good for this context
          score += Math.min(avgScore, ctxScore)
        }
      })
    }

    // Bonus for matching audience if available
    if (song.analysis.context.audience?.resonates_with && profile.themes.length > 0) {
      const audienceMatch = song.analysis.context.audience.resonates_with.some(audience =>
        profile.themes.some(theme => audience.toLowerCase().includes(theme.toLowerCase()))
      )
      if (audienceMatch) score += 0.2
    }

    return factors > 0 ? Math.min(1, score / factors) : 0
  }

  /**
   * Calculate thematic alignment using semantic matching
   */
  private async calculateThematicAlignment(song: Song, profile: PlaylistProfile): Promise<number> {
    if (!song.analysis?.meaning?.themes || profile.themes.length === 0) {
      return 0
    }

    const songThemes = song.analysis.meaning.themes.map(t => t.name)
    const profileThemes = profile.themes

    // Use SemanticMatcher to count semantically similar themes
    const matchCount = await this.semanticMatcher.countMatches(songThemes, profileThemes)

    return Math.min(1, matchCount * MATCHING_WEIGHTS.scoring.thematic.themeWeight)
  }

  /**
   * Calculate emotional flow compatibility between songs
   */
  private calculateFlowCompatibility(song: Song, playlistSongs: Song[]): number {
    if (!song.analysis?.emotional?.journey || playlistSongs.length === 0) {
      return 0.5 // Neutral if no journey data
    }

    let totalScore = 0
    let validComparisons = 0

    // Compare with last few songs in playlist for flow
    const recentSongs = playlistSongs.slice(-3)

    recentSongs.forEach(playlistSong => {
      if (!playlistSong.analysis?.emotional) return

      validComparisons++

      // Check mood compatibility
      const moodTransition = this.getMoodTransitionScore(
        playlistSong.analysis.emotional.dominant_mood,
        song.analysis.emotional.dominant_mood
      )

      // Check energy transition
      const energyDiff = Math.abs(
        (playlistSong.analysis.emotional.energy || 0.5) -
        (song.analysis.emotional.energy || 0.5)
      )
      const energyScore = 1 - (energyDiff * 0.5) // Gentle penalty for big jumps

      // Check valence transition
      const valenceDiff = Math.abs(
        (playlistSong.analysis.emotional.valence || 0.5) -
        (song.analysis.emotional.valence || 0.5)
      )
      const valenceScore = 1 - (valenceDiff * 0.3) // Even gentler penalty

      totalScore += (moodTransition * 0.5 + energyScore * 0.3 + valenceScore * 0.2)
    })

    return validComparisons > 0 ? totalScore / validComparisons : 0.5
  }

  /**
   * Get mood transition score
   */
  private getMoodTransitionScore(fromMood: string, toMood: string): number {
    // Define good mood transitions
    const goodTransitions: Record<string, string[]> = {
      'happy': ['euphoric', 'nostalgic', 'empowered', 'relaxed'],
      'sad': ['melancholic', 'nostalgic', 'anxious', 'angry'],
      'angry': ['empowered', 'anxious', 'sad', 'aggressive'],
      'anxious': ['relaxed', 'sad', 'angry', 'contemplative'],
      'nostalgic': ['happy', 'sad', 'melancholic', 'contemplative'],
      'empowered': ['happy', 'euphoric', 'angry', 'confident'],
      'melancholic': ['sad', 'nostalgic', 'contemplative', 'relaxed'],
      'euphoric': ['happy', 'empowered', 'energetic', 'confident'],
      'relaxed': ['happy', 'nostalgic', 'contemplative', 'peaceful'],
      'contemplative': ['nostalgic', 'melancholic', 'relaxed', 'peaceful']
    }

    if (fromMood === toMood) return 1.0
    if (goodTransitions[fromMood]?.includes(toMood)) return 0.8
    if (Object.values(goodTransitions).some(moods =>
      moods.includes(fromMood) && moods.includes(toMood)
    )) return 0.6
    return 0.3 // Different moods can still work
  }

  /**
   * Get adaptive weights based on available data
   */
  private getAdaptiveWeights(song: Song, profile: PlaylistProfile): {
    metadata: number
    vector: number
    audio: number
    context: number
    thematic: number
    flow: number
  } {
    // If we have audio features and full analysis, use all data
    if (profile.audioFeatures && profile.audioFeatures.length > 0 && song.analysis) {
      return MATCHING_WEIGHTS.profiles.fullDataAvailable
    }

    // If we learned from songs and have full analysis but no audio
    if (profile.method === 'learned_from_songs' && song.analysis && !profile.audioFeatures) {
      return MATCHING_WEIGHTS.profiles.learnedWithAnalysis
    }

    // If only description-based profile, rely more on vectors
    if (profile.method === 'from_description') {
      return MATCHING_WEIGHTS.profiles.fromDescription
    }

    // Default balanced weights
    return MATCHING_WEIGHTS.profiles.default
  }

  /**
   * Extract audio features from songs that have them in their analysis
   */
  private extractAudioFeaturesFromSongs(songs: Song[]): ReccoBeatsAudioFeatures[] {
    const features: ReccoBeatsAudioFeatures[] = []
    
    songs.forEach(song => {
      if (song.analysis?.audio_features) {
        features.push(song.analysis.audio_features as ReccoBeatsAudioFeatures)
      }
    })
    
    return features

  }

  /**
   * Calculate audio features score using features from analysis
   */
  private calculateAudioFeatureScoreFromAnalysis(
    songFeatures: NonNullable<SongAnalysis['audio_features']>,
    profile: PlaylistProfile
  ): number {
    if (!profile.avgAudioFeatures) return 0.5

    // Compare with average playlist features
    const avgFeatures = profile.avgAudioFeatures
    let score = 0
    let factors = 0

    // Energy comparison
    if (avgFeatures.energy !== undefined) {
      factors++
      score += 1 - Math.abs(songFeatures.energy - avgFeatures.energy)
    }

    // Valence comparison
    if (avgFeatures.valence !== undefined) {
      factors++
      score += 1 - Math.abs(songFeatures.valence - avgFeatures.valence)
    }

    // Danceability comparison
    if (avgFeatures.danceability !== undefined) {
      factors++
      score += 1 - Math.abs(songFeatures.danceability - avgFeatures.danceability)
    }

    // Tempo comparison (normalized)
    if (avgFeatures.tempo !== undefined) {
      factors++
      const tempoScore = 1 - Math.abs(
        (songFeatures.tempo - avgFeatures.tempo) / 100
      ) // Normalize by 100 BPM difference
      score += Math.max(0, Math.min(1, tempoScore))
    }

    // Acousticness comparison
    if (avgFeatures.acousticness !== undefined) {
      factors++
      score += 1 - Math.abs(songFeatures.acousticness - avgFeatures.acousticness)
    }

    return factors > 0 ? score / factors : 0.5
  }

  /**
   * Calculate audio features similarity score
   */
  private async calculateAudioFeatureScore(
    song: Song,
    playlistFeatures: ReccoBeatsAudioFeatures[]
  ): Promise<number> {
    if (!song.id || playlistFeatures.length === 0) return 0

    try {
      const songFeatures = song.analysis?.audio_features

      // Calculate average similarity to playlist songs
      let totalScore = 0
      let count = 0

      for (const pFeatures of playlistFeatures) {
        const score = this.compareAudioFeatures(songFeatures as ReccoBeatsAudioFeatures, pFeatures)
        totalScore += score
        count++
      }

      return count > 0 ? totalScore / count : 0
    } catch (error) {
      logger.error('Error calculating audio feature score', {
        songId: song.id,
        error: error instanceof Error ? error.message : String(error)
      })
      return 0
    }
  }

  /**
   * Compare two sets of audio features
   */
  private compareAudioFeatures(
    features1: ReccoBeatsAudioFeatures,
    features2: ReccoBeatsAudioFeatures
  ): number {
    // Weight different features based on importance for playlist cohesion
    const weights = {
      energy: 0.25,
      valence: 0.2,   // Musical positivity
      danceability: 0.15,
      acousticness: 0.1,
      instrumentalness: 0.1,
      tempo: 0.15,    // Normalized tempo difference
      speechiness: 0.025,
      liveness: 0.025
    }

    let score = 0
    let totalWeight = 0

    // Direct feature comparisons (0-1 scale) - only compare available features
    if (features1.energy !== undefined && features2.energy !== undefined) {
      score += weights.energy * (1 - Math.abs(features1.energy - features2.energy))
      totalWeight += weights.energy
    }
    if (features1.valence !== undefined && features2.valence !== undefined) {
      score += weights.valence * (1 - Math.abs(features1.valence - features2.valence))
      totalWeight += weights.valence
    }
    if (features1.danceability !== undefined && features2.danceability !== undefined) {
      score += weights.danceability * (1 - Math.abs(features1.danceability - features2.danceability))
      totalWeight += weights.danceability
    }
    if (features1.acousticness !== undefined && features2.acousticness !== undefined) {
      score += weights.acousticness * (1 - Math.abs(features1.acousticness - features2.acousticness))
      totalWeight += weights.acousticness
    }
    if (features1.instrumentalness !== undefined && features2.instrumentalness !== undefined) {
      score += weights.instrumentalness * (1 - Math.abs(features1.instrumentalness - features2.instrumentalness))
      totalWeight += weights.instrumentalness
    }
    if (features1.speechiness !== undefined && features2.speechiness !== undefined) {
      score += weights.speechiness * (1 - Math.abs(features1.speechiness - features2.speechiness))
      totalWeight += weights.speechiness
    }
    if (features1.liveness !== undefined && features2.liveness !== undefined) {
      score += weights.liveness * (1 - Math.abs(features1.liveness - features2.liveness))
      totalWeight += weights.liveness
    }

    // Tempo similarity (normalized to 0-1)
    if (features1.tempo !== undefined && features2.tempo !== undefined) {
      const tempoDiff = Math.abs(features1.tempo - features2.tempo)
      const maxTempoDiff = 100 // Consider 100 BPM difference as maximum
      const tempoScore = 1 - Math.min(tempoDiff / maxTempoDiff, 1)
      score += weights.tempo * tempoScore
      totalWeight += weights.tempo
    }

    // Note: Musical key comparison removed as it's not available in ReccoBeats features

    // Normalize score by the total weight of compared features
    return totalWeight > 0 ? score / totalWeight : 0
  }

  // Helper methods
  private cosineSimilarity(vec1: number[], vec2: number[]): number {
    if (!vec1 || !vec2 || vec1.length !== vec2.length) return 0

    let dotProduct = 0
    let mag1 = 0
    let mag2 = 0

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i]
      mag1 += vec1[i] * vec1[i]
      mag2 += vec2[i] * vec2[i]
    }

    if (mag1 === 0 || mag2 === 0) return 0

    return dotProduct / (Math.sqrt(mag1) * Math.sqrt(mag2))
  }

  private calculateCentroid(vectors: number[][]): number[] {
    if (vectors.length === 0) return []

    const dim = vectors[0].length
    const centroid = new Array(dim).fill(0)

    for (const vec of vectors) {
      for (let i = 0; i < dim; i++) {
        centroid[i] += vec[i]
      }
    }

    return centroid.map(v => v / vectors.length)
  }

  private extractCommonGenres(songs: Song[]): string[] {
    // TODO: Implement Last.fm genre extraction
    // Will get genres from Last.fm API for each artist/track
    // No hardcoded genre inference - wait for actual API integration
    return []
  }

  private extractCommonMoods(songs: Song[]): string[] {
    const moodCount = new Map<string, number>()

    songs.forEach(song => {
      const mood = song.analysis?.emotional?.dominant_mood
      if (mood) {
        moodCount.set(mood, (moodCount.get(mood) || 0) + 1)
      }
    })

    return Array.from(moodCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([mood]) => mood)
  }

  private extractCommonThemes(songs: Song[]): string[] {
    const themeCount = new Map<string, number>()

    songs.forEach(song => {
      const themes = song.analysis?.meaning?.themes || []
      themes.forEach(theme => {
        if (theme.name) {
          themeCount.set(theme.name, (themeCount.get(theme.name) || 0) + 1)
        }
      })
    })

    return Array.from(themeCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([theme]) => theme)
  }


  private checkGenreMatch(song: Song, profileGenres: string[]): boolean {
    // TODO: Implement Last.fm genre integration
    // For now, return false since we don't have genre data
    return false
  }

  private async extractMoodScore(song: Song, profile: PlaylistProfile): Promise<number> {
    if (!song.analysis?.emotional?.dominant_mood || profile.moods.length === 0) {
      return 0.5
    }

    const songMood = song.analysis.emotional.dominant_mood

    // Use semantic matching for moods
    for (const profileMood of profile.moods) {
      if (await this.semanticMatcher.areSimilar(songMood, profileMood, 0.6)) {
        return MATCHING_WEIGHTS.scoring.mood.match
      }
    }

    return MATCHING_WEIGHTS.scoring.mood.noMatch
  }

  /**
   * Extract average listening contexts from songs
   */
  private extractAverageListeningContexts(songs: Song[]): Record<string, number> {
    const contextSums: Record<string, number> = {}
    const contextCounts: Record<string, number> = {}

    songs.forEach(song => {
      const contexts = song.analysis?.context?.listening_contexts
      if (contexts) {
        Object.entries(contexts).forEach(([context, score]) => {
          // Ensure score is a number (guard against string/null values)
          const numScore = typeof score === 'number' ? score : 0
          contextSums[context] = (contextSums[context] || 0) + numScore
          contextCounts[context] = (contextCounts[context] || 0) + 1
        })
      }
    })

    const avgContexts: Record<string, number> = {}
    Object.keys(contextSums).forEach(context => {
      avgContexts[context] = contextSums[context] / contextCounts[context]
    })

    return avgContexts
  }

  /**
   * Extract emotional journey types from songs
   */
  private extractEmotionalJourneyTypes(songs: Song[]): string[] {
    const journeyTypes = new Set<string>()

    songs.forEach(song => {
      const journey = song.analysis?.emotional?.journey
      if (journey && journey.length > 0) {
        // Analyze journey pattern
        const moods = journey.map(j => j.mood)
        if (moods.length >= 2) {
          const start = moods[0]
          const end = moods[moods.length - 1]

          // Determine journey type
          if (start === end) {
            journeyTypes.add('cyclical')
          } else if (['happy', 'euphoric', 'empowered'].includes(end) &&
            ['sad', 'anxious', 'melancholic'].includes(start)) {
            journeyTypes.add('ascending')
          } else if (['sad', 'melancholic', 'contemplative'].includes(end) &&
            ['happy', 'euphoric', 'energetic'].includes(start)) {
            journeyTypes.add('descending')
          } else {
            journeyTypes.add('complex')
          }
        }
      }
    })

    return Array.from(journeyTypes)
  }

  /**
   * Calculate average audio features
   */
  private calculateAverageAudioFeatures(features: ReccoBeatsAudioFeatures[]): Partial<ReccoBeatsAudioFeatures> {
    if (features.length === 0) return {}

    const avg: Partial<ReccoBeatsAudioFeatures> = {}
    const keys: (keyof ReccoBeatsAudioFeatures)[] = [
      'energy', 'valence', 'danceability', 'acousticness',
      'instrumentalness', 'speechiness', 'liveness', 'tempo', 'loudness'
    ]

    keys.forEach(key => {
      const values = features
        .map(f => f[key])
        .filter(v => v !== undefined && v !== null) as number[]

      if (values.length > 0) {
        avg[key] = values.reduce((sum, v) => sum + v, 0) / values.length as any
      }
    })

    return avg
  }
}