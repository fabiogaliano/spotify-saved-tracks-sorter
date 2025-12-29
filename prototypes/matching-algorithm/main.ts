import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';
import {
  matchSongsToPlaylist,
  Song,
  Playlist,
  MatchResult
} from './matching-algorithm';
import chalk from 'chalk';
import { table } from 'table';

/**
 * Main function to run the enhanced music matching algorithm
 */
async function main() {
  try {
    console.log('\n' + chalk.blue.bold('🎵 Enhanced TypeScript Music-Playlist Matcher 🎵') + '\n');

    // Load song files
    const song1 = JSON.parse(readFileSync('./llm-output_lyrics-analysis/Kendrick-Lamar_Money-Trees_analysis.json', 'utf-8'));
    const song2 = JSON.parse(readFileSync('./llm-output_lyrics-analysis/Lana-Del-Rey_California_analysis.json', 'utf-8'));
    const song3 = JSON.parse(readFileSync('./llm-output_lyrics-analysis/Taylor-Swift_closure_analysis.json', 'utf-8'));
    const song4 = JSON.parse(readFileSync('./llm-output_lyrics-analysis/Wallows_Are-You-Bored-Yet_analysis.json', 'utf-8'));
    const song5 = JSON.parse(readFileSync('./llm-output_lyrics-analysis/Corinne-Bailey_Put-Your-Records-On_analysis.json', 'utf-8'));
    const playlistRaw = JSON.parse(readFileSync('./llm-output_playlist-analysis/playlist_0df21fc1_1740096420736.json', 'utf-8'));

    console.log(chalk.green('✅ Loaded 5 songs and 1 playlist successfully'));

    // Handle playlist structure variations
    const playlist = playlistRaw.playlist || playlistRaw;

    console.log(chalk.cyan(`Playlist: ${chalk.bold(playlist.id || 'Unknown')}`));
    console.log(chalk.cyan(`Playlist Mood: ${chalk.bold(playlist.emotional?.dominant_mood?.mood || 'Unknown')}`));
    console.log();

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
    console.error(chalk.red.bold('❌ Error:'), error);
    if (error instanceof Error && error.message.includes('ECONNREFUSED')) {
      console.error(chalk.yellow('Make sure the Python FastAPI server is running on http://localhost:8000'));
    }
  }
}

/**
 * Display the matching results in a nicely formatted table
 */
function displayResults(matches: MatchResult[], songs: Song[]) {
  // Get color based on score
  const getScoreColor = (score: number) => {
    if (score >= 0.7) return chalk.green;
    if (score >= 0.5) return chalk.yellow;
    return chalk.red;
  };

  console.log(chalk.blue.bold('\n📋 Match Results:'));
  
  // Create data for main table
  const mainTableData = [
    [
      chalk.bold('Song'),
      chalk.bold('Artist'),
      chalk.bold('Score'),
      chalk.bold('Theme'),
      chalk.bold('Mood'),
      chalk.bold('M.Comp'),
      chalk.bold('Dimensional'),
      chalk.bold('Sentiment'),
      chalk.bold('Intensity')
    ]
  ];

  // Process and add each match to table data
  matches.forEach((match) => {
    const title = match.track_info?.title || 'Unknown';
    const artist = match.track_info?.artist || 'Unknown';
    const scores = match.component_scores;
    
    // Format each score with appropriate color
    const overallScore = getScoreColor(match.similarity)(match.similarity.toFixed(2));
    const themeScore = getScoreColor(scores.theme_similarity)(scores.theme_similarity.toFixed(2));
    const moodScore = getScoreColor(scores.mood_similarity)(scores.mood_similarity.toFixed(2));
    const moodCompScore = getScoreColor(scores.mood_compatibility)(scores.mood_compatibility.toFixed(2));
    
    // Format dimensional score if it exists
    const dimensionalScore = scores.dimensional_mood_compatibility 
      ? getScoreColor(scores.dimensional_mood_compatibility)(scores.dimensional_mood_compatibility.toFixed(2))
      : chalk.gray('N/A');
    
    const sentimentScore = getScoreColor(scores.sentiment_compatibility)(scores.sentiment_compatibility.toFixed(2));
    const intensityScore = getScoreColor(scores.intensity_match)(scores.intensity_match.toFixed(2));
    
    mainTableData.push([
      title,
      artist,
      overallScore,
      themeScore,
      moodScore,
      moodCompScore,
      dimensionalScore,
      sentimentScore,
      intensityScore
    ]);
  });
  
  // Configure table options for nice display
  const tableConfig = {
    border: {
      topBody: chalk.gray('─'),
      topJoin: chalk.gray('┬'),
      topLeft: chalk.gray('┌'),
      topRight: chalk.gray('┐'),
      bottomBody: chalk.gray('─'),
      bottomJoin: chalk.gray('┴'),
      bottomLeft: chalk.gray('└'),
      bottomRight: chalk.gray('┘'),
      bodyLeft: chalk.gray('│'),
      bodyRight: chalk.gray('│'),
      bodyJoin: chalk.gray('│'),
      joinBody: chalk.gray('─'),
      joinLeft: chalk.gray('├'),
      joinRight: chalk.gray('┤'),
      joinJoin: chalk.gray('┼')
    },
    columns: {
      0: { width: 20 },  // Song title
      1: { width: 15 },  // Artist
    }
  };
  
  // Display the main table
  console.log(table(mainTableData, tableConfig));
  
  // Display legend
  console.log(chalk.cyan.bold('📊 Legend:'));
  const legendData = [
    ['Score', 'Final weighted match score'],
    ['Theme', 'Theme content similarity (vector-based)'],
    ['Mood', 'Mood description similarity (vector-based)'],
    ['M.Comp', 'Mood compatibility (semantic analysis)'],
    ['Dimensional', 'VAD dimensional mood analysis compatibility'],
    ['Sentiment', 'Sentiment compatibility (positive/negative/neutral)'],
    ['Intensity', 'Emotional intensity match']
  ];
  
  // Create and display the legend table
  const legendTableData = legendData.map(([term, desc]) => [chalk.yellow(term), desc]);
  console.log(table(legendTableData, { 
    columns: {
      0: { width: 12 }
    }
  }));

  // Display songs by mood and compatibility
  console.log(chalk.blue.bold('\n📊 Detailed Song-Playlist Compatibility:'));
  
  // Get playlist mood
  const playlistMood = matches.length > 0
    ? songs.find(s => s.track.title === matches[0].track_info.title)?.analysis.emotional.dominant_mood.mood || 'Unknown'
    : 'Unknown';

  console.log(chalk.cyan(`Playlist mood: ${chalk.bold(playlistMood)}`));
  
  // Create detailed compatibility table
  const detailTableData = [
    [
      chalk.bold('Song'),
      chalk.bold('Artist'), 
      chalk.bold('Mood'),
      chalk.bold('Score'),
      chalk.bold('Mood Compat'),
      chalk.bold('Sentiment'),
      chalk.bold('Veto')
    ]
  ];
  
  // Process and add detailed information for each match
  matches.forEach((match) => {
    const title = match.track_info?.title || 'Unknown';
    const artist = match.track_info?.artist || 'Unknown';
    
    // Find the song in our array to get its mood
    const songObj = songs.find(s => 
      s.track.title === title && 
      s.track.artist === artist
    );
    const mood = songObj?.analysis?.emotional?.dominant_mood?.mood || 'Unknown';
    
    // Format scores
    const score = getScoreColor(match.similarity)(match.similarity.toFixed(2));
    const compatibility = match.component_scores?.mood_compatibility 
      ? getScoreColor(match.component_scores.mood_compatibility)(match.component_scores.mood_compatibility.toFixed(2))
      : chalk.gray('N/A');
    const sentiment = match.component_scores?.sentiment_compatibility
      ? getScoreColor(match.component_scores.sentiment_compatibility)(match.component_scores.sentiment_compatibility.toFixed(2))
      : chalk.gray('N/A');
    
    // Check for veto
    const vetoStatus = match.veto_applied 
      ? chalk.red(`✓ ${match.veto_reason || ''}`)
      : chalk.green('✗');
    
    detailTableData.push([
      title,
      artist,
      mood,
      score,
      compatibility,
      sentiment,
      vetoStatus
    ]);
  });
  
  // Display the detailed table
  console.log(table(detailTableData, tableConfig));

  console.log(chalk.green.bold('\n✨ Enhanced matching algorithm completed successfully!'));
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
  let index = 0;
  let filePath = '';
  do {
    filePath = join(evalDir, `results_${commitHash}_${index}.json`);
    index++;
  } while (existsSync(filePath));

  // Prepare results object
  const resultObj = {
    commit_hash: commitHash,
    timestamp: new Date().toISOString(),
    playlist: {
      id: playlist.id || 'unknown',
      name: playlist.name || 'unknown',
      dominant_mood: playlist.emotional?.dominant_mood?.mood || 'unknown'
    },
    matches: matches.map(match => ({
      track: {
        title: match.track_info.title,
        artist: match.track_info.artist
      },
      final_score: match.similarity,
      component_scores: match.component_scores,
      veto_applied: match.veto_applied || false,
      veto_reason: match.veto_reason || null
    }))
  };

  // Write to file
  writeFileSync(filePath, JSON.stringify(resultObj, null, 2));
  
  console.log(chalk.green(`\n💾 Algorithm evaluation results saved to ${chalk.cyan(filePath)}`));
  console.log(chalk.cyan('Use the compare-results tool to compare with previous results:'));
  console.log(chalk.yellow(`bun commands/compare-results.ts`));
}

main();