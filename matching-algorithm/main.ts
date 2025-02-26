import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';
import {
  matchSongsToPlaylist,
  Song,
  Playlist,
  MatchResult
} from './matching-algorithm';

/**
 * Main function to run the enhanced music matching algorithm
 */
async function main() {
  try {
    console.log('🎵 Enhanced TypeScript Music-Playlist Matcher 🎵');

    // Load song files
    const song1 = JSON.parse(readFileSync('./llm-output_lyrics-analysis/Kendrick-Lamar_Money-Trees_analysis.json', 'utf-8'));
    const song2 = JSON.parse(readFileSync('./llm-output_lyrics-analysis/Lana-Del-Rey_California_analysis.json', 'utf-8'));
    const song3 = JSON.parse(readFileSync('./llm-output_lyrics-analysis/Taylor-Swift_closure_analysis.json', 'utf-8'));
    const song4 = JSON.parse(readFileSync('./llm-output_lyrics-analysis/Wallows_Are-You-Bored-Yet_analysis.json', 'utf-8'));
    const song5 = JSON.parse(readFileSync('./llm-output_lyrics-analysis/Corinne-Bailey_Put-Your-Records-On_analysis.json', 'utf-8'));
    const playlistRaw = JSON.parse(readFileSync('./llm-output_playlist-analysis/playlist_0df21fc1_1740096420736.json', 'utf-8'));

    console.log('✅ Loaded 5 songs and 1 playlist successfully');

    // Handle playlist structure variations
    const playlist = playlistRaw.playlist || playlistRaw;

    console.log(`Playlist: ${playlist.id || 'Unknown'}`);
    console.log(`Playlist Mood: ${playlist.emotional?.dominantMood?.mood || 'Unknown'}`);

    // Run the enhanced matching algorithm
    const matches = await matchSongsToPlaylist(
      playlist as Playlist,
      [song1, song2, song3, song4, song5] as Song[]
    );

    // Display results in a table format
    displayResults(matches, [song1, song2, song3, song4, song5]);

    // Save results for evaluation
    saveResultsForEvaluation(matches, [song1, song2, song3, song4, song5], playlist);

  } catch (error) {
    console.error('❌ Error:', error);
    if (error instanceof Error && error.message.includes('ECONNREFUSED')) {
      console.error('Make sure the Python FastAPI server is running on http://localhost:8000');
    }
  }
}

/**
 * Display the matching results in a nicely formatted table
 */
function displayResults(matches: MatchResult[], songs: Song[]) {
  // Display results in a table format
  console.log('\n📋 Enhanced Match Results:');
  console.log('-'.repeat(120));
  console.log('| Song                 | Artist          | Score | Theme | Mood  | M.Comp | Sentiment | Intensity | Activity | Fit  |');
  console.log('-'.repeat(120));

  matches.forEach((match) => {
    const title = match.track_info?.title || 'Unknown';
    const artist = match.track_info?.artist || 'Unknown';
    const scores = match.component_scores;

    // Format with 2 decimal places
    const overall = match.similarity.toFixed(2);
    const theme = scores.theme_similarity.toFixed(2);
    const mood = scores.mood_similarity.toFixed(2);
    const moodComp = scores.mood_compatibility.toFixed(2);
    const sentiment = scores.sentiment_compatibility.toFixed(2);
    const intensity = scores.intensity_match.toFixed(2);
    const activity = scores.activity_match.toFixed(2);
    const fit = scores.fit_score_similarity.toFixed(2);

    // Format to fixed width for table appearance
    const titlePadded = title.padEnd(20).substring(0, 20);
    const artistPadded = artist.padEnd(15).substring(0, 15);

    console.log(`| ${titlePadded} | ${artistPadded} | ${overall} | ${theme} | ${mood} | ${moodComp} | ${sentiment} | ${intensity} | ${activity} | ${fit} |`);
  });

  console.log('-'.repeat(120));
  console.log('Legend:');
  console.log('- Score: Final weighted score');
  console.log('- Theme: Theme content similarity (vector-based)');
  console.log('- Mood: Mood description similarity (vector-based)');
  console.log('- M.Comp: Mood compatibility (semantic analysis)');
  console.log('- Sentiment: Sentiment compatibility (positive/negative/neutral analysis)');
  console.log('- Intensity: Emotional intensity match');
  console.log('- Activity: Activity context matching');
  console.log('- Fit: Fit score similarity for different contexts');

  // Display songs by mood and compatibility
  console.log('\n📊 Detailed Song-Playlist Compatibility:');
  const playlistMood = matches.length > 0 ?
    songs.find(s => s.track.title === matches[0].track_info.title)?.analysis.emotional.dominantMood.mood || 'Unknown' :
    'Unknown';

  console.log(`Playlist mood: ${playlistMood}`);
  console.log('-'.repeat(100));

  matches.forEach((match) => {
    const title = match.track_info?.title || 'Unknown';
    const artist = match.track_info?.artist || 'Unknown';

    // Find the song in our array to get its mood
    const songObj = songs.find(s => s.track.title === title && s.track.artist === artist);

    const mood = songObj?.analysis?.emotional?.dominantMood?.mood || 'Unknown';
    const score = match.similarity.toFixed(2);
    const compatibility = match.component_scores?.mood_compatibility.toFixed(2) || 'N/A';
    const sentiment = match.component_scores?.sentiment_compatibility.toFixed(2) || 'N/A';

    const titleArtist = `${title} by ${artist}`.padEnd(35);
    console.log(`${titleArtist} | Mood: ${mood.padEnd(20)} | Score: ${score} | Mood Compat: ${compatibility} | Sentiment: ${sentiment}`);
  });

  console.log('-'.repeat(100));
  console.log('\n✨ Enhanced matching algorithm completed successfully!');
}

/**
 * Get the current git commit hash
 */
function getCurrentCommitHash(): string {
  try {
    return execSync('git rev-parse HEAD').toString().trim().substring(0, 8);
  } catch (error) {
    console.error('Failed to get git commit hash:', error);
    return 'unknown';
  }
}

/**
 * Save matching results to a JSON file with the commit hash in the filename
 */
function saveResultsForEvaluation(matches: MatchResult[], songs: Song[], playlist: Playlist): void {
  // Create evaluation directory if it doesn't exist
  const evalDir = './algorithm_evaluation_results';
  if (!existsSync(evalDir)) {
    mkdirSync(evalDir);
  }

  // Get current commit hash for the filename
  const commitHash = getCurrentCommitHash();
  
  // Start with index 0 and increment if file exists
  let fileIndex = 0;
  let filename = `results_${commitHash}_${fileIndex}.json`;
  let filePath = join(evalDir, filename);
  
  // Check if file exists and increment index if needed
  while (existsSync(filePath)) {
    fileIndex++;
    filename = `results_${commitHash}_${fileIndex}.json`;
    filePath = join(evalDir, filename);
  }
  
  // Prepare results in a structured format
  const results = {
    commit_hash: commitHash,
    timestamp: new Date().toISOString(),
    playlist: {
      id: playlist.id || 'unknown',
      name: playlist.name || 'unknown',
      dominant_mood: playlist.emotional?.dominantMood?.mood || 'unknown'
    },
    matches: matches.map(match => {
      // Find the corresponding song for additional details
      const song = songs.find(s => 
        s.track.title === match.track_info.title && 
        s.track.artist === match.track_info.artist
      );
      
      return {
        track: {
          title: match.track_info.title,
          artist: match.track_info.artist
        },
        final_score: match.similarity,
        component_scores: match.component_scores,
        song_mood: song?.analysis.emotional?.dominantMood?.mood || 'unknown'
      };
    })
  };
  
  // Write to file
  try {
    writeFileSync(filePath, JSON.stringify(results, null, 2));
    console.log(`\n✅ Evaluation results saved to ${filePath}`);
  } catch (error) {
    console.error('Failed to save evaluation results:', error);
  }
}

main();