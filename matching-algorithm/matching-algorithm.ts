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

export type MoodDimensions = {
  valence: number;  // 0-1 scale (negative to positive)
  arousal: number;  // 0-1 scale (calming to energetic)
  dominance: number;  // 0-1 scale (submissive to dominant)
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
 * Check if two specific themes contradict each other based on known opposites
 */
function checkSpecificThemeContradiction(theme1: string, theme2: string): {
  isContradiction: boolean;
  level: number;
  reason: string;
} {
  // Define specific contradictory theme pairs with higher severity levels
  const contradictionPairs: [string, string, string, number][] = [
    // [theme1, theme2, reason, severity(0-1)]
    // Original pairs with increased severity
    ['self-care', 'violence', 'Self-care vs. violence', 0.95],
    ['self-care', 'conflict', 'Self-care vs. conflict', 0.9],
    ['self-care', 'destruction', 'Self-care vs. destruction', 0.95],
    ['relaxation', 'anxiety', 'Relaxation vs. anxiety', 0.9],
    ['relaxation', 'tension', 'Relaxation vs. tension', 0.9],
    ['relaxation', 'stress', 'Relaxation vs. stress', 0.9],
    ['positive', 'negative', 'Positive vs. negative', 0.95],
    ['uplifting', 'depressing', 'Uplifting vs. depressing', 0.95],
    ['hope', 'despair', 'Hope vs. despair', 0.95],
    ['confidence', 'doubt', 'Confidence vs. doubt', 0.9],
    ['confidence', 'insecurity', 'Confidence vs. insecurity', 0.9],
    ['empowerment', 'defeat', 'Empowerment vs. defeat', 0.95],
    ['empowerment', 'helplessness', 'Empowerment vs. helplessness', 0.95],
    ['peace', 'conflict', 'Peace vs. conflict', 0.95],
    ['peace', 'war', 'Peace vs. war', 0.95],
    ['joy', 'sorrow', 'Joy vs. sorrow', 0.9],
    ['triumph', 'failure', 'Triumph vs. failure', 0.9],
    ['growth', 'stagnation', 'Growth vs. stagnation', 0.85],
    ['clarity', 'confusion', 'Clarity vs. confusion', 0.85],
    ['hope', 'resignation', 'Hope vs. resignation', 0.9],
    ['inspiring', 'disappointing', 'Inspiring vs. disappointing', 0.9],
    ['acceptance', 'rejection', 'Acceptance vs. rejection', 0.85],
    ['comfort', 'discomfort', 'Comfort vs. discomfort', 0.85],
    ['optimism', 'pessimism', 'Optimism vs. pessimism', 0.9],
    ['success', 'failure', 'Success vs. failure', 0.9],

    // New pairs with high severity
    ['uplifting', 'struggle', 'Uplifting vs. struggle', 0.8],
    ['self-care', 'hardship', 'Self-care vs. hardship', 0.85],
    ['healing', 'violence', 'Healing vs. violence', 0.95],
    ['healing', 'conflict', 'Healing vs. conflict', 0.9],
    ['wellness', 'suffering', 'Wellness vs. suffering', 0.9],
    ['self-love', 'self-criticism', 'Self-love vs. self-criticism', 0.9],
    ['self-love', 'self-hatred', 'Self-love vs. self-hatred', 0.95],
    ['peaceful', 'violent', 'Peaceful vs. violent', 0.95],
    ['calm', 'chaotic', 'Calm vs. chaotic', 0.9],
    ['support', 'abandonment', 'Support vs. abandonment', 0.9],
    ['confidence', 'shame', 'Confidence vs. shame', 0.95],
    ['positivity', 'negativity', 'Positivity vs. negativity', 0.95],
    ['positivity', 'cynicism', 'Positivity vs. cynicism', 0.9],
    ['joy', 'misery', 'Joy vs. misery', 0.95],
    ['happiness', 'suffering', 'Happiness vs. suffering', 0.95],
    ['motivation', 'apathy', 'Motivation vs. apathy', 0.9],
    ['motivation', 'resignation', 'Motivation vs. resignation', 0.9],
    ['inspiration', 'disillusionment', 'Inspiration vs. disillusionment', 0.9],
    ['uplifting', 'violent', 'Uplifting vs. violent', 0.95],
    ['uplifting', 'poverty', 'Uplifting vs. poverty', 0.8],
    ['uplifting', 'crime', 'Uplifting vs. crime', 0.9],
    ['empowerment', 'oppression', 'Empowerment vs. oppression', 0.95],
    ['self-care', 'crime', 'Self-care vs. crime', 0.9],
    ['self-care', 'poverty', 'Self-care vs. poverty', 0.8],
    ['happy', 'brutal', 'Happy vs. brutal', 0.95],
    ['joyful', 'violent', 'Joyful vs. violent', 0.95],
    ['carefree', 'struggle', 'Carefree vs. struggle', 0.85]
  ];

  // Check for direct contradictions
  for (const [oppositeA, oppositeB, reason, level] of contradictionPairs) {
    // Check both directions
    if ((theme1.includes(oppositeA) && theme2.includes(oppositeB)) ||
      (theme1.includes(oppositeB) && theme2.includes(oppositeA))) {
      return {
        isContradiction: true,
        level: level,
        reason: reason
      };
    }
  }

  // Check for partial contradictions using theme categories
  const categoryMap: Record<string, string[]> = {
    'positive': ['happy', 'joy', 'uplift', 'inspir', 'empower', 'confiden', 'optim', 'success', 'self-care', 'wellness', 'healing'],
    'negative': ['sad', 'depress', 'dark', 'gloomy', 'melanchol', 'anxiety', 'fear', 'doubt', 'struggle', 'hardship', 'suffering', 'pain', 'violent', 'crime', 'poverty'],
    'energetic': ['energy', 'activ', 'dynamic', 'power', 'vigor', 'vitality', 'motion'],
    'calm': ['calm', 'relax', 'peace', 'tranquil', 'serene', 'gentle', 'quiet', 'still'],
    'growth': ['growth', 'develop', 'progress', 'advance', 'improve', 'evolve', 'better'],
    'struggle': ['struggle', 'conflict', 'fight', 'battl', 'challeng', 'obstacle', 'hardship', 'poverty', 'crime', 'violence', 'war']
  };

  // Get categories for each theme
  const getCategories = (theme: string): string[] => {
    return Object.entries(categoryMap)
      .filter(([_, keywords]) =>
        keywords.some(keyword => theme.includes(keyword)))
      .map(([category, _]) => category);
  };

  const categories1 = getCategories(theme1);
  const categories2 = getCategories(theme2);

  // Define category contradictions with higher severity
  const categoryContradictions: [string, string, string, number][] = [
    ['positive', 'negative', 'Positive vs. negative themes', 0.9],
    ['energetic', 'calm', 'Energetic vs. calm themes', 0.7],
    ['growth', 'struggle', 'Growth vs. struggle themes', 0.8],
    ['calm', 'struggle', 'Calm vs. struggle themes', 0.85]
  ];

  // Check for category contradictions
  for (const [catA, catB, reason, level] of categoryContradictions) {
    if ((categories1.includes(catA) && categories2.includes(catB)) ||
      (categories1.includes(catB) && categories2.includes(catA))) {
      return {
        isContradiction: true,
        level: level,
        reason: reason
      };
    }
  }

  // No contradiction found
  return {
    isContradiction: false,
    level: 0,
    reason: ''
  };
}

/**
 * Fallback function for theme contradiction detection
 */
function fallbackThemeContradictionDetection(
  playlistThemes: Theme[],
  songThemes: Theme[]
): { score: number; contradictions: string[] } {
  // Define explicitly contradictory category pairs
  const contradictoryPairs: [string, string][] = [
    ['positive', 'negative'],
    ['relaxing', 'energetic'],
    ['spiritual', 'material'],
    ['positive', 'conflict'],
    ['self-care', 'violence'],
    ['healing', 'conflict'],
    ['peace', 'struggle']
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
  let contradictionScore = 0;

  if (contradictions.length > 0) {
    // Base score based on number of contradictions
    contradictionScore = Math.min(contradictions.length * 0.3, 0.9);
  }

  return {
    score: contradictionScore,
    contradictions
  };
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
 * Check if two moods belong to contradictory categories
 */
function checkMoodCategoryContradiction(moodA: string, moodB: string): boolean {
  // Map moods to emotional categories
  const categorize = (mood: string): string[] => {
    const categories: string[] = [];

    // Positive categories
    if (mood.includes('happy') || mood.includes('joy') ||
      mood.includes('upbeat') || mood.includes('cheerful') ||
      mood.includes('optimistic') || mood.includes('uplift') ||
      mood.includes('hopeful') || mood.includes('enthusiastic') ||
      mood.includes('love') || mood.includes('positive')) {
      categories.push('positive');
    }

    // Negative categories
    if (mood.includes('sad') || mood.includes('depress') ||
      mood.includes('melancholy') || mood.includes('gloomy') ||
      mood.includes('somber') || mood.includes('despair') ||
      mood.includes('grief') || mood.includes('bitter') ||
      mood.includes('resentment') || mood.includes('angry') ||
      mood.includes('frustrated') || mood.includes('negative')) {
      categories.push('negative');
    }

    // Energetic categories
    if (mood.includes('energetic') || mood.includes('dynamic') ||
      mood.includes('lively') || mood.includes('excited') ||
      mood.includes('passionate') || mood.includes('intense') ||
      mood.includes('vigor') || mood.includes('power')) {
      categories.push('energetic');
    }

    // Calm categories
    if (mood.includes('calm') || mood.includes('relax') ||
      mood.includes('peaceful') || mood.includes('tranquil') ||
      mood.includes('serene') || mood.includes('gentle') ||
      mood.includes('soothing')) {
      categories.push('calm');
    }

    // Specific high-impact contradictions
    if (mood.includes('resent')) categories.push('resentment');
    if (mood.includes('uplift')) categories.push('uplifting');
    if (mood.includes('empower')) categories.push('empowering');
    if (mood.includes('anxious') || mood.includes('anxiety')) categories.push('anxious');
    if (mood.includes('confiden')) categories.push('confident');
    if (mood.includes('content')) categories.push('content');
    if (mood.includes('nostalg')) categories.push('nostalgic');

    return categories;
  };

  const aCats = categorize(moodA);
  const bCats = categorize(moodB);

  // Define contradictory category pairs
  const contradictions: [string, string][] = [
    ['positive', 'negative'],
    ['energetic', 'calm'],
    ['resentment', 'uplifting'],
    ['resentment', 'empowering'],
    ['anxious', 'confident'],
    ['anxious', 'content']
  ];

  // Check if any category from A contradicts any from B
  for (const [cat1, cat2] of contradictions) {
    if ((aCats.includes(cat1) && bCats.includes(cat2)) ||
      (aCats.includes(cat2) && bCats.includes(cat1))) {
      return true;
    }
  }

  return false;
}

/**
 * Fallback method for mood contradiction detection
 */
function fallbackMoodContradictionCheck(
  moodA: string,
  moodB: string
): { contradictionLevel: number, opposite: boolean } {
  const moodALower = moodA.toLowerCase();
  const moodBLower = moodB.toLowerCase();

  // Direct opposites (expanded list of mood contradictions)
  const directOpposites: [string, string][] = [
    // Original pairs
    ['happy', 'sad'],
    ['joy', 'sorrow'],
    ['optimistic', 'pessimistic'],
    ['energetic', 'lethargic'],
    ['calm', 'agitated'],
    ['peaceful', 'turbulent'],
    ['love', 'hate'],
    ['hopeful', 'despairing'],
    ['confident', 'insecure'],
    ['uplifting', 'depressing'],
    ['resentment', 'forgiveness'],

    // Added more direct opposites
    ['uplifting', 'resentment'],
    ['empowering', 'resentment'],
    ['cheerful', 'angry'],
    ['joyful', 'resentful'],
    ['optimistic', 'bitter'],
    ['positive', 'negative'],
    ['happy', 'angry'],
    ['upbeat', 'melancholy'],
    ['enthusiastic', 'apathetic'],
    ['bright', 'dark'],
    ['light', 'heavy'],
    ['uplifting', 'discouraging'],
    ['uplifting', 'heavy'],
    ['empowering', 'discouraging'],
    ['hopeful', 'cynical'],
    ['cheerful', 'depressed'],
    ['confident', 'doubtful'],
    ['peaceful', 'aggressive'],
    ['upbeat', 'downbeat'],
    ['contented', 'dissatisfied'],
    ['satisfied', 'frustrated'],
    ['relaxed', 'tense'],
    ['soothing', 'disturbing'],
    ['comforting', 'distressing'],
    ['motivating', 'draining'],
    ['calm', 'chaotic'],
    ['serene', 'tumultuous'],
    ['tranquil', 'turbulent'],
    ['confident', 'fearful'],
    ['safe', 'threatened'],
    ['secure', 'insecure'],
    ['inspiring', 'discouraging']
  ];

  // Check direct opposites
  for (const [opp1, opp2] of directOpposites) {
    if ((moodALower.includes(opp1) && moodBLower.includes(opp2)) ||
      (moodALower.includes(opp2) && moodBLower.includes(opp1))) {
      return { contradictionLevel: 0.95, opposite: true }; // Increased from 0.9
    }
  }

  // Partial contradictions (expanded list with higher contradiction levels)
  const partialContradictions: [string, string][] = [
    // Original pairs
    ['happy', 'melancholy'],
    ['cheerful', 'serious'],
    ['optimistic', 'worried'],
    ['relaxed', 'tense'],
    ['uplifting', 'melancholy'],
    ['empowering', 'uncertain'],

    // Added more partial opposites
    ['positive', 'somber'],
    ['upbeat', 'serious'],
    ['energetic', 'calm'],
    ['passionate', 'detached'],
    ['enthusiastic', 'reserved'],
    ['joyful', 'pensive'],
    ['cheerful', 'reflective'],
    ['celebratory', 'nostalgic'],
    ['uplifting', 'nostalgic'],
    ['empowering', 'reflective'],
    ['confident', 'cautious'],
    ['determined', 'hesitant'],
    ['carefree', 'careful'],
    ['light', 'thoughtful'],
    ['playful', 'mature'],
    ['fun', 'serious']
  ];

  // Check partial contradictions
  for (const [opp1, opp2] of partialContradictions) {
    if ((moodALower.includes(opp1) && moodBLower.includes(opp2)) ||
      (moodALower.includes(opp2) && moodBLower.includes(opp1))) {
      return { contradictionLevel: 0.8, opposite: false }; // Increased from 0.7
    }
  }

  // Check for general mood categories that might conflict
  const categorize = (mood: string): string[] => {
    const categories: string[] = [];

    // Positive valence moods
    if (mood.includes('happy') || mood.includes('joy') || mood.includes('uplift') ||
      mood.includes('positive') || mood.includes('optimistic') || mood.includes('cheerful') ||
      mood.includes('bright') || mood.includes('light') || mood.includes('confident') ||
      mood.includes('empower')) {
      categories.push('positive');
    }

    // Negative valence moods
    if (mood.includes('sad') || mood.includes('depress') || mood.includes('melanchol') ||
      mood.includes('angry') || mood.includes('resentment') || mood.includes('bitter') ||
      mood.includes('dark') || mood.includes('heavy') || mood.includes('negative') ||
      mood.includes('somber') || mood.includes('gloomy')) {
      categories.push('negative');
    }

    return categories;
  };

  const moodACats = categorize(moodALower);
  const moodBCats = categorize(moodBLower);

  // If one mood is clearly positive and the other clearly negative, that's a contradiction
  if ((moodACats.includes('positive') && moodBCats.includes('negative')) ||
    (moodACats.includes('negative') && moodBCats.includes('positive'))) {
    return { contradictionLevel: 0.9, opposite: true };
  }

  // No clear contradiction
  return { contradictionLevel: 0, opposite: false };
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
 * ENHANCED: Calculate final match score with non-linear transformations and context-aware weighting
 */
export function calculateFinalScore(
  scores: MatchScores,
  playlistType: 'mood' | 'activity' | 'theme' | 'general' = 'general',
  song?: Song
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

  // Get base weights for this playlist type
  const baseWeights = weights[playlistType];
  
  // If song is provided, apply context-aware weighting
  const finalWeights = song 
    ? calculateContextAwareWeights(playlistType, song, baseWeights) 
    : baseWeights;

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

  Object.entries(finalWeights).forEach(([key, weight]) => {
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
 * NEW: Context-Aware Weighting function that adjusts weights based on song's release date and cultural context
 */
export function calculateContextAwareWeights(
  playlistType: 'mood' | 'activity' | 'theme' | 'general',
  song: Song,
  baseWeights: Record<keyof MatchScores, number>
): Record<keyof MatchScores, number> {
  // Clone the base weights to avoid modifying the original
  const adjustedWeights = { ...baseWeights };
  
  // Get current year for comparison
  const currentYear = new Date().getFullYear();
  
  // Extract release year from the song if available
  let releaseYear: number | undefined;
  
  // Parse year from timestamp if available (assuming format like "2022-01-01")
  if (song.timestamp && !isNaN(parseInt(song.timestamp.substring(0, 4)))) {
    releaseYear = parseInt(song.timestamp.substring(0, 4));
  }
  
  // If we have a release year, adjust weights based on era differences
  if (releaseYear) {
    const yearDifference = currentYear - releaseYear;
    
    // For older songs (20+ years), emphasize thematic matching more than mood
    if (yearDifference > 20) {
      // Reduce mood weight and increase theme weight for older songs
      adjustedWeights.mood_compatibility *= 0.85;
      adjustedWeights.theme_similarity *= 1.15;
      
      // Cultural context shifts mean sentiment analysis needs adjustment
      adjustedWeights.sentiment_compatibility *= 0.9;
    }
    // For songs from 5-20 years ago, make smaller adjustments
    else if (yearDifference > 5) {
      adjustedWeights.mood_compatibility *= 0.95;
      adjustedWeights.theme_similarity *= 1.05;
    }
  }
  
  // Adjust weights based on cultural context inferred from themes
  const lowercaseThemes = song.analysis.meaning.themes
    .map(theme => theme.name.toLowerCase());
    
  // If culture-specific or era-specific themes are detected, adjust weights
  const culturalThemes = [
    'jazz', 'blues', 'classical', 'folk', 'traditional', 
    'regional', 'historical', 'cultural', 'heritage'
  ];
  
  const hasCulturalContext = lowercaseThemes.some(theme => 
    culturalThemes.some(culturalTheme => theme.includes(culturalTheme))
  );
  
  if (hasCulturalContext) {
    // For songs with strong cultural context, adjust weights
    adjustedWeights.theme_similarity *= 1.1;
    adjustedWeights.mood_compatibility *= 0.9;
  }
  
  // Normalize weights to ensure they sum to the same total
  const originalSum = Object.values(baseWeights).reduce((a, b) => a + b, 0);
  const adjustedSum = Object.values(adjustedWeights).reduce((a, b) => a + b, 0);
  
  // Only normalize if the sum has changed
  if (Math.abs(originalSum - adjustedSum) > 0.01) {
    const normalizationFactor = originalSum / adjustedSum;
    
    for (const key in adjustedWeights) {
      adjustedWeights[key as keyof MatchScores] *= normalizationFactor;
    }
  }
  
  return adjustedWeights;
}

/**
 * Helper function to get top themes from a song or playlist
 */
function getTopThemes(item: Song | Playlist, count: number): string[] {
  if (!item.meaning?.themes || item.meaning.themes.length === 0) {
    return ['unknown'];
  }
  
  return item.meaning.themes
    .sort((a, b) => (b.confidence || 0) - (a.confidence || 0))
    .slice(0, count)
    .map(theme => theme.name);
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
  console.log(`Playlist Mood: ${playlist.emotional?.dominantMood?.mood || 'Unknown'}`);

  // Get playlist embeddings 
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

  // Get playlist sentiment scores for compatibility checks
  const playlistSentiment = await getSentimentScores(
    `${playlistThemeText} ${playlistMoodText}`
  );

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
    const similarity = calculateFinalScore(component_scores, playlistType, song);

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

/**
 * Get dimensional mood analysis using the new API endpoint
 */
export async function getMoodDimensions(text: string): Promise<MoodDimensions> {
  try {
    const response = await fetch(`${API_URL}/analyze/mood_dimensions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text })
    });

    if (!response.ok) {
      console.error(`Error from mood dimensions API: ${response.status}`);
      // Return default values in case of error
      return { valence: 0.5, arousal: 0.5, dominance: 0.5 };
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting mood dimensions:', error);
    // Return default values in case of error
    return { valence: 0.5, arousal: 0.5, dominance: 0.5 };
  }
}

/**
 * Calculate mood compatibility using dimensional VAD model 
 * This provides a more nuanced view of mood than categorical models
 */
export async function calculateDimensionalMoodCompatibility(
  playlistMoodText: string,
  songMoodText: string,
  playlistType: 'mood' | 'activity' | 'theme' | 'general' = 'general'
): Promise<number> {
  // Get the dimensional mood analyses
  const playlistDimensions = await getMoodDimensions(playlistMoodText);
  const songDimensions = await getMoodDimensions(songMoodText);

  // Calculate Euclidean distance in 3D VAD space (normalized to 0-1)
  const valenceDistance = Math.abs(playlistDimensions.valence - songDimensions.valence);
  const arousalDistance = Math.abs(playlistDimensions.arousal - songDimensions.arousal);
  const dominanceDistance = Math.abs(playlistDimensions.dominance - songDimensions.dominance);

  // Different weights for different dimensions based on playlist type
  let valenceWeight = 1.0;
  let arousalWeight = 1.0;
  let dominanceWeight = 1.0;

  // Adjust weights based on playlist type
  switch (playlistType) {
    case 'mood':
      // For mood playlists, valence (positive/negative) is most important
      valenceWeight = 1.5;
      arousalWeight = 1.0;
      dominanceWeight = 0.8;
      break;
    case 'activity':
      // For activity playlists, arousal (energy) matters most
      valenceWeight = 0.8;
      arousalWeight = 1.5;
      dominanceWeight = 1.0;
      break;
    case 'theme':
      // For theme playlists, all dimensions are about equally important
      valenceWeight = 1.0;
      arousalWeight = 1.0;
      dominanceWeight = 1.0;
      break;
    default:
      // For general playlists, valence and arousal are slightly more important
      valenceWeight = 1.2;
      arousalWeight = 1.1;
      dominanceWeight = 0.9;
  }

  // Calculate weighted distance
  const weightedSum = 
    valenceDistance * valenceWeight + 
    arousalDistance * arousalWeight + 
    dominanceDistance * dominanceWeight;
  
  const totalWeight = valenceWeight + arousalWeight + dominanceWeight;
  const weightedDistance = weightedSum / totalWeight;

  // Convert distance to similarity (0 distance = 1 similarity)
  const similarity = 1 - weightedDistance;

  // Apply non-linear transformation to emphasize good matches
  // This gives extra weight to very close matches
  return Math.pow(similarity, 0.7);
}

/**
 * Generate human-readable explanations for why a song matches or doesn't match a playlist
 */
export function generateMatchExplanation(
  scores: MatchScores,
  song: Song,
  playlist: Playlist,
  playlistType: 'mood' | 'activity' | 'theme' | 'general'
): string {
  // Identify the strongest match components
  const scoreEntries = Object.entries(scores) as [keyof MatchScores, number][];
  // Filter out contradiction score which is inverted (higher is worse)
  const positiveScores = scoreEntries.filter(([key]) => key !== 'thematic_contradiction');
  // Sort by score (highest first)
  const sortedScores = positiveScores.sort((a, b) => b[1] - a[1]);
  
  // Get top 3 reasons for the match
  const topReasons = sortedScores.slice(0, 3);
  
  // Identify any potential mismatches (low scores)
  const lowScores = positiveScores.filter(([_, score]) => score < 0.4);
  const hasLowScores = lowScores.length > 0;
  
  // Check if veto was applied
  const vetoResult = applyVetoLogic(scores);
  const vetoApplied = vetoResult.vetoApplied;
  
  let explanation = '';
  
  // Generate opening statement
  if (vetoApplied) {
    explanation = `"${song.track.title}" by ${song.track.artist} is not a good match for this playlist. `;
    explanation += `${vetoResult.vetoReason}. `;
  } else if (hasLowScores && sortedScores[0][1] < 0.6) {
    explanation = `"${song.track.title}" by ${song.track.artist} is a moderate match for this playlist. `;
  } else {
    explanation = `"${song.track.title}" by ${song.track.artist} is a good match for this playlist. `;
  }
  
  // Add top reasons for matching
  if (!vetoApplied) {
    explanation += 'The song matches because: ';
    
    topReasons.forEach(([key, score], index) => {
      if (score > 0.5) { // Only include meaningful matches
        if (index > 0) explanation += ', ';
        
        switch(key) {
          case 'theme_similarity':
            explanation += `the themes (${getTopThemes(song, 2).join(", ")}) align well with the playlist's themes (${getTopThemes(playlist, 2).join(", ")})`;
            break;
            
          case 'mood_similarity':
            explanation += `the mood "${song.analysis.emotional?.dominantMood?.mood || 'unknown'}" complements the playlist's mood "${playlist.emotional?.dominantMood?.mood || 'unknown'}"`;
            break;
            
          case 'mood_compatibility':
            explanation += `the emotional tone is compatible with the playlist`;
            break;
            
          case 'sentiment_compatibility':
            explanation += `the sentiment aligns with the playlist's emotional direction`;
            break;
            
          case 'intensity_match':
            explanation += `the song's energy level matches the playlist's intensity`;
            break;
            
          case 'activity_match':
            explanation += `the activities or settings associated with the song fit the playlist context`;
            break;
            
          case 'fit_score_similarity':
            explanation += `the situational context is appropriate for this playlist`;
            break;
        }
      }
    });
  }
  
  // Add information about mismatches if relevant
  if (hasLowScores && !vetoApplied) {
    explanation += ' However, there are some mismatches: ';
    
    lowScores.forEach(([key, score], index) => {
      if (index > 0) explanation += ', ';
      
      switch(key) {
        case 'theme_similarity':
          explanation += `the themes differ from the playlist's focus`;
          break;
          
        case 'mood_similarity':
          explanation += `the mood "${song.analysis.emotional?.dominantMood?.mood || 'unknown'}" is different from the playlist's mood "${playlist.emotional?.dominantMood?.mood || 'unknown'}"`;
          break;
          
        case 'mood_compatibility':
          explanation += `the emotional tone contrasts with the playlist's overall mood`;
          break;
          
        case 'sentiment_compatibility':
          explanation += `the sentiment doesn't fully align with the playlist's emotional direction`;
          break;
          
        case 'intensity_match':
          explanation += `the song's energy level is ${score < 0.3 ? 'very' : 'somewhat'} different from the playlist's intensity`;
          break;
          
        case 'activity_match':
          explanation += `the activities or settings associated with the song don't strongly match the playlist context`;
          break;
          
        case 'fit_score_similarity':
          explanation += `the situational context isn't ideal for this playlist`;
          break;
      }
    });
  }
  
  // Add playlist type context
  explanation += ` This is primarily a ${playlistType}-focused playlist.`;
  
  return explanation;
}