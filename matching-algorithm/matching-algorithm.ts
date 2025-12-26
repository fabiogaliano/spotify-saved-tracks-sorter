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
  dominant_mood: Mood;
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
 * Enhanced thematic contradiction detection using vectorization and semantic analysis
 * Relies entirely on API for contradiction detection
 */
export async function detectThematicContradictions(
  playlistThemes: Theme[],
  songThemes: Theme[]
): Promise<{ score: number; contradictions: string[] }> {
  // Extract theme names and descriptions for richer context
  const playlistThemeNames = playlistThemes
    .map(t => t.name)
    .filter(Boolean);

  const songThemeNames = songThemes
    .map(t => t.name)
    .filter(Boolean);

  // Extract descriptions for more context
  const playlistDescriptions = playlistThemes
    .map(t => t.description)
    .filter(Boolean);

  const songDescriptions = songThemes
    .map(t => t.description)
    .filter(Boolean);

  // Combine names and descriptions for better semantic analysis
  const playlistThemeTexts = [
    ...playlistThemeNames.map(name => `Theme: ${name}`),
    ...playlistDescriptions.map(desc => `Description: ${desc}`)
  ];

  const songThemeTexts = [
    ...songThemeNames.map(name => `Theme: ${name}`),
    ...songDescriptions.map(desc => `Description: ${desc}`)
  ];

  // Skip processing if we don't have enough theme data
  if (playlistThemeTexts.length === 0 || songThemeTexts.length === 0) {
    return { score: 0, contradictions: [] };
  }

  // Detect contradictions using vector-based approach
  const detectedContradictions: string[] = [];
  let totalContradictionScore = 0;

  // 1. Check each playlist theme against all song themes for compatibility
  for (let i = 0; i < playlistThemeNames.length; i++) {
    const playlistTheme = playlistThemeNames[i];
    const playlistDescription = playlistDescriptions[i] || '';

    // Get sentiment for playlist theme
    const playlistSentiment = await getSentimentScores(
      `${playlistTheme}: ${playlistDescription}`
    );

    for (let j = 0; j < songThemeNames.length; j++) {
      const songTheme = songThemeNames[j];
      const songDescription = songDescriptions[j] || '';

      // 1A. Get vector embeddings of each theme pair to check semantic similarity
      const response1 = await fetch(`${API_URL}/vectorize/text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `Theme: ${playlistTheme}. Description: ${playlistDescription}`
        })
      });

      const response2 = await fetch(`${API_URL}/vectorize/text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `Theme: ${songTheme}. Description: ${songDescription}`
        })
      });

      const embedding1 = await response1.json();
      const embedding2 = await response2.json();

      // Calculate semantic similarity
      const similarity = calculateEnhancedSimilarity(
        embedding1.embedding,
        embedding2.embedding
      );

      // 1B. Get sentiment for song theme
      const songSentiment = await getSentimentScores(
        `${songTheme}: ${songDescription}`
      );

      // 1C. Determine if there's a sentiment polarity mismatch
      const playlistPolarity = getHighestSentiment(playlistSentiment);
      const songPolarity = getHighestSentiment(songSentiment);

      // 1D. Check if themes are contradictory
      let contradictionFound = false;
      let contradictionLevel = 0;

      // Low semantic similarity with opposite sentiment - strong contradiction
      if (similarity < 0.3 &&
        ((playlistPolarity === 'positive' && songPolarity === 'negative') ||
          (playlistPolarity === 'negative' && songPolarity === 'positive'))) {
        contradictionFound = true;
        contradictionLevel = 0.9;
        detectedContradictions.push(
          `"${playlistTheme}" (${playlistPolarity}) contradicts "${songTheme}" (${songPolarity})`
        );
      }
      // Moderate semantic distance with sentiment mismatch - moderate contradiction
      else if (similarity < 0.4 &&
        playlistPolarity !== songPolarity &&
        playlistPolarity !== 'neutral' &&
        songPolarity !== 'neutral') {
        contradictionFound = true;
        contradictionLevel = 0.7;
        detectedContradictions.push(
          `"${playlistTheme}" has different emotional tone than "${songTheme}"`
        );
      }
      // Extreme semantic distance - possible thematic contradiction
      else if (similarity < 0.25) {
        contradictionFound = true;
        contradictionLevel = 0.5;
        detectedContradictions.push(
          `"${playlistTheme}" is semantically distant from "${songTheme}"`
        );
      }

      // Add to total contradiction score
      if (contradictionFound) {
        totalContradictionScore += contradictionLevel *
          (playlistThemes[i].confidence || 0.5) *
          (songThemes[j].confidence || 0.5);
      }
    }
  }

  // Calculate final score based on detected contradictions
  const contradictionCount = detectedContradictions.length;
  const averageThemeCount = (playlistThemeNames.length + songThemeNames.length) / 2;

  // Normalize the contradiction score
  let normalizedScore = 0;
  if (contradictionCount > 0) {
    // Normalize by the number of theme pairs and their severities
    normalizedScore = Math.min(1, totalContradictionScore / (averageThemeCount * 0.7));
  }

  return {
    score: normalizedScore,
    contradictions: detectedContradictions
  };
}

/**
 * Get the dominant sentiment from sentiment scores
 */
function getHighestSentiment(sentiment: SentimentScore): 'positive' | 'negative' | 'neutral' {
  if (sentiment.positive > sentiment.negative && sentiment.positive > sentiment.neutral) {
    return 'positive';
  }
  if (sentiment.negative > sentiment.positive && sentiment.negative > sentiment.neutral) {
    return 'negative';
  }
  return 'neutral';
}


/**
 * Detect mood contradictions using sentiment analysis and vector embeddings
 * Relies entirely on API for contradiction detection without fallbacks
 */
export async function detectMoodContradictions(
  playlistMood: string,
  songMood: string
): Promise<{ score: number; explanation: string }> {
  // Skip if we don't have both moods
  if (!playlistMood || !songMood) {
    return { score: 0, explanation: "Missing mood data" };
  }

  // Get sentiment for both moods
  const playlistSentiment = await getSentimentScores(playlistMood);
  const songSentiment = await getSentimentScores(songMood);

  // Determine dominant sentiment for each
  const playlistDominantSentiment = getHighestSentiment(playlistSentiment);
  const songDominantSentiment = getHighestSentiment(songSentiment);

  // Calculate contradiction strength based on sentiment differences
  let contradictionStrength = 0;
  let explanation = "";

  // 1. Check for direct sentiment polarity opposition
  if (
    (playlistDominantSentiment === "positive" && songDominantSentiment === "negative") ||
    (playlistDominantSentiment === "negative" && songDominantSentiment === "positive")
  ) {
    contradictionStrength = 0.8;
    explanation = `Opposing sentiment polarities: ${playlistDominantSentiment} vs ${songDominantSentiment}`;
  }

  // 2. Check semantic similarity using vector embeddings
  // Fetch embeddings for both moods
  const response1 = await fetch(`${API_URL}/vectorize/text`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: playlistMood })
  });

  const response2 = await fetch(`${API_URL}/vectorize/text`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: songMood })
  });

  const embedding1 = await response1.json();
  const embedding2 = await response2.json();

  // Calculate semantic similarity between the two moods
  const similarity = calculateEnhancedSimilarity(
    embedding1.embedding,
    embedding2.embedding
  );

  // 3. Semantic distance indicates potential contradiction
  if (similarity < 0.3) {
    // Stronger contradiction if sentiment analysis also shows opposition
    if (contradictionStrength > 0) {
      contradictionStrength = Math.max(contradictionStrength, 0.9);
      explanation = `${playlistMood} and ${songMood} are semantically different with opposing sentiment`;
    } else {
      contradictionStrength = 0.7;
      explanation = `${playlistMood} and ${songMood} are semantically distant (${similarity.toFixed(2)} similarity)`;
    }
  }
  // 4. Moderate semantic distance
  else if (similarity < 0.5) {
    // If sentiment analysis showed some opposition, increase strength
    if (contradictionStrength > 0) {
      // Keep existing contradiction strength
      explanation = `${explanation} with moderate semantic distance`;
    } else if (playlistDominantSentiment !== songDominantSentiment &&
      playlistDominantSentiment !== "neutral" &&
      songDominantSentiment !== "neutral") {
      contradictionStrength = 0.5;
      explanation = `${playlistMood} and ${songMood} have different emotional tones`;
    }
  }

  // If no contradiction found through any method
  if (contradictionStrength === 0) {
    explanation = `No significant contradiction between ${playlistMood} and ${songMood}`;
  }

  return {
    score: contradictionStrength,
    explanation
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
  const dominantMood = emotional.dominant_mood?.mood || '';
  const moodDescription = emotional.dominant_mood?.description || '';

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
  const moodContradiction = await detectMoodContradictions(
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

  // Check for severe contradictions based on score
  if (moodContradiction.score > 0.7) {
    // Direct opposites get severe penalty
    finalScore = Math.max(0, 0.3 - (moodContradiction.score * 0.3));
  } else if (moodContradiction.score > 0) {
    // Partial contradictions get moderate penalty
    finalScore = Math.max(0, 0.55 - (moodContradiction.score * 0.15));
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
  playlistFitScores?: { [key: string]: number | undefined },
  songFitScores?: { [key: string]: number | undefined }
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
    // Handle undefined values by defaulting to 0
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
 * Apply dynamic veto logic based on song-playlist compatibility analysis
 * Uses proportional scoring instead of fixed thresholds
 */
export function applyVetoLogic(scores: MatchScores): {
  finalScore: number;
  vetoApplied: boolean;
  vetoReason: string
} {
  // Start with a perfect score
  let finalScore = 1.0;
  let vetoApplied = false;
  let vetoReason = '';

  // Apply proportional contradiction penalties rather than fixed caps
  // Thematic contradictions - scale penalty by contradiction severity
  if (scores.thematic_contradiction > 0) {
    // Proportionally reduce score based on contradiction severity
    const reductionFactor = scores.thematic_contradiction * 1.5; // Amplify the effect
    finalScore *= (1 - reductionFactor);

    // Only count as veto if significant reduction
    if (reductionFactor > 0.5) {
      vetoApplied = true;
      vetoReason = `Thematic contradiction detected (${(scores.thematic_contradiction * 100).toFixed(0)}% severity)`;
    }
  }

  // Mood compatibility issues - scale penalty by compatibility gap
  const moodGap = 1 - scores.mood_compatibility;
  if (moodGap > 0.3) { // Only apply if significant gap
    const moodPenalty = moodGap * 1.2; // Amplify the effect
    finalScore *= (1 - moodPenalty);

    // Only count as veto if significant reduction
    if (moodPenalty > 0.5) {
      vetoApplied = true;
      if (vetoReason) vetoReason += ' & ';
      vetoReason += `Poor mood compatibility (${(scores.mood_compatibility * 100).toFixed(0)}%)`;
    }
  }

  // Sentiment contradictions - scale penalty by compatibility gap
  const sentimentGap = 1 - scores.sentiment_compatibility;
  if (sentimentGap > 0.4) { // Higher threshold for sentiment
    const sentimentPenalty = sentimentGap * 0.8; // Reduce effect (less important than mood)
    finalScore *= (1 - sentimentPenalty);

    // Only count as veto if significant reduction
    if (sentimentPenalty > 0.4 && !vetoApplied) {
      vetoApplied = true;
      if (vetoReason) vetoReason += ' & ';
      vetoReason += `Sentiment mismatch (${(scores.sentiment_compatibility * 100).toFixed(0)}%)`;
    }
  }

  // Ensure score is limited to a valid range
  finalScore = Math.max(0, Math.min(1, finalScore));

  return {
    finalScore,
    vetoApplied,
    vetoReason
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
      theme_similarity: 0.20,
      mood_similarity: 0.15,
      mood_compatibility: 0.35,  // Increased from 0.30
      sentiment_compatibility: 0.10,  // Decreased from 0.20
      intensity_match: 0.10,
      activity_match: 0.05,
      fit_score_similarity: 0.05,
      thematic_contradiction: 0.00
    },
    'activity': {
      theme_similarity: 0.20,
      mood_similarity: 0.10,
      mood_compatibility: 0.20,  // Increased from 0.15
      sentiment_compatibility: 0.05,  // Decreased from 0.10
      intensity_match: 0.10,
      activity_match: 0.30,  // Slightly decreased from 0.35
      fit_score_similarity: 0.05,
      thematic_contradiction: 0.00
    },
    'theme': {
      theme_similarity: 0.40,  // Increased from 0.35
      mood_similarity: 0.10,
      mood_compatibility: 0.20,  // Increased from 0.15
      sentiment_compatibility: 0.05,  // Decreased from 0.10
      intensity_match: 0.10,
      activity_match: 0.10,
      fit_score_similarity: 0.05,
      thematic_contradiction: 0.00
    },
    'general': {
      theme_similarity: 0.30,  // Increased from 0.25
      mood_similarity: 0.15,
      mood_compatibility: 0.30,  // Increased from 0.25
      sentiment_compatibility: 0.10,  // Decreased from 0.20
      intensity_match: 0.05,
      activity_match: 0.05,
      fit_score_similarity: 0.05,
      thematic_contradiction: 0.00
    }
  };

  // Apply non-linear transformations to component scores
  const transformedScores: Partial<MatchScores> = {};

  // Transform mood compatibility score with stronger non-linear curve
  transformedScores.mood_compatibility = Math.pow(scores.mood_compatibility, 0.6);  // More aggressive curve (was 0.7)

  // Similarly transform sentiment compatibility
  transformedScores.sentiment_compatibility = Math.pow(scores.sentiment_compatibility, 0.8);

  // Use linear scale for other scores
  Object.keys(scores).forEach(key => {
    if (!transformedScores[key as keyof MatchScores]) {
      transformedScores[key as keyof MatchScores] = scores[key as keyof MatchScores];
    }
  });

  // Calculate weighted sum
  let weightedSum = 0;
  let totalWeight = 0;

  Object.entries(weights[playlistType]).forEach(([key, weight]) => {
    if (weight > 0) {
      weightedSum += (transformedScores[key as keyof MatchScores] || 0) * weight;
      totalWeight += weight;
    }
  });

  const rawScore = totalWeight > 0 ? weightedSum / totalWeight : 0;

  // Apply veto logic - this will now act as a strict cap rather than a blending factor
  const { finalScore: vetoScore, vetoApplied } = applyVetoLogic(scores);

  // If veto was applied, use the veto score directly rather than blending
  // This enforces the "deal breaker" requirement
  const finalScore = vetoApplied ? vetoScore : rawScore;

  return Math.min(1, Math.max(0, finalScore));
}

/**
 * Determine the most likely playlist type based on its content
 */
export function determinePlaylistType(playlist: Playlist): 'mood' | 'activity' | 'theme' | 'general' {
  // Extract key information
  const hasMood = !!playlist.emotional?.dominant_mood?.mood;
  const hasMoodDescription = !!playlist.emotional?.dominant_mood?.description;

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
 * Main function to match songs to a playlist with enhanced contradiction detection
 */
export async function matchSongsToPlaylist(playlist: Playlist, songs: Song[]): Promise<MatchResult[]> {
  console.log('\n🔄 Matching songs to playlist...');

  // Determine playlist type for optimal weighting
  const playlistType = determinePlaylistType(playlist);
  console.log(`Playlist Type: ${playlistType}`);
  console.log(`Playlist: ${playlist.id || 'Unknown'}`);
  console.log(`Playlist Mood: ${playlist.emotional?.dominant_mood?.mood || 'Unknown'}`);

  // Get playlist embeddings
  const playlistEmbedding = await getPlaylistEmbedding(playlist);
  const playlistMood = playlist.emotional?.dominant_mood;
  const playlistIntensity = playlist.emotional?.intensity_score;
  const playlistThemeText = extractThemesText(playlist);
  const playlistMoodText = extractMoodText(playlist);
  const playlistActivities = extractActivities(playlist.context);

  // Extract feature-specific vectors from playlist embedding
  const playlistThemeVector = extractFeatureVector(playlistEmbedding, 'theme');
  const playlistMoodVector = extractFeatureVector(playlistEmbedding, 'mood');
  const playlistActivityVector = extractFeatureVector(playlistEmbedding, 'activity');

  // Get playlist sentiment scores for compatibility checks
  const playlistSentiment = await getSentimentScores(
    `${playlistThemeText} ${playlistMoodText}`
  );

  const matchPromises = songs.map(async (song, index) => {
    // Get song embedding and metadata
    const songEmbedding = await getSongEmbedding(song);
    const songMood = song.analysis.emotional?.dominant_mood;
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

    // NEW: Detect thematic contradictions with async method
    const thematicContradiction = await detectThematicContradictions(
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
      playlist.context?.fit_scores as { [key: string]: number } | undefined,
      song.analysis.context?.fit_scores as { [key: string]: number } | undefined
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
    const { finalScore: vetoScore, vetoApplied, vetoReason } = applyVetoLogic(component_scores);

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
    console.log(`FINAL SCORE: ${similarity.toFixed(2)}${vetoApplied ? ` (Veto applied: ${vetoReason})` : ''}`);

    return {
      track_info: song.track,
      similarity,
      component_scores,
      veto_applied: vetoApplied,
      veto_reason: vetoReason
    };
  });

  // Wait for all matching to complete
  const results = await Promise.all(matchPromises);

  // Sort by similarity score (highest first)
  return results.sort((a, b) => b.similarity - a.similarity);
}