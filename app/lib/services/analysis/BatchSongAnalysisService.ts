import { LyricsService } from '~/lib/models/Lyrics'
import type { LlmProviderManager } from '../llm/LlmProviderManager'
import { DefaultSongAnalysisService } from './SongAnalysisService'
import { logger } from '~/lib/logging/Logger'
import type { TransformedLyricsBySection } from '../lyrics/utils/lyrics-transformer'

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

export class BatchSongAnalysisService {
  private singleAnalysisService: DefaultSongAnalysisService;

  constructor(
    private readonly lyricsService: LyricsService,
    private readonly providerManager: LlmProviderManager
  ) {
    this.singleAnalysisService = new DefaultSongAnalysisService(lyricsService, providerManager);
  }

  /**
   * Extract JSON from LLM response - copied from DefaultSongAnalysisService
   * since it's a private method there
   */
  private extractJsonFromLLMResponse(responseText: string): any {
    // First try to parse the entire response as JSON
    try {
      return JSON.parse(responseText);
    } catch (parseError) {
      console.log('Initial JSON parse failed, trying alternative methods');
    }

    // Try multiple extraction methods in sequence
    let extracted = false;
    let analysisJson: any = null;

    // 1. Try to extract JSON from markdown code blocks
    if (!extracted) {
      const jsonMatch = responseText.match(/```(?:json)?([\s\S]*?)```/s);
      if (jsonMatch && jsonMatch[1]) {
        const extractedContent = jsonMatch[1].trim();
        try {
          analysisJson = JSON.parse(extractedContent);
          extracted = true;
          console.log('Successfully extracted JSON from code block');
        } catch (extractError) {
          console.error('Failed to parse code block content as JSON');
        }
      }
    }

    // 2. Try to find anything that looks like JSON with curly braces
    if (!extracted) {
      const possibleJson = responseText.match(/{[\s\S]*}/s);
      if (possibleJson) {
        try {
          analysisJson = JSON.parse(possibleJson[0]);
          extracted = true;
          console.log('Successfully extracted JSON from curly braces');
        } catch (jsonError) {
          console.error('Failed to parse curly brace content as JSON');
        }
      }
    }

    // 3. Try to clean and fix common JSON issues
    if (!extracted) {
      try {
        // Replace escaped quotes that might be causing issues
        let cleanedText = responseText.replace(/\\"([^"]*)\\"/, '"$1"');
        // Try to extract anything between outermost curly braces
        const jsonCandidate = cleanedText.match(/{[\s\S]*}/s);
        if (jsonCandidate) {
          analysisJson = JSON.parse(jsonCandidate[0]);
          extracted = true;
          console.log('Successfully parsed JSON after cleaning');
        }
      } catch (cleanError) {
        console.error('Failed to parse cleaned JSON');
      }
    }

    // 4. Try to fix double-escaped quotes (common in LLM outputs)
    if (!extracted) {
      try {
        // Replace double-escaped quotes with proper JSON quotes
        let fixedText = responseText.replace(/\\\\"([^\\]*?)\\\\"/, '"$1"');
        const fixedJson = fixedText.match(/{[\s\S]*}/s);
        if (fixedJson) {
          analysisJson = JSON.parse(fixedJson[0]);
          extracted = true;
          console.log('Successfully parsed JSON after fixing double-escaped quotes');
        }
      } catch (fixError) {
        console.error('Failed to parse after fixing double-escaped quotes');
      }
    }

    // If all extraction methods fail, throw a detailed error
    if (!extracted) {
      console.error('All JSON extraction methods failed. Full response:', responseText);
      throw new Error('Failed to extract valid JSON from LLM response');
    }

    return analysisJson;
  }

  async analyzeBatch(
    tracks: Array<{ trackId: string; artist: string; song: string }>,
    options: BatchAnalysisOptions = { batchSize: 5 }
  ): Promise<BatchAnalysisResult[]> {
    const results: BatchAnalysisResult[] = [];
    const { batchSize, onProgress } = options;

    // Process tracks in batches
    for (let i = 0; i < tracks.length; i += batchSize) {
      const batch = tracks.slice(i, i + batchSize);

      logger.info(`Processing batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(tracks.length / batchSize)}`, {
        batchSize: batch.length,
        startIndex: i
      });

      // Process batch in parallel
      const batchPromises = batch.map(async (track) => {
        try {
          const startTime = Date.now();
          const analysis = await this.singleAnalysisService.analyzeSong(track.artist, track.song);
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
            analysis
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
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      });

      // Wait for all in current batch to complete
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

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

      // Step 1: Fetch all lyrics in parallel
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

      // Step 3: Analyze successful tracks in parallel
      const analysisPromises = successfulLyrics.map(async ({ track, lyrics }) => {
        try {
          const startTime = Date.now();

          // Build the prompt with lyrics
          const filledPrompt = this.buildAnalysisPrompt(track.artist, track.song, lyrics);

          // Send to LLM
          const result = await this.providerManager.generateText(filledPrompt);
          const analysisJson = this.extractJsonFromLLMResponse(result.text);

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
   * Build the analysis prompt with lyrics
   */
  private buildAnalysisPrompt(artist: string, song: string, lyrics: TransformedLyricsBySection[]): string {
    const MUSIC_ANALYSIS_PROMPT = `Artist: {artist}
Title: {title}
Lyrics and Annotations:
{lyrics_with_annotations}

Please analyze the following song and provide analysis in this JSON format. Ensure all numerical scores are floating point numbers between 0.0-1.0, where 0.0 represents the lowest possible value and 1.0 represents the highest. Provide detailed reasoning for any score above 0.8 or below 0.2.

{
  "meaning": {
    "themes": [
      {
        "name": "Primary Theme",
        "confidence": 0.0-1.0,
        "description": "Natural language explanation of this theme and why it matters.",
        "related_themes": ["related theme 1", "related theme 2"],
        "connection": "How these themes connect within the song."
      }
    ],
    "interpretation": {
      "main_message": "Core message of the song",
      "verified": ["verified interpretations from annotations"],
      "derived": ["LLM-derived interpretations"]
    }
  },
  "emotional": {
    "dominantMood": {
      "mood": "Primary Mood",
      "description": "Why this is the dominant mood."
    },
    "progression": [
      {
        "section": "verse/chorus/bridge",
        "mood": "Specific mood in this section",
        "intensity": 0.0-1.0,
        "description": "How this section's mood contributes to the song's journey."
      }
    ],
    "intensity_score": 0.0-1.0
  },
  "context": {
    "primary_setting": "Most fitting scenario with brief why",
    "situations": {
      "perfect_for": ["situations"],
      "why": "Explanation of why these situations fit."
    },
    "activities": ["activities"],
    "temporal": ["temporal contexts"],
    "social": ["social contexts"],
    "fit_scores": {
      "morning": 0.0-1.0,
      "working": 0.0-1.0,
      "relaxation": 0.0-1.0
    }
  },
  "matchability": {
    "versatility": 0.0-1.0,
    "mood_consistency": 0.0-1.0,
    "uniqueness": 0.0-1.0
  }
}`;

    return MUSIC_ANALYSIS_PROMPT
      .replace('{artist}', artist)
      .replace('{title}', song)
      .replace('{lyrics_with_annotations}', JSON.stringify(lyrics, null, 2));
  }

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
}