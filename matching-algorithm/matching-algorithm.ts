// API configuration
const API_URL = 'http://localhost:8000';

// Type definitions
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
};

export type MatchResult = {
  track_info: Track;
  similarity: number;
  component_scores: MatchScores;
};

/**
 * Extract themes text from a song or playlist
 */
export function extractThemesText(data: Song | Playlist): string {
  const meaning = 'analysis' in data ? data.analysis.meaning : data.meaning;

  // Extract theme names and descriptions
  const themes = meaning.themes || [];
  const themeNames = themes.map(t => t.name || '').filter(Boolean);
  const themeDescriptions = themes.map(t => t.description || '').filter(Boolean);

  // Get main message
  let mainMessage = meaning.main_message || '';
  if (!mainMessage && meaning.interpretation) {
    mainMessage = meaning.interpretation.main_message || '';
  }

  // Combine all theme information
  return [...themeNames, ...themeDescriptions, mainMessage].join(' ');
}

/**
 * Extract mood text from a song or playlist
 */
export function extractMoodText(data: Song | Playlist): string {
  const emotional = 'analysis' in data ? data.analysis.emotional : data.emotional;

  // Extract mood and description
  const dominantMood = emotional.dominantMood?.mood || '';
  const moodDescription = emotional.dominantMood?.description || '';

  // Combine mood information
  return `${dominantMood} ${moodDescription}`;
}

/**
 * Calculate intensity match (0-1 scale)
 */
export function calculateIntensityMatch(playlistIntensity?: number, songIntensity?: number): number {
  if (playlistIntensity === undefined || songIntensity === undefined) {
    return 0.5;
  }

  // Calculate the difference (normalized to 0-1 where 1 = perfect match)
  const intensityDiff = 1.0 - Math.abs(playlistIntensity - songIntensity);
  return intensityDiff;
}

/**
 * Calculate cosine similarity between two vectors
 */
export function calculateCosineSimilarity(vec1: number[], vec2: number[]): number {
  if (!vec1 || !vec2 || vec1.length !== vec2.length) {
    return 0.5;
  }

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

  return dotProduct / (mag1 * mag2);
}

/**
 * Get sentiment scores using the 5-class multilingual sentiment model
 */
export async function getSentimentScores(text: string): Promise<SentimentScore> {
  const response = await fetch(`${API_URL}/analyze/sentiment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text })
  });

  if (!response.ok) {
    throw new Error(`Failed to get sentiment: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Get mood embedding from API
 */
export async function getMoodEmbedding(mood: string, description?: string): Promise<number[]> {
  const text = description ? `${mood}: ${description}` : mood;

  const response = await fetch(`${API_URL}/vectorize/text`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text })
  });

  if (!response.ok) {
    throw new Error(`Failed to get mood embedding: ${response.statusText}`);
  }

  const result = await response.json();
  return result.embedding;
}

/**
 * Semantic mood compatibility - determines if moods are compatible rather than identical
 * Uses vector embedding distance to measure compatibility
 */
export async function calculateMoodCompatibility(
  playlistMood: string,
  playlistMoodDesc: string,
  songMood: string,
  songMoodDesc: string
): Promise<number> {
  // If either mood is missing, return neutral score
  if (!playlistMood || !songMood) {
    return 0.5;
  }

  // Get embeddings for the moods
  const playlistEmbed = await getMoodEmbedding(playlistMood, playlistMoodDesc);
  const songEmbed = await getMoodEmbedding(songMood, songMoodDesc);

  // Calculate similarity
  const similarity = calculateCosineSimilarity(playlistEmbed, songEmbed);

  // Apply logistic transformation to create better distribution
  // This gives higher scores for similar moods and lower for dissimilar ones
  // but is less harsh than a simple threshold
  return 1 / (1 + Math.exp(-10 * (similarity - 0.5)));
}

/**
 * Calculate fit score similarity between playlist and song
 */
export function calculateFitScoreSimilarity(
  playlistFitScores?: { [key: string]: number },
  songFitScores?: { [key: string]: number }
): number {
  if (!playlistFitScores || !songFitScores) {
    return 0.5;
  }

  // Get all possible context types
  const allContexts = new Set([
    ...Object.keys(playlistFitScores),
    ...Object.keys(songFitScores)
  ]);

  // Calculate Euclidean distance between fit scores
  let sumSquaredDiff = 0;
  let count = 0;

  for (const context of allContexts) {
    const playlistScore = playlistFitScores[context] ?? 0.5;
    const songScore = songFitScores[context] ?? 0.5;

    sumSquaredDiff += Math.pow(playlistScore - songScore, 2);
    count++;
  }

  if (count === 0) return 0.5;

  // Convert distance to similarity (1 - normalized distance)
  const distance = Math.sqrt(sumSquaredDiff / count);
  return 1 - Math.min(distance, 1);
}

/**
 * Extract activities from context data
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
 * Match activities between playlist and song
 */
export function calculateActivityMatch(
  playlistActivities: string[] = [],
  songActivities: string[] = []
): number {
  if (playlistActivities.length === 0 || songActivities.length === 0) {
    return 0.5;
  }

  // Preprocess and tokenize all activities
  const normalizeActivities = (activities: string[]): Set<string> => {
    const result = new Set<string>();
    for (const activity of activities) {
      // Split into words and store individual tokens as well as the full phrase
      activity.toLowerCase().split(/\W+/).forEach(token => {
        if (token.length > 2) result.add(token);
      });
      // Also add the full activity
      result.add(activity.toLowerCase());
    }
    return result;
  };

  const playlistTokens = normalizeActivities(playlistActivities);
  const songTokens = normalizeActivities(songActivities);

  // Find matches
  const intersection = new Set(
    [...playlistTokens].filter(x => songTokens.has(x))
  );

  // Calculate Jaccard similarity
  const union = new Set([...playlistTokens, ...songTokens]);
  if (union.size === 0) return 0.5;

  return intersection.size / union.size;
}

/**
 * Get song embedding from API
 */
export async function getSongEmbedding(song: Song): Promise<number[]> {
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
}

/**
 * Get playlist embedding from API
 */
export async function getPlaylistEmbedding(playlist: Playlist): Promise<number[]> {
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
}

/**
 * Helper function to extract mood-specific vector from full embedding
 */
export function extractMoodVector(embedding: number[]): number[] {
  const startIdx = Math.floor(embedding.length * 0.3);
  const endIdx = Math.floor(embedding.length * 0.6);
  return embedding.slice(startIdx, endIdx);
}

/**
 * Enhanced matching algorithm with weighted components
 */
export async function matchSongsToPlaylist(playlist: Playlist, songs: Song[]): Promise<MatchResult[]> {
  console.log('\n🔄 Matching songs to playlist...');

  // Get playlist embeddings and metadata
  const playlistEmbedding = await getPlaylistEmbedding(playlist);
  const playlistMood = playlist.emotional?.dominantMood?.mood || '';
  const playlistMoodDesc = playlist.emotional?.dominantMood?.description || '';
  const playlistIntensity = playlist.emotional?.intensity_score;
  const playlistThemeText = extractThemesText(playlist);
  const playlistMoodText = extractMoodText(playlist);
  const playlistActivities = extractActivities(playlist.context);

  console.log(`Playlist: ${playlist.id}`);
  console.log(`Playlist Mood: ${playlistMood}`);

  // Prepare song embeddings
  const songEmbeddings = await Promise.all(
    songs.map(song => getSongEmbedding(song))
  );

  // Get playlist sentiment
  const playlistSentiment = await getSentimentScores(
    `${playlistThemeText} ${playlistMoodText}`
  );

  // Calculate matches for each song
  const matches: MatchResult[] = [];
  const matchPromises = songs.map(async (song, index) => {
    const songEmbedding = songEmbeddings[index];
    const songMood = song.analysis.emotional?.dominantMood?.mood || '';
    const songMoodDesc = song.analysis.emotional?.dominantMood?.description || '';
    const songIntensity = song.analysis.emotional?.intensity_score;
    const songThemeText = extractThemesText(song);
    const songMoodText = extractMoodText(song);
    const songActivities = extractActivities(song.analysis.context);

    // Calculate component scores
    const theme_similarity = calculateCosineSimilarity(
      playlistEmbedding,
      songEmbedding
    );

    // Process mood separately to get more accurate mood comparisons
    const mood_similarity = calculateCosineSimilarity(
      extractMoodVector(playlistEmbedding),
      extractMoodVector(songEmbedding)
    );

    const mood_compatibility = await calculateMoodCompatibility(
      playlistMood,
      playlistMoodDesc,
      songMood,
      songMoodDesc
    );

    // Compare sentiment compatibility
    const songSentiment = await getSentimentScores(
      `${songThemeText} ${songMoodText}`
    );

    const sentiment_compatibility = 1 - (
      Math.abs(playlistSentiment.positive - songSentiment.positive) +
      Math.abs(playlistSentiment.negative - songSentiment.negative) +
      Math.abs(playlistSentiment.neutral - songSentiment.neutral)
    ) / 2;

    // Additional component scores
    const intensity_match = calculateIntensityMatch(
      playlistIntensity,
      songIntensity
    );

    const activity_match = calculateActivityMatch(
      playlistActivities,
      songActivities
    );

    const fit_score_similarity = calculateFitScoreSimilarity(
      playlist.context?.fit_scores,
      song.analysis.context?.fit_scores
    );

    // Calculate final weighted score using a more balanced approach
    const component_scores = {
      theme_similarity,
      mood_similarity,
      mood_compatibility,
      sentiment_compatibility,
      intensity_match,
      activity_match,
      fit_score_similarity
    };

    // Assign weights to each component
    const weights = {
      theme_similarity: 0.20,
      mood_similarity: 0.15,
      mood_compatibility: 0.25,
      sentiment_compatibility: 0.15,
      intensity_match: 0.10,
      activity_match: 0.10,
      fit_score_similarity: 0.05
    };

    // Calculate weighted score
    let weighted_score = 0;
    for (const [component, score] of Object.entries(component_scores)) {
      weighted_score += score * weights[component as keyof typeof weights];
    }

    // Log detailed results
    console.log(`\nEvaluating: ${song.track.title} by ${song.track.artist}`);
    console.log(`  Theme Similarity: ${theme_similarity.toFixed(2)}`);
    console.log(`  Mood Similarity: ${mood_similarity.toFixed(2)}`);
    console.log(`  Mood Compatibility: ${mood_compatibility.toFixed(2)}`);
    console.log(`  Sentiment Compatibility: ${sentiment_compatibility.toFixed(2)}`);
    console.log(`  Intensity Match: ${intensity_match.toFixed(2)}`);
    console.log(`  Activity Match: ${activity_match.toFixed(2)}`);
    console.log(`  Fit Score Similarity: ${fit_score_similarity.toFixed(2)}`);
    console.log(`  FINAL SCORE: ${weighted_score.toFixed(2)}`);

    return {
      track_info: song.track,
      similarity: weighted_score,
      component_scores
    };
  });

  // Resolve all promises and sort by similarity
  const results = await Promise.all(matchPromises);
  matches.push(...results);
  matches.sort((a, b) => b.similarity - a.similarity);

  return matches;
}