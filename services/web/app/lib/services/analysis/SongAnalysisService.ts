import { LyricsService } from '~/lib/models/Lyrics'
import { SongAnalysisService as ISongAnalysisService } from '~/lib/models/SongAnalysis'
import type { LlmProviderManager } from '../llm/LlmProviderManager'
import * as v from 'valibot'
import { SongAnalysisSchema, type SongAnalysis } from './analysis-schemas'
import { logger } from '~/lib/logging/Logger'
import type { TransformedLyricsBySection } from '../lyrics/utils/lyrics-transformer'
import { AudioFeaturesService } from '~/lib/services/audio/AudioFeaturesService'
import { createReccoBeatsService } from '~/lib/services/reccobeats/ReccoBeatsService'
import type { ReccoBeatsAudioFeatures } from '~/lib/services/reccobeats/ReccoBeatsService'
import { trackRepository } from '~/lib/repositories/TrackRepository'

export interface BatchAnalysisOptions {
  batchSize: 1 | 5 | 10;
  onProgress?: (completed: number, total: number) => void;
}

export interface BatchAnalysisResult {
  trackId: string;
  artist: string;
  song: string;
  success: boolean;
  analysis?: string;
  error?: string;
}

// Streamlined prompt for focused song analysis with audio features
const ENHANCED_MUSIC_ANALYSIS_PROMPT = `You are an expert music analyst. Analyze this song comprehensively using both lyrics and audio features.

Artist: {artist}
Title: {title}
Lyrics and Annotations:
{lyrics_with_annotations}

Audio Features:
{audio_features}

Use the audio features to inform your analysis:
- High energy/tempo/danceability → higher workout/party/driving scores
- High valence → positive mood, low valence → melancholic/dark mood
- High acousticness → organic/intimate, low → electronic/produced
- Use actual valence and energy values in the emotional section

IMPORTANT STYLE GUIDELINES:
- Write in direct, present-tense language as an observer
- Never use phrases like "The song is about..." or "The artist expresses..."
- Instead use patterns like: "Someone's fighting to...", "We're witnessing...", "Here's a person who..."
- Make the emotional journey follow the actual song structure (intro, verse 1, chorus, verse 2, etc.)
- Be specific about which lyrics appear in which sections

Provide analysis in this exact JSON format:

{
  "meaning": {
    "themes": [
      {
        "name": "Primary theme",
        "confidence": 0.8-1.0,
        "description": "What this theme represents and why it matters"
      }
    ],
    "interpretation": {
      "surface_meaning": "Direct description of what's happening (e.g., 'Someone's watching their relationship crumble...')",
      "deeper_meaning": "The underlying dynamics and subtext (e.g., 'There's a power struggle here...')",
      "cultural_significance": "Why this resonates culturally (if applicable)",
      "metaphors": [
        {
          "text": "The metaphorical line or phrase",
          "meaning": "What it represents"
        }
      ],
      "key_lines": [
        {
          "line": "Most impactful lyric",
          "significance": "Why this line matters"
        }
      ]
    }
  },
  "emotional": {
    "dominant_mood": "happy/sad/angry/anxious/nostalgic/empowered/melancholic/euphoric",
    "mood_description": "Why this mood dominates and how it's conveyed",
    "intensity": 0.0-1.0,
    "valence": 0.0-1.0,
    "energy": 0.0-1.0,
    "journey": [
      {
        "section": "Intro/Verse 1/Pre-Chorus/Chorus/Verse 2/Bridge/Outro (match actual song structure)",
        "mood": "The emotional state in this section",
        "description": "What happens emotionally here, referencing specific lyrics"
      }
    ],
    "emotional_peaks": ["Moments of highest emotional intensity"]
  },
  "context": {
    "listening_contexts": {
      "workout": 0.0-1.0,
      "party": 0.0-1.0,
      "relaxation": 0.0-1.0,
      "focus": 0.0-1.0,
      "driving": 0.0-1.0,
      "emotional_release": 0.0-1.0,
      "cooking": 0.0-1.0,
      "social_gathering": 0.0-1.0,
      "morning_routine": 0.0-1.0,
      "late_night": 0.0-1.0,
      "romance": 0.0-1.0,
      "meditation": 0.0-1.0
    },
    "best_moments": ["Perfect situations to play this song"],
    "audience": {
      "primary_demographic": "Main audience (if specific)",
      "universal_appeal": 0.0-1.0,
      "resonates_with": ["Types of people who connect with this"]
    }
  },
  "musical_style": {
    "genre_primary": "Main genre",
    "genre_secondary": "Secondary genre influence",
    "vocal_style": "rap/singing/spoken/melodic/aggressive/smooth",
    "production_style": "minimal/lush/electronic/organic/experimental",
    "sonic_texture": "Description of how the song sounds/feels",
    "distinctive_elements": ["Unique production or musical elements"]
  },
  "matching_profile": {
    "mood_consistency": 0.0-1.0,
    "energy_flexibility": 0.0-1.0,
    "theme_cohesion": 0.0-1.0,
    "sonic_similarity": 0.0-1.0
  }
}`

export class SongAnalysisService implements ISongAnalysisService {
  private readonly audioFeaturesService: AudioFeaturesService

  constructor(
    private readonly lyricsService: LyricsService,
    private readonly providerManager: LlmProviderManager
  ) {
    // Initialize audio features service
    const reccoBeatsService = createReccoBeatsService()
    this.audioFeaturesService = new AudioFeaturesService(reccoBeatsService)
  }

  async fetchSongLyricsAndAnnotations(artist: string, song: string): Promise<string> {
    const lyrics = await this.lyricsService.getLyrics(artist, song)
    return JSON.stringify(lyrics, null, 2)
  }

  private extractJsonFromLLMResponse(responseText: string): any {
    // Try multiple extraction methods
    const methods = [
      // Method 1: Direct JSON parse
      () => JSON.parse(responseText),

      // Method 2: Extract from code blocks
      () => {
        const match = responseText.match(/```(?:json)?([\s\S]*?)```/s)
        if (match?.[1]) {
          return JSON.parse(match[1].trim())
        }
        throw new Error('No code block found')
      },

      // Method 3: Extract from curly braces
      () => {
        const match = responseText.match(/{[\s\S]*}/s)
        if (match) {
          return JSON.parse(match[0])
        }
        throw new Error('No JSON object found')
      },

      // Method 4: Clean and retry
      () => {
        const cleaned = responseText
          .replace(/\\"([^"]*)\\"/g, '"$1"')
          .replace(/\\\\"([^\\]*?)\\\\"/g, '"$1"')
        const match = cleaned.match(/{[\s\S]*}/s)
        if (match) {
          return JSON.parse(match[0])
        }
        throw new Error('Cleaning failed')
      }
    ]

    for (const method of methods) {
      try {
        const result = method()
        return result
      } catch (error) {
        continue
      }
    }

    console.error('All JSON extraction methods failed. Response:', responseText.slice(0, 500))
    throw new Error('Failed to extract valid JSON from LLM response')
  }

  async analyzeSong(artist: string, song: string, trackId?: number): Promise<string> {
    try {
      // 1. Get lyrics
      const lyrics = await this.lyricsService.getLyrics(artist, song)

      // 2. Get audio features if trackId is provided
      let audioFeatures: ReccoBeatsAudioFeatures | null = null
      if (trackId) {
        const track = await trackRepository.getTrackById(trackId)
        if (track?.spotify_track_id) {
          audioFeatures = await this.audioFeaturesService.fetchFeatures(trackId, track.spotify_track_id)
        }
      }

      // 3. Build enhanced prompt with formatted audio features
      const filledPrompt = ENHANCED_MUSIC_ANALYSIS_PROMPT
        .replace('{artist}', artist)
        .replace('{title}', song)
        .replace('{lyrics_with_annotations}', JSON.stringify(lyrics, null, 2))
        .replace('{audio_features}', this.formatAudioFeatures(audioFeatures))

      if (!this.providerManager) {
        throw new Error('LLM Provider Manager is not initialized')
      }

      const result = await this.providerManager.generateText(filledPrompt)

      const analysisJson = this.extractJsonFromLLMResponse(result.text)

      // Validate using valibot schema
      const validatedAnalysis = this.validateAndParseAnalysis(analysisJson)

      // Attach audio features if available
      if (audioFeatures) {
        validatedAnalysis.audio_features = {
          tempo: audioFeatures.tempo,
          energy: audioFeatures.energy,
          valence: audioFeatures.valence,
          danceability: audioFeatures.danceability,
          acousticness: audioFeatures.acousticness,
          instrumentalness: audioFeatures.instrumentalness,
          liveness: audioFeatures.liveness,
          speechiness: audioFeatures.speechiness,
          loudness: audioFeatures.loudness
        }
      }

      // Return the standard format expected by workers
      return JSON.stringify({
        model: this.providerManager.getCurrentModel(),
        analysis: validatedAnalysis
      })
    } catch (error) {
      throw new Error(`Failed to analyze song ${artist} - ${song}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  private validateAndParseAnalysis(analysis: unknown): SongAnalysis {
    try {
      // Use valibot to validate and parse the analysis
      const result = v.safeParse(SongAnalysisSchema, analysis)

      if (result.success) {
        return result.output
      } else {
        // Return the analysis as-is if it has the basic structure
        // This maintains backward compatibility
        if (typeof analysis === 'object' && analysis !== null &&
          'meaning' in analysis && 'emotional' in analysis) {
          return analysis as SongAnalysis
        }

        throw new Error('Invalid analysis structure')
      }
    } catch (error) {
      console.error('[SongAnalysis] Validation error:', error)
      // If validation fails completely, throw to trigger retry
      throw new Error(`Analysis validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }


  /**
   * Optimized batch analysis with parallel lyrics fetching
   * Fetches all lyrics in parallel before sending to LLM for better performance
   */
  async analyzeBatchOptimized(
    tracks: Array<{ trackId: string; artist: string; song: string }>,
    options: BatchAnalysisOptions = { batchSize: 5 }
  ): Promise<BatchAnalysisResult[]> {
    const results: BatchAnalysisResult[] = [];
    const { batchSize, onProgress } = options;

    // Process tracks in batches
    for (let i = 0; i < tracks.length; i += batchSize) {
      const batch = tracks.slice(i, i + batchSize);

      logger.info(`Processing optimized batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(tracks.length / batchSize)}`, {
        batchSize: batch.length,
        startIndex: i
      });

      const lyricsPromises = batch.map(async (track) => {
        try {
          const startTime = Date.now();
          const lyrics = await this.lyricsService.getLyrics(track.artist, track.song);
          const duration = Date.now() - startTime;

          logger.info(`Lyrics fetched for: ${track.artist} - ${track.song}`, {
            trackId: track.trackId,
            duration
          });

          return { track, lyrics, success: true };
        } catch (error) {
          logger.warn(`Failed to fetch lyrics for ${track.artist} - ${track.song}`, {
            trackId: track.trackId,
            error: error instanceof Error ? error.message : String(error)
          });
          return {
            track,
            lyrics: null,
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch lyrics'
          };
        }
      });

      const lyricsResults = await Promise.all(lyricsPromises);

      // Step 2: Separate successful and failed lyrics fetches
      const successfulLyrics = lyricsResults.filter(r => r.success && r.lyrics) as Array<{
        track: typeof tracks[0];
        lyrics: TransformedLyricsBySection[];
        success: true;
      }>;
      const failedLyrics = lyricsResults.filter(r => !r.success) as Array<{
        track: typeof tracks[0];
        lyrics: null;
        success: false;
        error: string;
      }>;

      // Step 3: Analyze successful tracks in parallel using pre-fetched lyrics
      const analysisPromises = successfulLyrics.map(async ({ track, lyrics }) => {
        try {
          const startTime = Date.now();

          // Get audio features for the track using class-level service
          let audioFeatures: ReccoBeatsAudioFeatures | null = null;
          try {
            const trackIdNum = parseInt(track.trackId);
            if (!Number.isNaN(trackIdNum)) {
              const dbTrack = await trackRepository.getTrackById(trackIdNum);
              if (dbTrack?.spotify_track_id) {
                audioFeatures = await this.audioFeaturesService.fetchFeatures(trackIdNum, dbTrack.spotify_track_id);
              }
            }
          } catch (audioError) {
            logger.warn(`Failed to fetch audio features for ${track.artist} - ${track.song}`, { error: audioError });
          }

          // Build the prompt with pre-fetched lyrics and audio features
          const filledPrompt = this.buildAnalysisPrompt(track.artist, track.song, lyrics, audioFeatures);

          // Send to LLM
          const result = await this.providerManager.generateText(filledPrompt);
          const analysisJson = this.extractJsonFromLLMResponse(result.text);

          // Attach audio features if available (matching analyzeSong behavior)
          if (audioFeatures) {
            analysisJson.audio_features = {
              tempo: audioFeatures.tempo,
              energy: audioFeatures.energy,
              valence: audioFeatures.valence,
              danceability: audioFeatures.danceability,
              acousticness: audioFeatures.acousticness,
              instrumentalness: audioFeatures.instrumentalness,
              liveness: audioFeatures.liveness,
              speechiness: audioFeatures.speechiness,
              loudness: audioFeatures.loudness
            };
          }

          const duration = Date.now() - startTime;
          logger.info(`Analysis completed for track: ${track.artist} - ${track.song}`, {
            trackId: track.trackId,
            duration
          });

          return {
            trackId: track.trackId,
            artist: track.artist,
            song: track.song,
            success: true,
            analysis: JSON.stringify({
              model: this.providerManager.getCurrentModel(),
              analysis: analysisJson
            })
          };
        } catch (error) {
          logger.error(`Analysis failed for track: ${track.artist} - ${track.song}`, {
            trackId: track.trackId,
            error: error instanceof Error ? error.message : String(error)
          });

          return {
            trackId: track.trackId,
            artist: track.artist,
            song: track.song,
            success: false,
            error: `Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          };
        }
      });

      const analysisResults = await Promise.all(analysisPromises);

      // Step 4: Add failed lyrics fetches to results
      failedLyrics.forEach(({ track, error }) => {
        results.push({
          trackId: track.trackId,
          artist: track.artist,
          song: track.song,
          success: false,
          error: `Lyrics fetch failed: ${error}`
        });
      });

      // Add analysis results (both successful and failed)
      results.push(...analysisResults);

      // Report progress
      if (onProgress) {
        onProgress(results.length, tracks.length);
      }

      // Add small delay between batches to avoid rate limits
      if (i + batchSize < tracks.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }

  /**
   * Analyze tracks with automatic retry for failures
   */
  async analyzeBatchWithRetry(
    tracks: Array<{ trackId: string; artist: string; song: string }>,
    options: BatchAnalysisOptions & { maxRetries?: number } = { batchSize: 5, maxRetries: 1 }
  ): Promise<BatchAnalysisResult[]> {
    const { maxRetries = 1, ...batchOptions } = options;

    // First pass - use optimized method
    let results = await this.analyzeBatchOptimized(tracks, batchOptions);

    // Retry failures
    let retryCount = 0;
    while (retryCount < maxRetries) {
      const failures = results.filter(r => !r.success);
      if (failures.length === 0) break;

      logger.info(`Retrying ${failures.length} failed tracks (attempt ${retryCount + 1}/${maxRetries})`);

      const retryTracks = failures.map(f => ({
        trackId: f.trackId,
        artist: f.artist,
        song: f.song
      }));

      // Retry with smaller batch size for failures
      const retryResults = await this.analyzeBatchOptimized(retryTracks, {
        ...batchOptions,
        batchSize: Math.min(batchOptions.batchSize, 3) as 1 | 5 | 10
      });

      // Update results with retry outcomes
      results = results.map(original => {
        const retryResult = retryResults.find(r => r.trackId === original.trackId);
        return retryResult || original;
      });

      retryCount++;
    }

    return results;
  }

  /**
   * Format audio features as human-readable text for LLM prompt
   */
  private formatAudioFeatures(audioFeatures: ReccoBeatsAudioFeatures | null): string {
    if (!audioFeatures) {
      return 'Audio features not available - analyze based on lyrics only';
    }

    return `Tempo: ${audioFeatures.tempo} BPM
Energy: ${audioFeatures.energy} (0.0 = low, 1.0 = high)
Valence: ${audioFeatures.valence} (0.0 = sad/negative, 1.0 = happy/positive)
Danceability: ${audioFeatures.danceability} (0.0 = not danceable, 1.0 = very danceable)
Acousticness: ${audioFeatures.acousticness} (0.0 = not acoustic, 1.0 = acoustic)
Instrumentalness: ${audioFeatures.instrumentalness} (0.0 = vocal, 1.0 = instrumental)
Liveness: ${audioFeatures.liveness} (0.0 = studio, 1.0 = live performance)
Speechiness: ${audioFeatures.speechiness} (0.0 = non-speech, 1.0 = speech-like)
Loudness: ${audioFeatures.loudness} dB`;
  }

  /**
   * Build the analysis prompt with lyrics and audio features
   */
  private buildAnalysisPrompt(
    artist: string,
    song: string,
    lyrics: TransformedLyricsBySection[],
    audioFeatures: ReccoBeatsAudioFeatures | null
  ): string {
    return ENHANCED_MUSIC_ANALYSIS_PROMPT
      .replace('{artist}', artist)
      .replace('{title}', song)
      .replace('{lyrics_with_annotations}', JSON.stringify(lyrics, null, 2))
      .replace('{audio_features}', this.formatAudioFeatures(audioFeatures));
  }
}