import { MatchResult, MatchScores, Playlist, PlaylistType, Song, Track } from '../../domain/Matching'
import { MatchRepository } from '../../repositories/MatchRepository'
import { VectorizationService } from '../vectorization/VectorizationService'
import { ApiError } from '../../errors/ApiError'
import { logger } from '../../logging/Logger'

export class MatchingService {
  private readonly MODEL_NAME = 'sentence-transformers/all-MiniLM-L6-v2'

  constructor(
    private readonly vectorizationService: VectorizationService,
    private readonly matchRepository: MatchRepository
  ) { }

  /**
   * Match a single song against multiple playlists and return the best matches
   */
  async matchSongToPlaylists(
    song: Song,
    playlists: Playlist[]
  ): Promise<Array<{ playlist: Playlist; matchResult: MatchResult }>> {
    try {
      logger.info('Matching song to playlists', {
        title: song.track.title,
        artist: song.track.artist,
        playlistCount: playlists.length
      })

      // Get song embedding once to reuse for all playlists
      const songEmbedding = await this.vectorizationService.vectorizeSong(song)

      // Match against each playlist in parallel
      const matchPromises = playlists.map(async (playlist) => {
        const matchResult = await this.matchSongToPlaylist(song, playlist, songEmbedding)
        return { playlist, matchResult }
      })

      const results = await Promise.all(matchPromises)

      // Sort by similarity score (highest first)
      const sortedResults = results.sort((a, b) =>
        b.matchResult.similarity - a.matchResult.similarity
      )

      logger.info('Matched song to playlists', {
        title: song.track.title,
        artist: song.track.artist,
        bestMatch: sortedResults[0]?.playlist.id,
        bestScore: sortedResults[0]?.matchResult.similarity
      })

      return sortedResults
    } catch (error) {
      logger.error('Error matching song to playlists', error as Error)
      throw new ApiError(
        'Failed to match song to playlists',
        'MATCHING_ERROR',
        500,
        { cause: error, song: `${song.track.artist} - ${song.track.title}` }
      )
    }
  }

  /**
   * Match multiple songs to a single playlist and return the best matches
   */
  async matchSongsToPlaylist(
    playlist: Playlist,
    songs: Song[]
  ): Promise<MatchResult[]> {
    try {
      logger.info('Matching songs to playlist', {
        playlistId: playlist.id,
        songCount: songs.length
      })

      // Get playlist embedding once to reuse for all songs
      const playlistEmbedding = await this.vectorizationService.vectorizePlaylist(playlist)

      // Match each song in parallel
      const matchPromises = songs.map(async (song) => {
        try {
          const songEmbedding = await this.vectorizationService.vectorizeSong(song)
          return this.calculateMatchScores(song, playlist, songEmbedding, playlistEmbedding)
        } catch (error) {
          logger.error('Error matching song to playlist', error as Error, {
            songTitle: song.track.title,
            playlistId: playlist.id
          })
          // Return a very low match score instead of failing the entire batch
          return {
            track_info: song.track,
            similarity: 0.01,
            component_scores: this.getDefaultMatchScores(),
            veto_applied: true,
            veto_reason: 'Error calculating match scores'
          }
        }
      })

      const results = await Promise.all(matchPromises)

      // Sort by similarity score (highest first)
      const sortedResults = results.sort((a, b) => b.similarity - a.similarity)

      logger.info('Matched songs to playlist', {
        playlistId: playlist.id,
        songCount: songs.length,
        topScore: sortedResults[0]?.similarity
      })

      // Save match results to database for top matches
      const topMatches = sortedResults.slice(0, 100) // Limit to top 100 matches
      for (const result of topMatches) {
        if (
          Number.isInteger(Number(result.track_info.id))
        ) {
          // †odo: nao preciso guardar para a DB
          // objectivo e fazer Spotify API calls, adictionando as top matches para a playlist que se fez o matching
          try {
          } catch (error) {
          }
        }
      }

      return sortedResults
    } catch (error) {
      logger.error('Error matching songs to playlist', error as Error)
      throw new ApiError(
        'Failed to match songs to playlist',
        'MATCHING_ERROR',
        500,
        { cause: error, playlistId: playlist.id }
      )
    }
  }

  /**
   * Find the best playlist match for a song
   */
  async getBestPlaylistForSong(
    song: Song,
    playlists: Playlist[]
  ): Promise<{ playlist: Playlist; matchResult: MatchResult } | null> {
    try {
      const matches = await this.matchSongToPlaylists(song, playlists)

      // Filter out low-quality matches
      const goodMatches = matches.filter(m => m.matchResult.similarity > 0.6 && !m.matchResult.veto_applied)

      if (goodMatches.length === 0) {
        logger.info('No good playlist matches found for song', {
          title: song.track.title,
          artist: song.track.artist,
          bestScore: matches[0]?.matchResult.similarity
        })
        return null
      }

      return goodMatches[0]
    } catch (error) {
      logger.error('Error getting best playlist for song', error as Error)
      throw new ApiError(
        'Failed to get best playlist for song',
        'MATCHING_ERROR',
        500,
        { cause: error, song: `${song.track.artist} - ${song.track.title}` }
      )
    }
  }

  /**
   * Match a single song to a single playlist
   */
  private async matchSongToPlaylist(
    song: Song,
    playlist: Playlist,
    songEmbedding?: number[]
  ): Promise<MatchResult> {
    try {
      // Get embeddings if not provided
      const songEmbed = songEmbedding || await this.vectorizationService.vectorizeSong(song)
      const playlistEmbed = await this.vectorizationService.vectorizePlaylist(playlist)

      // Calculate match scores
      return await this.calculateMatchScores(song, playlist, songEmbed, playlistEmbed)
    } catch (error) {
      logger.error('Error matching song to playlist', error as Error)
      throw new ApiError(
        'Failed to match song to playlist',
        'MATCHING_ERROR',
        500,
        {
          cause: error,
          song: `${song.track.artist} - ${song.track.title}`,
          playlistId: playlist.id
        }
      )
    }
  }

  /**
   * Calculate detailed match scores between a song and playlist
   */
  private async calculateMatchScores(
    song: Song,
    playlist: Playlist,
    songEmbedding: number[],
    playlistEmbedding: number[]
  ): Promise<MatchResult> {
    // Extract feature-specific vectors
    const songThemeVector = this.vectorizationService.extractFeatureVector(songEmbedding, 'theme')
    const songMoodVector = this.vectorizationService.extractFeatureVector(songEmbedding, 'mood')
    const songActivityVector = this.vectorizationService.extractFeatureVector(songEmbedding, 'activity')

    const playlistThemeVector = this.vectorizationService.extractFeatureVector(playlistEmbedding, 'theme')
    const playlistMoodVector = this.vectorizationService.extractFeatureVector(playlistEmbedding, 'mood')
    const playlistActivityVector = this.vectorizationService.extractFeatureVector(playlistEmbedding, 'activity')

    // Calculate theme similarity
    const theme_similarity = this.calculateEnhancedSimilarity(
      playlistThemeVector,
      songThemeVector
    )

    // Calculate mood similarity
    const mood_similarity = this.calculateEnhancedSimilarity(
      playlistMoodVector,
      songMoodVector
    )

    // Calculate activity match using both vector similarity and lexical matching
    const activityVectorMatch = this.calculateEnhancedSimilarity(
      playlistActivityVector,
      songActivityVector
    )

    const playlistActivities = this.vectorizationService.extractActivities(playlist.context)
    const songActivities = this.vectorizationService.extractActivities(song.analysis.context)
    const activityLexicalMatch = this.calculateActivityMatch(playlistActivities, songActivities)

    const activity_match = activityLexicalMatch * 0.7 + activityVectorMatch * 0.3

    // Get mood compatibility
    const mood_compatibility = await this.calculateMoodCompatibility(
      playlist.emotional?.dominantMood,
      song.analysis.emotional?.dominantMood,
      playlistMoodVector,
      songMoodVector
    )

    // Calculate sentiment compatibility
    const playlistThemeText = this.vectorizationService.extractThemesText(playlist)
    const playlistMoodText = this.vectorizationService.extractMoodText(playlist)
    const songThemeText = this.vectorizationService.extractThemesText(song)
    const songMoodText = this.vectorizationService.extractMoodText(song)

    const playlistSentiment = await this.vectorizationService.getSentimentScores(
      `${playlistThemeText} ${playlistMoodText}`
    )

    const songSentiment = await this.vectorizationService.getSentimentScores(
      `${songThemeText} ${songMoodText}`
    )

    const sentiment_compatibility = this.calculateSentimentCompatibility(
      playlistSentiment,
      songSentiment
    )

    // Calculate intensity match
    const intensity_match = this.calculateIntensityMatch(
      playlist.emotional?.intensity_score,
      song.analysis.emotional?.intensity_score
    )

    // Calculate fit score similarity
    const fit_score_similarity = this.calculateFitScoreSimilarity(
      playlist.context?.fit_scores,
      song.analysis.context?.fit_scores
    )

    // Detect thematic contradictions
    const thematicContradiction = await this.detectThematicContradictions(
      playlist.meaning.themes,
      song.analysis.meaning.themes,
      playlistThemeVector,
      songThemeVector
    )

    const thematic_contradiction = thematicContradiction.score

    // Store component scores for detailed reporting
    const component_scores: MatchScores = {
      theme_similarity,
      mood_similarity,
      mood_compatibility,
      sentiment_compatibility,
      intensity_match,
      activity_match,
      fit_score_similarity,
      thematic_contradiction
    }

    // Determine playlist type for optimal weighting
    const playlistType = this.determinePlaylistType(playlist)

    // Calculate final score
    const similarity = this.calculateFinalScore(component_scores, playlistType)

    // Check if veto was applied
    const { finalScore, vetoApplied, vetoReason } = this.applyVetoLogic(component_scores)

    logger.debug('Match scores calculated', {
      title: song.track.title,
      artist: song.track.artist,
      playlistId: playlist.id,
      similarity: finalScore,
      vetoApplied
    })

    return {
      track_info: song.track,
      similarity: finalScore,
      component_scores,
      veto_applied: vetoApplied,
      veto_reason: vetoReason
    }
  }

  /**
   * Enhanced cosine similarity with distribution stretching
   */
  private calculateEnhancedSimilarity(vec1: number[], vec2: number[]): number {
    if (!vec1 || !vec2) {
      return 0
    }

    if (vec1.length !== vec2.length) {
      return Math.min(0.1 * Math.min(vec1.length, vec2.length), 0.3)
    }

    // Calculate standard cosine similarity
    let dotProduct = 0
    let mag1 = 0
    let mag2 = 0

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i]
      mag1 += vec1[i] * vec1[i]
      mag2 += vec2[i] * vec2[i]
    }

    mag1 = Math.sqrt(mag1)
    mag2 = Math.sqrt(mag2)

    if (mag1 === 0 || mag2 === 0) {
      return 0
    }

    // Raw cosine similarity
    const rawSimilarity = dotProduct / (mag1 * mag2)

    // Apply non-linear transformation to spread out the distribution
    return (rawSimilarity >= 0.5)
      ? 0.5 + 0.5 * Math.pow((rawSimilarity - 0.5) * 2, 1.8)
      : 0.5 * Math.pow(rawSimilarity * 2, 1.4)
  }

  /**
   * Calculate activity match using lexical analysis
   */
  private calculateActivityMatch(
    playlistActivities: string[] = [],
    songActivities: string[] = []
  ): number {
    if (playlistActivities.length === 0 || songActivities.length === 0) {
      if (playlistActivities.length > 0 || songActivities.length > 0) {
        return 0.2 // At least one has activities
      }
      return 0 // No activities information
    }

    // Implement tokenization for activity matching
    const tokenizeActivities = (activities: string[]): Map<string, number> => {
      const tokenMap = new Map<string, number>()

      for (const activity of activities) {
        // Split by non-word characters and filter out short tokens
        const tokens = activity.toLowerCase()
          .split(/[\s,.-]+/)
          .filter(token => token.length > 2)

        // Add individual tokens with weights
        for (const token of tokens) {
          const currentCount = tokenMap.get(token) || 0
          tokenMap.set(token, currentCount + 1)
        }

        // Add bigrams for better phrase matching
        for (let i = 0; i < tokens.length - 1; i++) {
          const bigram = `${tokens[i]} ${tokens[i + 1]}`
          const currentCount = tokenMap.get(bigram) || 0
          tokenMap.set(bigram, currentCount + 2) // Higher weight for bigrams
        }

        // Add the complete phrase with highest weight
        const fullPhrase = activity.toLowerCase()
        if (fullPhrase.length > 0) {
          const currentCount = tokenMap.get(fullPhrase) || 0
          tokenMap.set(fullPhrase, currentCount + 3) // Highest weight for full phrases
        }
      }

      return tokenMap
    }

    const playlistTokens = tokenizeActivities(playlistActivities)
    const songTokens = tokenizeActivities(songActivities)

    // Calculate weighted token matching
    let matchScore = 0
    let totalWeight = 0

    // Check playlist tokens in song tokens
    for (const [token, weight] of playlistTokens.entries()) {
      if (songTokens.has(token)) {
        const songWeight = songTokens.get(token) || 0
        matchScore += weight * songWeight
      }
      totalWeight += weight
    }

    // Check song tokens in playlist tokens (asymmetric matching)
    for (const [token, weight] of songTokens.entries()) {
      if (!playlistTokens.has(token)) {
        totalWeight += weight
      }
    }

    if (totalWeight === 0) return 0

    // Normalize the score
    const normalizedScore = matchScore / totalWeight

    // Apply non-linear transformation to spread out values
    return Math.pow(normalizedScore, 0.7)
  }

  /**
   * Calculate enhanced mood compatibility
   */
  private async calculateMoodCompatibility(
    playlistMood?: { mood: string; description: string },
    songMood?: { mood: string; description: string },
    moodVectorPlaylist: number[] = [],
    moodVectorSong: number[] = []
  ): Promise<number> {
    if (!playlistMood?.mood || !songMood?.mood) {
      if (playlistMood?.mood || songMood?.mood) {
        return 0.3 // At least one mood is known
      }
      return 0 // No mood information
    }

    // Extract mood text
    const playlistMoodText = playlistMood.mood.toLowerCase()
    const songMoodText = songMood.mood.toLowerCase()

    // Check for mood contradictions
    const moodContradiction = await this.detectMoodContradictions(
      playlistMoodText,
      songMoodText
    )

    // Vector similarity from mood embeddings
    let vectorSimilarity = 0.5
    if (moodVectorPlaylist.length > 0 && moodVectorSong.length > 0) {
      vectorSimilarity = this.calculateEnhancedSimilarity(moodVectorPlaylist, moodVectorSong)
    }

    // Apply contradiction penalties
    let finalScore

    // Check for severe contradictions based on score
    if (moodContradiction.score > 0.7) {
      // Direct opposites get severe penalty
      finalScore = Math.max(0, 0.3 - (moodContradiction.score * 0.3))
    } else if (moodContradiction.score > 0) {
      // Partial contradictions get moderate penalty
      finalScore = Math.max(0, 0.55 - (moodContradiction.score * 0.15))
    } else {
      // No contradictions - use vector similarity with slight boost for similar moods
      finalScore = vectorSimilarity * 1.1
    }

    // Clamp to valid range
    return Math.min(1, Math.max(0, finalScore))
  }

  /**
   * Detect mood contradictions
   */
  private async detectMoodContradictions(
    playlistMood: string,
    songMood: string
  ): Promise<{ score: number; explanation: string }> {
    // Skip if we don't have both moods
    if (!playlistMood || !songMood) {
      return { score: 0, explanation: "Missing mood data" }
    }

    // Get sentiment for both moods
    const playlistSentiment = await this.vectorizationService.getSentimentScores(playlistMood)
    const songSentiment = await this.vectorizationService.getSentimentScores(songMood)

    // Determine dominant sentiment for each
    const playlistDominantSentiment = this.getHighestSentiment(playlistSentiment)
    const songDominantSentiment = this.getHighestSentiment(songSentiment)

    // Calculate contradiction strength based on sentiment differences
    let contradictionStrength = 0
    let explanation = ""

    // 1. Check for direct sentiment polarity opposition
    if (
      (playlistDominantSentiment === "positive" && songDominantSentiment === "negative") ||
      (playlistDominantSentiment === "negative" && songDominantSentiment === "positive")
    ) {
      contradictionStrength = 0.8
      explanation = `Opposing sentiment polarities: ${playlistDominantSentiment} vs ${songDominantSentiment}`
    }

    // 2. Check semantic similarity using vector embeddings
    // Fetch embeddings for both moods
    const playlistMoodVector = await this.vectorizationService.vectorizeText(playlistMood)
    const songMoodVector = await this.vectorizationService.vectorizeText(songMood)

    // Calculate semantic similarity between the two moods
    const similarity = this.calculateEnhancedSimilarity(playlistMoodVector, songMoodVector)

    // 3. Semantic distance indicates potential contradiction
    if (similarity < 0.3) {
      // Stronger contradiction if sentiment analysis also shows opposition
      if (contradictionStrength > 0) {
        contradictionStrength = Math.max(contradictionStrength, 0.9)
        explanation = `${playlistMood} and ${songMood} are semantically different with opposing sentiment`
      } else {
        contradictionStrength = 0.7
        explanation = `${playlistMood} and ${songMood} are semantically distant (${similarity.toFixed(2)} similarity)`
      }
    }
    // 4. Moderate semantic distance
    else if (similarity < 0.5) {
      // If sentiment analysis showed some opposition, increase strength
      if (contradictionStrength > 0) {
        // Keep existing contradiction strength
        explanation = `${explanation} with moderate semantic distance`
      } else if (
        playlistDominantSentiment !== songDominantSentiment &&
        playlistDominantSentiment !== "neutral" &&
        songDominantSentiment !== "neutral"
      ) {
        contradictionStrength = 0.5
        explanation = `${playlistMood} and ${songMood} have different emotional tones`
      }
    }

    // If no contradiction found through any method
    if (contradictionStrength === 0) {
      explanation = `No significant contradiction between ${playlistMood} and ${songMood}`
    }

    return {
      score: contradictionStrength,
      explanation
    }
  }

  /**
   * Get the highest sentiment from a sentiment score object
   */
  private getHighestSentiment(
    sentiment: { positive: number; negative: number; neutral: number }
  ): 'positive' | 'negative' | 'neutral' {
    if (sentiment.positive > sentiment.negative && sentiment.positive > sentiment.neutral) {
      return 'positive'
    }
    if (sentiment.negative > sentiment.positive && sentiment.negative > sentiment.neutral) {
      return 'negative'
    }
    return 'neutral'
  }

  /**
   * Detect thematic contradictions between playlist and song themes
   */
  private async detectThematicContradictions(
    playlistThemes: { name: string; description: string; confidence?: number }[],
    songThemes: { name: string; description: string; confidence?: number }[],
    playlistThemeVector: number[] = [],
    songThemeVector: number[] = []
  ): Promise<{ score: number; contradictions: string[] }> {
    // Extract theme names and descriptions for context
    const playlistThemeNames = playlistThemes
      .map(t => t.name)
      .filter(Boolean)

    const songThemeNames = songThemes
      .map(t => t.name)
      .filter(Boolean)

    // Skip processing if we don't have enough theme data
    if (playlistThemeNames.length === 0 || songThemeNames.length === 0) {
      return { score: 0, contradictions: [] }
    }

    // Detect contradictions using semantic approach
    const detectedContradictions: string[] = []
    let totalContradictionScore = 0

    // Check each playlist theme against song themes
    for (let i = 0; i < playlistThemeNames.length; i++) {
      const playlistTheme = playlistThemeNames[i]
      const playlistDescription = playlistThemes[i]?.description || ''

      // Get sentiment for playlist theme
      const playlistThemeText = `${playlistTheme}: ${playlistDescription}`
      const playlistSentiment = await this.vectorizationService.getSentimentScores(playlistThemeText)

      for (let j = 0; j < songThemeNames.length; j++) {
        const songTheme = songThemeNames[j]
        const songDescription = songThemes[j]?.description || ''

        // Get embeddings for theme pair
        const playlistThemeVector = await this.vectorizationService.vectorizeText(
          `Theme: ${playlistTheme}. Description: ${playlistDescription}`
        )

        const songThemeVector = await this.vectorizationService.vectorizeText(
          `Theme: ${songTheme}. Description: ${songDescription}`
        )

        // Calculate semantic similarity
        const similarity = this.calculateEnhancedSimilarity(
          playlistThemeVector,
          songThemeVector
        )

        // Get sentiment for song theme
        const songThemeText = `${songTheme}: ${songDescription}`
        const songSentiment = await this.vectorizationService.getSentimentScores(songThemeText)

        // Determine if there's a sentiment polarity mismatch
        const playlistPolarity = this.getHighestSentiment(playlistSentiment)
        const songPolarity = this.getHighestSentiment(songSentiment)

        // Check if themes are contradictory
        let contradictionFound = false
        let contradictionLevel = 0

        // Low semantic similarity with opposite sentiment - strong contradiction
        if (similarity < 0.3 &&
          ((playlistPolarity === 'positive' && songPolarity === 'negative') ||
            (playlistPolarity === 'negative' && songPolarity === 'positive'))) {
          contradictionFound = true
          contradictionLevel = 0.9
          detectedContradictions.push(
            `"${playlistTheme}" (${playlistPolarity}) contradicts "${songTheme}" (${songPolarity})`
          )
        }
        // Moderate semantic distance with sentiment mismatch - moderate contradiction
        else if (similarity < 0.4 &&
          playlistPolarity !== songPolarity &&
          playlistPolarity !== 'neutral' &&
          songPolarity !== 'neutral') {
          contradictionFound = true
          contradictionLevel = 0.7
          detectedContradictions.push(
            `"${playlistTheme}" has different emotional tone than "${songTheme}"`
          )
        }
        // Extreme semantic distance - possible thematic contradiction
        else if (similarity < 0.25) {
          contradictionFound = true
          contradictionLevel = 0.5
          detectedContradictions.push(
            `"${playlistTheme}" is semantically distant from "${songTheme}"`
          )
        }

        // Add to total contradiction score
        if (contradictionFound) {
          totalContradictionScore += contradictionLevel *
            (playlistThemes[i]?.confidence || 0.5) *
            (songThemes[j]?.confidence || 0.5)
        }
      }
    }

    // Calculate final score based on detected contradictions
    const contradictionCount = detectedContradictions.length
    const averageThemeCount = (playlistThemeNames.length + songThemeNames.length) / 2

    // Normalize the contradiction score
    let normalizedScore = 0
    if (contradictionCount > 0) {
      // Normalize by the number of theme pairs and their severities
      normalizedScore = Math.min(1, totalContradictionScore / (averageThemeCount * 0.7))
    }

    return {
      score: normalizedScore,
      contradictions: detectedContradictions
    }
  }

  /**
   * Calculate sentiment compatibility
   */
  private calculateSentimentCompatibility(
    playlistSentiment: { positive: number; negative: number; neutral: number },
    songSentiment: { positive: number; negative: number; neutral: number }
  ): number {
    if (!playlistSentiment || !songSentiment) {
      if (playlistSentiment || songSentiment) {
        return 0.25 // At least one sentiment is known
      }
      return 0 // No sentiment information
    }

    // Get dominant sentiment for playlist and song
    const getDominantSentiment = (sentiment: { positive: number; negative: number; neutral: number }): 'positive' | 'negative' | 'neutral' => {
      const { positive, negative, neutral } = sentiment
      if (positive > negative && positive > neutral) return 'positive'
      if (negative > positive && negative > neutral) return 'negative'
      return 'neutral'
    }

    const playlistDominant = getDominantSentiment(playlistSentiment)
    const songDominant = getDominantSentiment(songSentiment)

    // Calculate differences with weighted components
    const positiveDiff = Math.abs(playlistSentiment.positive - songSentiment.positive)
    const negativeDiff = Math.abs(playlistSentiment.negative - songSentiment.negative)
    const neutralDiff = Math.abs(playlistSentiment.neutral - songSentiment.neutral)

    // Different weights for each component
    const weightedDiff = (positiveDiff * 0.4) + (negativeDiff * 0.4) + (neutralDiff * 0.2)

    // Base score from numerical difference
    const baseSimilarity = 1 - weightedDiff

    // Apply penalties for valence mismatches
    let valenceFactor = 1.0

    // Strong bonus for exact match
    if (playlistDominant === songDominant) {
      valenceFactor = 1.25
    }
    // Severe penalty for positive vs negative mismatch
    else if (
      (playlistDominant === 'positive' && songDominant === 'negative') ||
      (playlistDominant === 'negative' && songDominant === 'positive')
    ) {
      valenceFactor = 0.3 // Severe penalty
    }
    // Moderate penalty for neutral vs non-neutral
    else {
      valenceFactor = 0.7
    }

    // Higher emphasis on dominant sentiment - if playlist is strongly positive/negative
    // and song is opposite, apply even stronger penalty
    if (
      (playlistDominant === 'positive' && songSentiment.negative > 0.4) ||
      (playlistDominant === 'negative' && songSentiment.positive > 0.4)
    ) {
      valenceFactor *= 0.5
    }

    // Clamp final score to 0-1 range
    return Math.min(1, Math.max(0, baseSimilarity * valenceFactor))
  }

  /**
   * Calculate intensity match between playlist and song
   */
  private calculateIntensityMatch(
    playlistIntensity?: number,
    songIntensity?: number
  ): number {
    if (playlistIntensity === undefined || songIntensity === undefined) {
      if (playlistIntensity !== undefined || songIntensity !== undefined) {
        return 0.3 // At least one intensity is known
      }
      return 0 // No intensity information
    }

    // Calculate the difference
    const intensityDiff = Math.abs(playlistIntensity - songIntensity)

    // Non-linear penalty for larger differences
    if (intensityDiff < 0.1) return 0.95 // Very close match
    if (intensityDiff < 0.2) return 0.85
    if (intensityDiff < 0.3) return 0.7
    if (intensityDiff < 0.4) return 0.5
    if (intensityDiff < 0.5) return 0.3

    // Larger differences get progressively worse scores
    return Math.max(0, 1 - (intensityDiff * 2))
  }

  /**
   * Calculate fit score similarity between playlist and song
   */
  private calculateFitScoreSimilarity(
    playlistFitScores?: { [key: string]: number | undefined },
    songFitScores?: { [key: string]: number | undefined }
  ): number {
    if (!playlistFitScores || !songFitScores) {
      if (playlistFitScores || songFitScores) {
        return 0.3 // At least one has fit scores
      }
      return 0 // No fit score information
    }

    // Get all possible context types 
    const allContexts = new Set([
      ...Object.keys(playlistFitScores),
      ...Object.keys(songFitScores)
    ])

    if (allContexts.size === 0) return 0

    // Calculate weighted score differences
    let totalDiffScore = 0
    let totalWeightedCount = 0

    // Context importance weights
    const contextWeights: Record<string, number> = {
      'morning': 1.2,
      'working': 1.0,
      'relaxation': 1.5,
      'dancing': 1.3,
      'concentration': 1.4,
      'workout': 1.2,
      'commute': 0.8,
      'dinner': 0.9,
      'party': 1.3
    }

    for (const context of allContexts) {
      // Handle undefined values by defaulting to 0
      const playlistScore = playlistFitScores[context] ?? 0
      const songScore = songFitScores[context] ?? 0

      // Only include contexts where at least one score is significant
      if (playlistScore > 0.2 || songScore > 0.2) {
        const weight = contextWeights[context] || 1.0

        // Calculate difference for this context, weighted by importance
        const weightedDiff = Math.abs(playlistScore - songScore) * weight

        // For high playlist scores, penalize mismatches more
        const importanceFactor = playlistScore > 0.7 ? 1.5 : 1.0

        totalDiffScore += weightedDiff * importanceFactor
        totalWeightedCount += weight * importanceFactor
      }
    }

    if (totalWeightedCount === 0) return 0.3

    // Convert weighted difference to similarity
    const avgDiff = totalDiffScore / totalWeightedCount
    const similarity = 1 - avgDiff

    // Apply sigmoid function to create better distribution
    return 1 / (1 + Math.exp(-8 * (similarity - 0.5)))
  }

  /**
   * Apply veto logic to match scores
   */
  private applyVetoLogic(scores: MatchScores): {
    finalScore: number
    vetoApplied: boolean
    vetoReason: string
  } {
    // Start with a perfect score
    let finalScore = 1.0
    let vetoApplied = false
    let vetoReason = ''

    // Apply proportional contradiction penalties rather than fixed caps
    // Thematic contradictions - scale penalty by contradiction severity
    if (scores.thematic_contradiction > 0) {
      const reductionFactor = scores.thematic_contradiction * 1.5 // Amplify the effect
      finalScore *= (1 - reductionFactor)

      // Only count as veto if significant reduction
      if (reductionFactor > 0.5) {
        vetoApplied = true
        vetoReason = `Thematic contradiction detected (${(scores.thematic_contradiction * 100).toFixed(0)}% severity)`
      }
    }

    // Mood compatibility issues - scale penalty by compatibility gap
    const moodGap = 1 - scores.mood_compatibility
    if (moodGap > 0.3) { // Only apply if significant gap
      const moodPenalty = moodGap * 1.2 // Amplify the effect
      finalScore *= (1 - moodPenalty)

      // Only count as veto if significant reduction
      if (moodPenalty > 0.5) {
        vetoApplied = true
        if (vetoReason) vetoReason += ' & '
        vetoReason += `Poor mood compatibility (${(scores.mood_compatibility * 100).toFixed(0)}%)`
      }
    }

    // Sentiment contradictions - scale penalty by compatibility gap
    const sentimentGap = 1 - scores.sentiment_compatibility
    if (sentimentGap > 0.4) { // Higher threshold for sentiment
      const sentimentPenalty = sentimentGap * 0.8 // Reduce effect (less important than mood)
      finalScore *= (1 - sentimentPenalty)

      // Only count as veto if significant reduction
      if (sentimentPenalty > 0.4 && !vetoApplied) {
        vetoApplied = true
        if (vetoReason) vetoReason += ' & '
        vetoReason += `Sentiment mismatch (${(scores.sentiment_compatibility * 100).toFixed(0)}%)`
      }
    }

    // Ensure score is limited to a valid range
    finalScore = Math.max(0, Math.min(1, finalScore))

    return {
      finalScore,
      vetoApplied,
      vetoReason
    }
  }

  /**
   * Calculate final score with weights based on playlist type
   */
  private calculateFinalScore(
    scores: MatchScores,
    playlistType: PlaylistType = 'general'
  ): number {
    // Different weighting profiles for different playlist types
    const weights: Record<PlaylistType, Record<keyof MatchScores, number>> = {
      'mood': {
        theme_similarity: 0.20,
        mood_similarity: 0.15,
        mood_compatibility: 0.35,
        sentiment_compatibility: 0.10,
        intensity_match: 0.10,
        activity_match: 0.05,
        fit_score_similarity: 0.05,
        thematic_contradiction: 0.00
      },
      'activity': {
        theme_similarity: 0.20,
        mood_similarity: 0.10,
        mood_compatibility: 0.20,
        sentiment_compatibility: 0.05,
        intensity_match: 0.10,
        activity_match: 0.30,
        fit_score_similarity: 0.05,
        thematic_contradiction: 0.00
      },
      'theme': {
        theme_similarity: 0.40,
        mood_similarity: 0.10,
        mood_compatibility: 0.20,
        sentiment_compatibility: 0.05,
        intensity_match: 0.10,
        activity_match: 0.10,
        fit_score_similarity: 0.05,
        thematic_contradiction: 0.00
      },
      'general': {
        theme_similarity: 0.30,
        mood_similarity: 0.15,
        mood_compatibility: 0.30,
        sentiment_compatibility: 0.10,
        intensity_match: 0.05,
        activity_match: 0.05,
        fit_score_similarity: 0.05,
        thematic_contradiction: 0.00
      }
    }

    // Apply non-linear transformations to component scores
    const transformedScores: Partial<MatchScores> = {}

    // Transform mood compatibility score with stronger non-linear curve
    transformedScores.mood_compatibility = Math.pow(scores.mood_compatibility, 0.6)

    // Similarly transform sentiment compatibility
    transformedScores.sentiment_compatibility = Math.pow(scores.sentiment_compatibility, 0.8)

    // Use linear scale for other scores
    Object.keys(scores).forEach(key => {
      if (!transformedScores[key as keyof MatchScores]) {
        transformedScores[key as keyof MatchScores] = scores[key as keyof MatchScores]
      }
    })

    // Calculate weighted sum
    let weightedSum = 0
    let totalWeight = 0

    Object.entries(weights[playlistType]).forEach(([key, weight]) => {
      if (weight > 0) {
        weightedSum += (transformedScores[key as keyof MatchScores] || 0) * weight
        totalWeight += weight
      }
    })

    return totalWeight > 0 ? weightedSum / totalWeight : 0
  }

  /**
   * Determine playlist type based on its content
   */
  private determinePlaylistType(playlist: Playlist): PlaylistType {
    // Extract key information
    const hasMood = !!playlist.emotional?.dominantMood?.mood
    const hasMoodDescription = !!playlist.emotional?.dominantMood?.description

    const hasActivities = (playlist.context?.situations?.perfect_for?.length ?? 0) > 0
    const hasPrimarySetting = !!playlist.context?.primary_setting

    const hasThemes = (playlist.meaning?.themes?.length ?? 0) > 0
    const mainTheme = playlist.meaning?.themes?.[0]?.name ?? ''

    // Count weight indicators for each type
    let moodScore = 0
    let activityScore = 0
    let themeScore = 0

    // Mood indicators
    if (hasMood) moodScore += 2
    if (hasMoodDescription) moodScore += 1
    if (playlist.emotional?.intensity_score !== undefined) moodScore += 1

    // Check for mood-related terms in title or themes
    const moodTerms = ['mood', 'feel', 'vibe', 'emotional', 'feeling', 'emotion',
      'happy', 'sad', 'energetic', 'calm', 'relax', 'uplifting']

    if (mainTheme && moodTerms.some(term => mainTheme.toLowerCase().includes(term))) {
      moodScore += 2
    }

    // Activity indicators
    if (hasActivities) activityScore += 2
    if (hasPrimarySetting) activityScore += 2

    // Check for activity-related terms
    const activityTerms = ['workout', 'exercise', 'run', 'study', 'work', 'focus',
      'sleep', 'driving', 'commute', 'party', 'dance', 'dinner',
      'activity', 'doing']

    if (mainTheme && activityTerms.some(term => mainTheme.toLowerCase().includes(term))) {
      activityScore += 2
    }

    // Theme indicators
    if (hasThemes) themeScore += (playlist.meaning?.themes?.length ?? 0)
    if (playlist.meaning?.main_message) themeScore += 1

    // Determine highest score
    const scores = [
      { type: 'mood' as const, score: moodScore },
      { type: 'activity' as const, score: activityScore },
      { type: 'theme' as const, score: themeScore }
    ]

    scores.sort((a, b) => b.score - a.score)

    // If highest score is significantly higher than others, use that type
    if (scores[0].score > scores[1].score * 1.5) {
      return scores[0].type
    }

    // Otherwise, use general weighting
    return 'general'
  }

  /**
   * Get default match scores (used in error cases)
   */
  private getDefaultMatchScores(): MatchScores {
    return {
      theme_similarity: 0,
      mood_similarity: 0,
      mood_compatibility: 0,
      sentiment_compatibility: 0,
      intensity_match: 0,
      activity_match: 0,
      fit_score_similarity: 0,
      thematic_contradiction: 0
    }
  }
}