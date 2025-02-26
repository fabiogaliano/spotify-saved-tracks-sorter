// Enhanced Music Matching Algorithm with Contradiction Detection
// Implements improvements to prevent songs like "Money Trees" from matching with self-care playlists

// API configuration
const API_URL = 'http://localhost:8000';

// Type definitions (unchanged from original)
export type Track = {
  id?: string;
  artist: string;
  title: string;
};

export type Theme = {
  name: string;
  confidence?: number;
  description: string;
  related_themes?: string[];
  connection?: string;
};

export type Mood = {
  mood: string;
  description: string;
};

export type Context = {
  primary_setting?: string;
  situations?: {
    perfect_for?: string[];
    why?: string;
  };
  fit_scores?: {
    morning?: number;
    working?: number;
    relaxation?: number;
    [key: string]: number | undefined;
  };
};

export type Meaning = {
  themes: Theme[];
  main_message?: string;
  interpretation?: {
    main_message?: string;
    verified?: string[];
    derived?: string[];
  };
};

export type Emotional = {
  dominantMood: Mood;
  progression?: any[];
  intensity_score?: number;
};

export type Analysis = {
  meaning: Meaning;
  emotional: Emotional;
  context: Context;
  matchability?: any;
};

export type Song = {
  track: Track;
  analysis: Analysis;
  timestamp?: string;
};

export type Playlist = {
  id: string;
  track_ids: string[];
  meaning: Meaning;
  emotional: Emotional;
  context: Context;
  matchability?: any;
};

export type SentimentScore = {
  positive: number;  // 0-1 scale
  negative: number;  // 0-1 scale
  neutral: number;   // 0-1 scale
};

export type MatchScores = {
  theme_similarity: number;
  mood_similarity: number;
  mood_compatibility: number;
  sentiment_compatibility: number;
  intensity_match: number;
  activity_match: number;
  fit_score_similarity: number;
  thematic_contradiction: number; // NEW: Explicit contradiction score
};

export type MatchResult = {
  track_info: Track;
  similarity: number;
  component_scores: MatchScores;
  veto_applied?: boolean; // NEW: Flag to indicate if veto was applied
  veto_reason?: string;   // NEW: Explanation for veto
};

/**
 * Enhanced cosine similarity with distribution stretching
 * Addresses the problem of scores clustering in a narrow range
 */
export function calculateEnhancedSimilarity(vec1: number[], vec2: number[]): number {
  if (!vec1 || !vec2) {
    return 0; // Return 0 instead of default value
  }

  if (vec1.length !== vec2.length) {
    // Derive a value from partial information instead of constant
    return Math.min(0.1 * Math.min(vec1.length, vec2.length), 0.3);
  }

  // Calculate standard cosine similarity
  let dotProduct = 0;
  let mag1 = 0;
  let mag2 = 0;

  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    mag1 += vec1[i] * vec1[i];
    mag2 += vec2[i] * vec2[i];
  }

  mag1 = Math.sqrt(mag1);
  mag2 = Math.sqrt(mag2);

  if (mag1 === 0 || mag2 === 0) {
    return 0;
  }

  // Raw cosine similarity
  const rawSimilarity = dotProduct / (mag1 * mag2);

  // Apply non-linear transformation to spread out the distribution
  // Using a more aggressive power function for better differentiation
  return (rawSimilarity >= 0.5)
    ? 0.5 + 0.5 * Math.pow((rawSimilarity - 0.5) * 2, 1.8) // Increased exponent for more differentiation
    : 0.5 * Math.pow(rawSimilarity * 2, 1.4);              // Increased exponent for lower scores too
}

/**
 * NEW: Theme Category Classifier
 * Categorizes themes into semantic groups for contradiction detection
 */
export function categorizeTheme(theme: string): string[] {
  // Convert to lowercase for consistent matching
  const themeLower = theme.toLowerCase();

  // Define semantic categories with related terms
  const categories: Record<string, string[]> = {
    'positive': ['happiness', 'joy', 'positivity', 'uplifting', 'optimism', 'self-care', 'healing',
      'wellness', 'rejuvenation', 'relaxation', 'self-love', 'empowerment', 'confidence'],

    'negative': ['sadness', 'depression', 'despair', 'suffering', 'pain', 'melancholy', 'anxiety',
      'fear', 'worry', 'struggle', 'hardship', 'poverty', 'violence', 'conflict'],

    'growth': ['transformation', 'development', 'learning', 'improvement', 'progress', 'journey',
      'change', 'evolution', 'maturity', 'wisdom', 'insight', 'realization'],

    'social': ['community', 'friendship', 'family', 'relationship', 'love', 'connection', 'unity',
      'togetherness', 'collaboration', 'cooperation', 'social justice'],

    'conflict': ['struggle', 'battle', 'fight', 'war', 'conflict', 'opposition', 'violence',
      'tension', 'disagreement', 'clash', 'rivalry', 'competition', 'confrontation'],

    'moral': ['ethics', 'values', 'principles', 'morality', 'righteousness', 'justice', 'fairness',
      'equality', 'honesty', 'integrity', 'virtue', 'honor', 'dignity', 'respect'],

    'material': ['wealth', 'money', 'possession', 'material', 'luxury', 'affluence', 'opulence',
      'prosperity', 'fortune', 'finance', 'economic', 'consumption', 'status'],

    'spiritual': ['faith', 'belief', 'spirituality', 'religion', 'divine', 'sacred', 'holy',
      'transcendent', 'enlightenment', 'awakening', 'higher power', 'soul'],

    'reflective': ['introspection', 'contemplation', 'reflection', 'meditation', 'mindfulness',
      'awareness', 'consciousness', 'perspective', 'understanding', 'insight'],

    'energetic': ['energy', 'active', 'dynamic', 'vigorous', 'lively', 'intense', 'powerful',
      'passionate', 'vibrant', 'enthusiasm', 'excitement', 'motivation', 'drive'],

    'relaxing': ['calm', 'peaceful', 'serene', 'tranquil', 'soothing', 'gentle', 'quiet',
      'still', 'relaxed', 'restful', 'comforting', 'stress-relief', 'unwinding']
  };

  // Find all matching categories
  const matchedCategories = Object.entries(categories)
    .filter(([_, terms]) =>
      terms.some(term => themeLower.includes(term)))
    .map(([category, _]) => category);

  // If no categories matched, return 'uncategorized'
  return matchedCategories.length > 0 ? matchedCategories : ['uncategorized'];
}

/**
 * NEW: Detect contradictory themes between playlist and song
 */
export function detectThematicContradictions(
  playlistThemes: Theme[],
  songThemes: Theme[]
): { score: number; contradictions: string[] } {
  // Define explicitly contradictory category pairs
  const contradictoryPairs: [string, string][] = [
    ['positive', 'negative'],
    ['relaxing', 'energetic'],
    ['spiritual', 'material'],
    ['positive', 'conflict']
  ];

  // Extract all theme names
  const playlistThemeNames = playlistThemes.map(t => t.name);
  const songThemeNames = songThemes.map(t => t.name);

  // Categorize all themes
  const playlistCategories = playlistThemeNames
    .flatMap(theme => categorizeTheme(theme));

  const songCategories = songThemeNames
    .flatMap(theme => categorizeTheme(theme));

  // Find contradictions
  const contradictions: string[] = [];

  // Check for contradictory category pairs
  for (const [catA, catB] of contradictoryPairs) {
    if (
      (playlistCategories.includes(catA) && songCategories.includes(catB)) ||
      (playlistCategories.includes(catB) && songCategories.includes(catA))
    ) {
      contradictions.push(`${catA} vs ${catB}`);
    }
  }

  // Calculate a contradiction score (0 = no contradictions, 1 = severe contradictions)
  // More contradictions and higher confidence themes get higher contradiction scores
  let contradictionScore = 0;

  if (contradictions.length > 0) {
    // Base score based on number of contradictions
    const baseScore = Math.min(contradictions.length * 0.3, 0.9);

    // Find the highest confidence contradictory themes
    let highestPlaylistConfidence = 0;
    let highestSongConfidence = 0;

    // For each contradiction, find themes associated with it
    for (const contradiction of contradictions) {
      const [catA, catB] = contradiction.split(' vs ');

      // Check playlist themes
      for (const theme of playlistThemes) {
        const categories = categorizeTheme(theme.name);
        if (categories.includes(catA) || categories.includes(catB)) {
          highestPlaylistConfidence = Math.max(
            highestPlaylistConfidence,
            theme.confidence || 0.5
          );
        }
      }

      // Check song themes
      for (const theme of songThemes) {
        const categories = categorizeTheme(theme.name);
        if (categories.includes(catA) || categories.includes(catB)) {
          highestSongConfidence = Math.max(
            highestSongConfidence,
            theme.confidence || 0.5
          );
        }
      }
    }

    // Weight contradiction score by theme confidence
    const confidenceWeight = (highestPlaylistConfidence + highestSongConfidence) / 2;
    contradictionScore = baseScore * confidenceWeight;
  }

  return {
    score: contradictionScore,
    contradictions
  };
}

/**
 * NEW: Enhanced mood classifier with opposite mood detection
 */
export function classifyMood(moodText: string): string[] {
  // Process input
  const cleanedMood = moodText.toLowerCase().trim();

  // Define mood categories with keywords
  const moodCategories: Record<string, string[]> = {
    'happy': ['happy', 'cheerful', 'joyful', 'blissful', 'upbeat', 'bright', 'uplifting'],
    'sad': ['sad', 'melancholy', 'somber', 'depressed', 'mournful', 'gloomy', 'downcast'],
    'energetic': ['energetic', 'lively', 'dynamic', 'vigorous', 'powerful', 'exciting', 'upbeat'],
    'calm': ['calm', 'peaceful', 'serene', 'tranquil', 'relaxed', 'gentle', 'soothing'],
    'angry': ['angry', 'intense', 'aggressive', 'fierce', 'furious', 'resentful', 'outraged'],
    'hopeful': ['hopeful', 'optimistic', 'positive', 'encouraging', 'reassuring', 'promising'],
    'anxious': ['anxious', 'worried', 'nervous', 'tense', 'uneasy', 'apprehensive', 'restless'],
    'confident': ['confident', 'empowering', 'strong', 'assured', 'bold', 'assertive', 'self-assured'],
    'uncertain': ['uncertain', 'doubtful', 'confused', 'hesitant', 'ambivalent', 'insecure'],
    'nostalgic': ['nostalgic', 'reminiscent', 'wistful', 'sentimental', 'reflective', 'yearning'],
    'romantic': ['romantic', 'passionate', 'intimate', 'tender', 'affectionate', 'loving', 'sensual'],
    'dark': ['dark', 'ominous', 'sinister', 'eerie', 'mysterious', 'haunting', 'foreboding'],
    'inspirational': ['inspirational', 'motivational', 'spiritual', 'enlightening', 'awakening'],
    'contemplative': ['contemplative', 'thoughtful', 'introspective', 'meditative', 'philosophical']
  };

  // Find all matching mood categories
  const matchedMoods = Object.entries(moodCategories)
    .filter(([_, keywords]) =>
      keywords.some(keyword => cleanedMood.includes(keyword)))
    .map(([mood, _]) => mood);

  return matchedMoods.length > 0 ? matchedMoods : ['neutral'];
}

/**
 * NEW: Detect contradictory moods with enhanced algorithm
 */
export function detectMoodContradictions(
  moodA: string,
  moodB: string
): { contradictionLevel: number, opposite: boolean } {
  // Define directly opposing mood pairs (strong contradictions)
  const directOpposites: [string, string][] = [
    ['happy', 'sad'],
    ['energetic', 'calm'],
    ['confident', 'uncertain'],
    ['hopeful', 'anxious'],
    ['uplifting', 'melancholy'],
    ['bright', 'dark'],
    ['positive', 'negative'],
    ['optimistic', 'pessimistic']
  ];

  // Define partial contradictions (moderate)
  const partialContradictions: [string, string][] = [
    ['happy', 'contemplative'],
    ['energetic', 'reflective'],
    ['calm', 'anxious'],
    ['confident', 'melancholy'],
    ['dark', 'inspirational'],
    ['angry', 'romantic']
  ];

  // Clean and normalize moods
  const cleanedA = moodA.toLowerCase().trim();
  const cleanedB = moodB.toLowerCase().trim();

  // Check for direct opposites (exact words or classified categories)
  const moodsA = classifyMood(cleanedA);
  const moodsB = classifyMood(cleanedB);

  // Check if any mood from A directly opposes any mood from B
  for (const [opposite1, opposite2] of directOpposites) {
    const aHasOpposite1 = moodsA.includes(opposite1) || cleanedA.includes(opposite1);
    const aHasOpposite2 = moodsA.includes(opposite2) || cleanedA.includes(opposite2);
    const bHasOpposite1 = moodsB.includes(opposite1) || cleanedB.includes(opposite1);
    const bHasOpposite2 = moodsB.includes(opposite2) || cleanedB.includes(opposite2);

    // If A has opposite1 and B has opposite2, or vice versa
    if ((aHasOpposite1 && bHasOpposite2) || (aHasOpposite2 && bHasOpposite1)) {
      return { contradictionLevel: 0.9, opposite: true };
    }
  }

  // Check for partial contradictions
  for (const [partial1, partial2] of partialContradictions) {
    const aHasPartial1 = moodsA.includes(partial1) || cleanedA.includes(partial1);
    const aHasPartial2 = moodsA.includes(partial2) || cleanedA.includes(partial2);
    const bHasPartial1 = moodsB.includes(partial1) || cleanedB.includes(partial1);
    const bHasPartial2 = moodsB.includes(partial2) || cleanedB.includes(partial2);

    // If A has partial1 and B has partial2, or vice versa
    if ((aHasPartial1 && bHasPartial2) || (aHasPartial2 && bHasPartial1)) {
      return { contradictionLevel: 0.6, opposite: false };
    }
  }

  // No contradictions found
  return { contradictionLevel: 0, opposite: false };
}

/**
 * Extract themes text from a song or playlist with enhanced weighting
 */
export function extractThemesText(data: Song | Playlist): string {
  const meaning = 'analysis' in data ? data.analysis.meaning : data.meaning;

  // Extract theme names and descriptions with confidence weighting
  const themes = meaning.themes || [];

  // Prioritize higher confidence themes
  const themeTexts = themes.map(t => {
    const confidence = t.confidence || 0.5;
    const name = t.name || '';
    const description = t.description || '';

    // Repeat high confidence themes more for emphasis
    const repetitions = Math.max(1, Math.round(confidence * 3));
    return Array(repetitions).fill(`${name} ${description}`).join(' ');
  }).filter(Boolean);

  // Get main message
  let mainMessage = meaning.main_message || '';
  if (!mainMessage && meaning.interpretation) {
    mainMessage = meaning.interpretation.main_message || '';
  }

  // Combine all theme information
  return [...themeTexts, mainMessage].join(' ');
}

/**
 * Extract mood text from a song or playlist with expanded description
 */
export function extractMoodText(data: Song | Playlist): string {
  const emotional = 'analysis' in data ? data.analysis.emotional : data.emotional;

  // Extract mood and description
  const dominantMood = emotional.dominantMood?.mood || '';
  const moodDescription = emotional.dominantMood?.description || '';

  // Add intensity descriptor if available
  const intensity = emotional.intensity_score;
  let intensityText = '';

  if (intensity !== undefined) {
    if (intensity > 0.8) intensityText = 'very intense';
    else if (intensity > 0.6) intensityText = 'intense';
    else if (intensity > 0.4) intensityText = 'moderate';
    else if (intensity > 0.2) intensityText = 'mild';
    else intensityText = 'subtle';
  }

  // Combine mood information
  return [dominantMood, moodDescription, intensityText].filter(Boolean).join(' ');
}

/**
 * Extract feature-specific vector from full embedding
 * This allows for more precise extraction of specific semantic features
 */
export function extractFeatureVector(
  embedding: number[],
  featureType: 'theme' | 'mood' | 'activity' | 'intensity',
  dimensions?: number
): number[] {
  if (!embedding || embedding.length === 0) {
    return [];
  }

  // Determine vector slicing based on feature type
  const dim = dimensions || Math.floor(embedding.length / 5);

  switch (featureType) {
    case 'theme':
      // First segment for themes (concepts, topics)
      return embedding.slice(0, dim);
    case 'mood':
      // Middle segment for emotional content
      const moodStart = Math.floor(embedding.length * 0.4);
      return embedding.slice(moodStart, moodStart + dim);
    case 'activity':
      // Last segment for activities and contexts
      return embedding.slice(embedding.length - dim);
    case 'intensity':
      // Small segment focused on intensity
      const intensityStart = Math.floor(embedding.length * 0.7);
      return embedding.slice(intensityStart, intensityStart + Math.floor(dim / 2));
    default:
      return embedding;
  }
}

/**
 * IMPROVED: Calculate mood compatibility with lexical analysis and contradiction detection
 */
export async function calculateEnhancedMoodCompatibility(
  playlistMood: Mood,
  songMood: Mood,
  moodVectorPlaylist: number[],
  moodVectorSong: number[]
): Promise<number> {
  if (!playlistMood?.mood || !songMood?.mood) {
    // Return progressive values based on partial information
    if (playlistMood?.mood || songMood?.mood) {
      return 0.3; // At least one mood is known
    }
    return 0; // No mood information
  }

  // Extract mood text
  const playlistMoodText = playlistMood.mood.toLowerCase();
  const songMoodText = songMood.mood.toLowerCase();

  // 1. Check for direct mood contradictions using enhanced detection
  const moodContradiction = detectMoodContradictions(
    playlistMoodText,
    songMoodText
  );

  // 2. Vector similarity from mood embeddings
  let vectorSimilarity = 0.5;
  if (moodVectorPlaylist.length > 0 && moodVectorSong.length > 0) {
    vectorSimilarity = calculateEnhancedSimilarity(moodVectorPlaylist, moodVectorSong);
  }

  // 3. Apply contradiction penalties
  let finalScore;

  if (moodContradiction.opposite) {
    // Direct opposites get severe penalty
    finalScore = Math.max(0, 0.3 - (moodContradiction.contradictionLevel * 0.3));
  } else if (moodContradiction.contradictionLevel > 0) {
    // Partial contradictions get moderate penalty
    finalScore = Math.max(0, 0.55 - (moodContradiction.contradictionLevel * 0.15));
  } else {
    // No contradictions - use vector similarity with slight boost for similar moods
    finalScore = vectorSimilarity * 1.1;
  }

  // Clamp to valid range
  return Math.min(1, Math.max(0, finalScore));
}

/**
 * IMPROVED: Calculate sentiment compatibility with emotional valence alignment
 */
export function calculateSentimentCompatibility(
  playlistSentiment: SentimentScore,
  songSentiment: SentimentScore
): number {
  if (!playlistSentiment || !songSentiment) {
    // Derive value based on partial information
    if (playlistSentiment || songSentiment) {
      return 0.25; // At least one sentiment is known
    }
    return 0; // No sentiment information
  }

  // Classify dominant sentiment for playlist and song
  const getDominantSentiment = (sentiment: SentimentScore): 'positive' | 'negative' | 'neutral' => {
    const { positive, negative, neutral } = sentiment;
    if (positive > negative && positive > neutral) return 'positive';
    if (negative > positive && negative > neutral) return 'negative';
    return 'neutral';
  };

  const playlistDominant = getDominantSentiment(playlistSentiment);
  const songDominant = getDominantSentiment(songSentiment);

  // Calculate differences with weighted components
  const positiveDiff = Math.abs(playlistSentiment.positive - songSentiment.positive);
  const negativeDiff = Math.abs(playlistSentiment.negative - songSentiment.negative);
  const neutralDiff = Math.abs(playlistSentiment.neutral - songSentiment.neutral);

  // Different weights for each component
  const weightedDiff = (positiveDiff * 0.4) + (negativeDiff * 0.4) + (neutralDiff * 0.2);

  // Base score from numerical difference
  const baseSimilarity = 1 - weightedDiff;

  // Apply much stronger penalties for valence mismatches
  let valenceFactor = 1.0;

  // Strong bonus for exact match
  if (playlistDominant === songDominant) {
    valenceFactor = 1.25;
  }
  // Severe penalty for positive vs negative mismatch
  else if (
    (playlistDominant === 'positive' && songDominant === 'negative') ||
    (playlistDominant === 'negative' && songDominant === 'positive')
  ) {
    valenceFactor = 0.3; // More severe penalty than before (was 0.6)
  }
  // Moderate penalty for neutral vs non-neutral
  else {
    valenceFactor = 0.7;
  }

  // Higher emphasis on dominant sentiment - if playlist is strongly positive/negative
  // and song is opposite, apply even stronger penalty
  if (
    (playlistDominant === 'positive' && songSentiment.negative > 0.4) ||
    (playlistDominant === 'negative' && songSentiment.positive > 0.4)
  ) {
    valenceFactor *= 0.5;
  }

  // Clamp final score to 0-1 range
  return Math.min(1, Math.max(0, baseSimilarity * valenceFactor));
}

/**
 * Calculate intensity match with improved gradient
 */
export function calculateIntensityMatch(playlistIntensity?: number, songIntensity?: number): number {
  if (playlistIntensity === undefined || songIntensity === undefined) {
    // Return progressively better scores based on available information
    if (playlistIntensity !== undefined || songIntensity !== undefined) {
      return 0.3; // At least one intensity is known
    }
    return 0; // No intensity information
  }

  // Calculate the difference
  const intensityDiff = Math.abs(playlistIntensity - songIntensity);

  // Non-linear penalty for larger differences
  // Values closer together get better scores 
  if (intensityDiff < 0.1) return 0.95; // Very close match
  if (intensityDiff < 0.2) return 0.85;
  if (intensityDiff < 0.3) return 0.7;
  if (intensityDiff < 0.4) return 0.5;
  if (intensityDiff < 0.5) return 0.3;

  // Larger differences get progressively worse scores
  return Math.max(0, 1 - (intensityDiff * 2));
}

/**
 * Extract activities from context data with improved tokenization
 */
export function extractActivities(context?: Context): string[] {
  if (!context) return [];

  const activities: string[] = [];

  // Add setting as an activity
  if (context.primary_setting) {
    activities.push(context.primary_setting);
  }

  // Add perfect_for activities
  if (context.situations?.perfect_for) {
    activities.push(...context.situations.perfect_for);
  }

  return activities;
}

/**
 * Calculate activity match using semantic analysis
 */
export function calculateActivityMatch(
  playlistActivities: string[] = [],
  songActivities: string[] = []
): number {
  if (playlistActivities.length === 0 || songActivities.length === 0) {
    // Instead of returning 0.5, derive a value based on partial information
    if (playlistActivities.length > 0 || songActivities.length > 0) {
      return 0.2; // At least one has activities
    }
    return 0; // No activities information
  }

  // Implement better tokenization for activity matching
  const tokenizeActivities = (activities: string[]): Map<string, number> => {
    const tokenMap = new Map<string, number>();

    for (const activity of activities) {
      // Split by non-word characters and filter out short tokens
      const tokens = activity.toLowerCase()
        .split(/[\s,.-]+/)
        .filter(token => token.length > 2);

      // Add individual tokens with weights
      for (const token of tokens) {
        const currentCount = tokenMap.get(token) || 0;
        tokenMap.set(token, currentCount + 1);
      }

      // Add bigrams (pairs of adjacent words) for better phrase matching
      for (let i = 0; i < tokens.length - 1; i++) {
        const bigram = `${tokens[i]} ${tokens[i + 1]}`;
        const currentCount = tokenMap.get(bigram) || 0;
        tokenMap.set(bigram, currentCount + 2); // Higher weight for bigrams
      }

      // Add the complete phrase with highest weight
      const fullPhrase = activity.toLowerCase();
      if (fullPhrase.length > 0) {
        const currentCount = tokenMap.get(fullPhrase) || 0;
        tokenMap.set(fullPhrase, currentCount + 3); // Highest weight for full phrases
      }
    }

    return tokenMap;
  };

  const playlistTokens = tokenizeActivities(playlistActivities);
  const songTokens = tokenizeActivities(songActivities);

  // Calculate weighted token matching
  let matchScore = 0;
  let totalWeight = 0;

  // Check playlist tokens in song tokens
  for (const [token, weight] of playlistTokens.entries()) {
    if (songTokens.has(token)) {
      const songWeight = songTokens.get(token) || 0;
      matchScore += weight * songWeight;
    }
    totalWeight += weight;
  }

  // Check song tokens in playlist tokens (asymmetric matching)
  for (const [token, weight] of songTokens.entries()) {
    if (!playlistTokens.has(token)) {
      totalWeight += weight;
    }
  }

  if (totalWeight === 0) return 0;

  // Normalize the score
  const normalizedScore = matchScore / totalWeight;

  // Apply non-linear transformation to spread out values
  // This creates more separation between partial matches
  return Math.pow(normalizedScore, 0.7);
}

/**
 * Calculate fit score similarity between playlist and song
 */
export function calculateFitScoreSimilarity(
  playlistFitScores?: { [key: string]: number },
  songFitScores?: { [key: string]: number }
): number {
  if (!playlistFitScores || !songFitScores) {
    // Return progressive values based on partial information
    if (playlistFitScores || songFitScores) {
      return 0.3; // At least one has fit scores
    }
    return 0; // No fit score information
  }

  // Get all possible context types 
  const allContexts = new Set([
    ...Object.keys(playlistFitScores),
    ...Object.keys(songFitScores)
  ]);

  if (allContexts.size === 0) return 0;

  // Calculate weighted score differences
  let totalDiffScore = 0;
  let totalWeightedCount = 0;

  // Context importance weights - some contexts may be more important than others
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
  };

  for (const context of allContexts) {
    const playlistScore = playlistFitScores[context] ?? 0;
    const songScore = songFitScores[context] ?? 0;

    // Only include contexts where at least one score is significant
    if (playlistScore > 0.2 || songScore > 0.2) {
      const weight = contextWeights[context] || 1.0;

      // Calculate difference for this context, weighted by importance
      const weightedDiff = Math.abs(playlistScore - songScore) * weight;

      // For high playlist scores, penalize mismatches more
      const importanceFactor = playlistScore > 0.7 ? 1.5 : 1.0;

      totalDiffScore += weightedDiff * importanceFactor;
      totalWeightedCount += weight * importanceFactor;
    }
  }

  if (totalWeightedCount === 0) return 0.3;

  // Convert weighted difference to similarity
  const avgDiff = totalDiffScore / totalWeightedCount;
  const similarity = 1 - avgDiff;

  // Apply sigmoid function to create better distribution
  return 1 / (1 + Math.exp(-8 * (similarity - 0.5)));
}

/**
 * Get sentiment scores using the API
 */
export async function getSentimentScores(text: string): Promise<SentimentScore> {
  if (!text || text.trim().length === 0) {
    return { positive: 0.33, negative: 0.33, neutral: 0.34 };
  }

  try {
    const response = await fetch(`${API_URL}/analyze/sentiment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });

    if (!response.ok) {
      console.error(`Sentiment API error: ${response.statusText}`);
      return { positive: 0.33, negative: 0.33, neutral: 0.34 };
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting sentiment:', error);
    return { positive: 0.33, negative: 0.33, neutral: 0.34 };
  }
}

/**
 * Get song embedding from API
 */
export async function getSongEmbedding(song: Song): Promise<number[]> {
  try {
    const response = await fetch(`${API_URL}/vectorize/song`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        analyses: [song]
      }),
    });

    if (!response.ok) {
      throw new Error(`Song vectorization failed: ${response.statusText}`);
    }

    const result = await response.json();
    return result.results[0].embedding;
  } catch (error) {
    console.error('Error getting song embedding:', error);
    return [];
  }
}

/**
 * Get playlist embedding from API
 */
export async function getPlaylistEmbedding(playlist: Playlist): Promise<number[]> {
  try {
    const response = await fetch(`${API_URL}/vectorize/playlist`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ playlist }),
    });

    if (!response.ok) {
      throw new Error(`Playlist vectorization failed: ${response.statusText}`);
    }

    const result = await response.json();
    return result.embedding;
  } catch (error) {
    console.error('Error getting playlist embedding:', error);
    return [];
  }
}

/**
 * NEW: Apply veto logic to song matches based on critical incompatibilities
 */
export function applyVetoLogic(
  scores: MatchScores
): { score: number; vetoApplied: boolean; vetoReason?: string } {
  // Collect potential veto reasons
  const vetoReasons: string[] = [];
  let finalScore = 1.0; // Start with full score and apply caps

  // Veto based on thematic contradiction
  if (scores.thematic_contradiction > 0.5) {
    finalScore = Math.min(finalScore, 0.3);
    vetoReasons.push("Contradictory themes detected");
  }

  // Veto based on mood compatibility
  if (scores.mood_compatibility < 0.4) {
    finalScore = Math.min(finalScore, 0.5);
    vetoReasons.push("Incompatible moods");
  }

  // Veto based on sentiment compatibility
  if (scores.sentiment_compatibility < 0.3) {
    finalScore = Math.min(finalScore, 0.4);
    vetoReasons.push("Opposing emotional sentiment");
  }

  // When multiple veto conditions are met, apply stricter cap
  if (vetoReasons.length > 1) {
    finalScore = Math.min(finalScore, 0.2);
  }

  return {
    score: finalScore,
    vetoApplied: vetoReasons.length > 0,
    vetoReason: vetoReasons.length > 0 ? vetoReasons.join(", ") : undefined
  };
}

/**
 * ENHANCED: Calculate final match score with non-linear transformations
 */
export function calculateFinalScore(
  scores: MatchScores,
  playlistType: 'mood' | 'activity' | 'theme' | 'general' = 'general'
): number {
  // Different weighting profiles for different playlist types
  const weights: Record<string, Record<keyof MatchScores, number>> = {
    'mood': {
      theme_similarity: 0.10,
      mood_similarity: 0.10,
      mood_compatibility: 0.30,
      sentiment_compatibility: 0.20,
      intensity_match: 0.15,
      activity_match: 0.05,
      fit_score_similarity: 0.05,
      thematic_contradiction: 0.05 // Lower weight as it's also used as a veto
    },
    'activity': {
      theme_similarity: 0.15,
      mood_similarity: 0.10,
      mood_compatibility: 0.15,
      sentiment_compatibility: 0.10,
      intensity_match: 0.10,
      activity_match: 0.30,
      fit_score_similarity: 0.05,
      thematic_contradiction: 0.05
    },
    'theme': {
      theme_similarity: 0.35,
      mood_similarity: 0.05,
      mood_compatibility: 0.15,
      sentiment_compatibility: 0.10,
      intensity_match: 0.10,
      activity_match: 0.10,
      fit_score_similarity: 0.05,
      thematic_contradiction: 0.10
    },
    'general': {
      theme_similarity: 0.20,
      mood_similarity: 0.10,
      mood_compatibility: 0.20,
      sentiment_compatibility: 0.15,
      intensity_match: 0.10,
      activity_match: 0.10,
      fit_score_similarity: 0.05,
      thematic_contradiction: 0.10
    }
  };

  // Apply non-linear transformations to component scores
  const transformedScores: Partial<MatchScores> = {};

  // Apply more aggressive power functions to emotional components
  transformedScores.mood_compatibility = Math.pow(scores.mood_compatibility, 1.5);
  transformedScores.sentiment_compatibility = Math.pow(scores.sentiment_compatibility, 1.4);

  // Linear transformations for other components
  transformedScores.theme_similarity = scores.theme_similarity;
  transformedScores.mood_similarity = scores.mood_similarity;
  transformedScores.intensity_match = scores.intensity_match;
  transformedScores.activity_match = scores.activity_match;
  transformedScores.fit_score_similarity = scores.fit_score_similarity;
  transformedScores.thematic_contradiction = scores.thematic_contradiction;

  // Calculate weighted score using the appropriate weights
  const selectedWeights = weights[playlistType];
  let weightedScore = 0;

  for (const [component, weight] of Object.entries(selectedWeights)) {
    const score = transformedScores[component as keyof MatchScores] ??
      scores[component as keyof MatchScores];

    if (component === 'thematic_contradiction') {
      // Contradiction is inverted (higher is worse)
      weightedScore += (1 - score) * weight;
    } else {
      weightedScore += score * weight;
    }
  }

  // Apply veto logic to cap the final score
  const { score: cappedScore, vetoApplied } = applyVetoLogic(scores);

  // Use the more restrictive of the weighted score or the veto-capped score
  return vetoApplied ? Math.min(weightedScore, cappedScore) : weightedScore;
}

/**
 * Determine the most likely playlist type based on its content
 */
export function determinePlaylistType(playlist: Playlist): 'mood' | 'activity' | 'theme' | 'general' {
  // Extract key information
  const hasMood = !!playlist.emotional?.dominantMood?.mood;
  const hasMoodDescription = !!playlist.emotional?.dominantMood?.description;

  const hasActivities = (playlist.context?.situations?.perfect_for?.length ?? 0) > 0;
  const hasPrimarySetting = !!playlist.context?.primary_setting;

  const hasThemes = (playlist.meaning?.themes?.length ?? 0) > 0;
  const mainTheme = playlist.meaning?.themes?.[0]?.name ?? '';

  // Count weight indicators for each type
  let moodScore = 0;
  let activityScore = 0;
  let themeScore = 0;

  // Mood indicators
  if (hasMood) moodScore += 2;
  if (hasMoodDescription) moodScore += 1;
  if (playlist.emotional?.intensity_score !== undefined) moodScore += 1;

  // Check for mood-related terms in title or themes
  const moodTerms = ['mood', 'feel', 'vibe', 'emotional', 'feeling', 'emotion',
    'happy', 'sad', 'energetic', 'calm', 'relax', 'uplifting'];

  if (mainTheme && moodTerms.some(term => mainTheme.toLowerCase().includes(term))) {
    moodScore += 2;
  }

  // Activity indicators
  if (hasActivities) activityScore += 2;
  if (hasPrimarySetting) activityScore += 2;

  // Check for activity-related terms
  const activityTerms = ['workout', 'exercise', 'run', 'study', 'work', 'focus',
    'sleep', 'driving', 'commute', 'party', 'dance', 'dinner',
    'activity', 'doing'];

  if (mainTheme && activityTerms.some(term => mainTheme.toLowerCase().includes(term))) {
    activityScore += 2;
  }

  // Theme indicators
  if (hasThemes) themeScore += (playlist.meaning?.themes?.length ?? 0);
  if (playlist.meaning?.main_message) themeScore += 1;

  // Determine highest score
  const scores = [
    { type: 'mood' as const, score: moodScore },
    { type: 'activity' as const, score: activityScore },
    { type: 'theme' as const, score: themeScore }
  ];

  scores.sort((a, b) => b.score - a.score);

  // If highest score is significantly higher than others, use that type
  if (scores[0].score > scores[1].score * 1.5) {
    return scores[0].type;
  }

  // Otherwise, use general weighting
  return 'general';
}

/**
 * COMPLETELY REDESIGNED: matchSongsToPlaylist with contradiction detection
 * This is the main algorithm that implements all the improvements
 */
export async function matchSongsToPlaylist(playlist: Playlist, songs: Song[]): Promise<MatchResult[]> {
  console.log('\n🔄 Matching songs to playlist...');

  // Determine playlist type to use appropriate weighting profile
  const playlistType = determinePlaylistType(playlist);
  console.log(`Playlist Type: ${playlistType}`);
  console.log(`Playlist: ${playlist.id}`);

  // Get playlist embeddings and metadata
  const playlistEmbedding = await getPlaylistEmbedding(playlist);
  const playlistMood = playlist.emotional?.dominantMood;
  const playlistIntensity = playlist.emotional?.intensity_score;
  const playlistThemeText = extractThemesText(playlist);
  const playlistMoodText = extractMoodText(playlist);
  const playlistActivities = extractActivities(playlist.context);

  // Extract feature-specific vectors from playlist embedding
  const playlistThemeVector = extractFeatureVector(playlistEmbedding, 'theme');
  const playlistMoodVector = extractFeatureVector(playlistEmbedding, 'mood');
  const playlistActivityVector = extractFeatureVector(playlistEmbedding, 'activity');

  console.log(`Playlist Mood: ${playlistMood?.mood || 'Unknown'}`);

  // Get playlist sentiment
  const playlistSentiment = await getSentimentScores(
    `${playlistThemeText} ${playlistMoodText}`
  );

  // Calculate matches for each song
  const matches: MatchResult[] = [];
  const matchPromises = songs.map(async (song, index) => {
    // Get song embedding and metadata
    const songEmbedding = await getSongEmbedding(song);
    const songMood = song.analysis.emotional?.dominantMood;
    const songIntensity = song.analysis.emotional?.intensity_score;
    const songThemeText = extractThemesText(song);
    const songMoodText = extractMoodText(song);
    const songActivities = extractActivities(song.analysis.context);

    // Extract feature-specific vectors from song embedding
    const songThemeVector = extractFeatureVector(songEmbedding, 'theme');
    const songMoodVector = extractFeatureVector(songEmbedding, 'mood');
    const songActivityVector = extractFeatureVector(songEmbedding, 'activity');

    // Calculate component scores with enhanced methods
    const theme_similarity = calculateEnhancedSimilarity(
      playlistThemeVector,
      songThemeVector
    );

    const mood_similarity = calculateEnhancedSimilarity(
      playlistMoodVector,
      songMoodVector
    );

    // NEW: Detect thematic contradictions
    const thematicContradiction = detectThematicContradictions(
      playlist.meaning.themes,
      song.analysis.meaning.themes
    );

    const thematic_contradiction = thematicContradiction.score;

    // Calculate enhanced mood compatibility with contradiction detection
    const mood_compatibility = await calculateEnhancedMoodCompatibility(
      playlistMood,
      songMood,
      playlistMoodVector,
      songMoodVector
    );

    // Compare sentiment compatibility with improved valence detection
    const songSentiment = await getSentimentScores(
      `${songThemeText} ${songMoodText}`
    );

    const sentiment_compatibility = calculateSentimentCompatibility(
      playlistSentiment,
      songSentiment
    );

    // Calculate intensity match
    const intensity_match = calculateIntensityMatch(
      playlistIntensity,
      songIntensity
    );

    // Calculate activity match using both vector and lexical approaches
    const activityVectorMatch = calculateEnhancedSimilarity(
      playlistActivityVector,
      songActivityVector
    );

    const activityLexicalMatch = calculateActivityMatch(
      playlistActivities,
      songActivities
    );

    // Combine activity matching approaches
    const activity_match = activityLexicalMatch * 0.7 + activityVectorMatch * 0.3;

    // Calculate fit score similarity
    const fit_score_similarity = calculateFitScoreSimilarity(
      playlist.context?.fit_scores,
      song.analysis.context?.fit_scores
    );

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
    };

    // Calculate final score with enhanced calculation
    const similarity = calculateFinalScore(component_scores, playlistType);

    // Check if veto was applied
    const { vetoApplied, vetoReason } = applyVetoLogic(component_scores);

    // Log detailed results
    console.log(`\nEvaluating: ${song.track.title} by ${song.track.artist}`);
    console.log(`  Theme Similarity: ${theme_similarity.toFixed(2)}`);
    console.log(`  Thematic Contradiction: ${thematic_contradiction.toFixed(2)}`);
    console.log(`  Mood Similarity: ${mood_similarity.toFixed(2)}`);
    console.log(`  Mood Compatibility: ${mood_compatibility.toFixed(2)}`);
    console.log(`  Sentiment Compatibility: ${sentiment_compatibility.toFixed(2)}`);
    console.log(`  Intensity Match: ${intensity_match.toFixed(2)}`);
    console.log(`  Activity Match: ${activity_match.toFixed(2)}`);
    console.log(`  Fit Score Similarity: ${fit_score_similarity.toFixed(2)}`);

    if (vetoApplied) {
      console.log(`  ⚠️ VETO APPLIED: ${vetoReason}`);
    }

    console.log(`  FINAL SCORE: ${similarity.toFixed(2)}`);

    // Add contradictions found to the result
    return {
      track_info: song.track,
      similarity,
      component_scores,
      veto_applied: vetoApplied,
      veto_reason: vetoReason
    };
  });

  // Resolve all promises and sort by similarity
  const results = await Promise.all(matchPromises);
  matches.push(...results);
  matches.sort((a, b) => b.similarity - a.similarity);

  return matches;
}