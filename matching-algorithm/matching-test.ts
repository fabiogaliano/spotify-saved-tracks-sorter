import { readFileSync } from 'fs';
import { join } from 'path';
import { fetch } from 'undici'; // Bun includes fetch natively

// API configuration
const API_URL = 'http://localhost:8000';

async function main() {
  try {
    console.log('🎵 Music-Playlist Matcher Test 🎵');

    // Load song files (assuming they are in the same directory as this script)
    const song1 = JSON.parse(readFileSync('./llm-output_lyrics-analysis/Kendrick-Lamar_Money-Trees_analysis.json', 'utf-8'));
    const song2 = JSON.parse(readFileSync('./llm-output_lyrics-analysis/Lana-Del-Rey_California_analysis.json', 'utf-8'));
    const song3 = JSON.parse(readFileSync('./llm-output_lyrics-analysis/Taylor-Swift_closure_analysis.json', 'utf-8'));
    const song4 = JSON.parse(readFileSync('./llm-output_lyrics-analysis/Wallows_Are-You-Bored-Yet_analysis.json', 'utf-8'));
    const song5 = JSON.parse(readFileSync('./llm-output_lyrics-analysis/Corinne-Bailey_Put-Your-Records-On_analysis.json', 'utf-8'));
    const playlist = JSON.parse(readFileSync('./llm-output_playlist-analysis/playlist_0df21fc1_1740096420736.json', 'utf-8'));

    console.log('✅ Loaded 5 songs and 1 playlist successfully');
    console.log(`Song 1: ${song1.track?.title || 'Unknown'} by ${song1.track?.artist || 'Unknown'}`);
    console.log(`Song 2: ${song2.track?.title || 'Unknown'} by ${song2.track?.artist || 'Unknown'}`);
    console.log(`Song 3: ${song3.track?.title || 'Unknown'} by ${song3.track?.artist || 'Unknown'}`);
    console.log(`Song 4: ${song4.track?.title || 'Unknown'} by ${song4.track?.artist || 'Unknown'}`);
    console.log(`Song 5: ${song5.track?.title || 'Unknown'} by ${song5.track?.artist || 'Unknown'}`);
    console.log(`Playlist: ${playlist.playlist.id || 'Unknown'}`);

    // Step 1: Vectorize songs
    console.log('\n📊 Step 1: Vectorizing songs...');
    const songVectorResponse = await fetch(`${API_URL}/vectorize/song`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        analyses: [song1, song2, song3, song4, song5]
      }),
    });

    if (!songVectorResponse.ok) {
      throw new Error(`Song vectorization failed: ${songVectorResponse.statusText}`);
    }

    const songVectors = await songVectorResponse.json();
    console.log(`✅ Successfully vectorized ${songVectors.results.length} songs`);

    // Check if we have aspect embeddings (new feature)
    const hasAspectEmbeddings = songVectors.results[0]?.aspect_embeddings !== undefined;
    console.log(`✨ Song vectors data available in memory (${hasAspectEmbeddings ? 'includes aspect embeddings' : 'original format'})`);

    // Step 2: Vectorize playlist
    console.log('\n📊 Step 2: Vectorizing playlist...');
    const playlistVectorResponse = await fetch(`${API_URL}/vectorize/playlist`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ playlist }),
    });

    if (!playlistVectorResponse.ok) {
      throw new Error(`Playlist vectorization failed: ${playlistVectorResponse.statusText}`);
    }

    const playlistVector = await playlistVectorResponse.json();

    // Check if we have aspect embeddings (new feature)
    const hasPlaylistAspectEmbeddings = playlistVector?.aspect_embeddings !== undefined;
    console.log(`✅ Successfully vectorized playlist (${hasPlaylistAspectEmbeddings ? 'includes aspect embeddings' : 'original format'})`);

    // Step 3: Match songs to playlist
    console.log('\n🔍 Step 3: Matching songs to playlist...');
    const matchResponse = await fetch(`${API_URL}/match/songs-to-playlist`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        playlist,
        songs: [song1, song2, song3, song4, song5]
      }),
    });

    if (!matchResponse.ok) {
      throw new Error(`Song matching failed: ${matchResponse.statusText}`);
    }

    const matches = await matchResponse.json();

    // Check if we have component scores (new feature)
    const hasComponentScores = matches.matches[0]?.component_scores !== undefined;

    // Display results in a table format
    console.log('\n📋 Match Results:');

    if (!hasComponentScores) {
      // Original format display
      console.log('--------------------------------------------------');
      console.log('| Song                      | Artist             | Similarity |');
      console.log('--------------------------------------------------');

      matches.matches.forEach((match) => {
        const title = match.track_info?.title || 'Unknown';
        const artist = match.track_info?.artist || 'Unknown';
        const similarity = match.similarity.toFixed(4);

        // Format to fixed width for table appearance
        const titlePadded = title.padEnd(25).substring(0, 25);
        const artistPadded = artist.padEnd(18).substring(0, 18);

        console.log(`| ${titlePadded} | ${artistPadded} | ${similarity}  |`);
      });

      console.log('--------------------------------------------------');
    } else {
      // Enhanced format display with component scores
      console.log('------------------------------------------------------------------------------------------');
      console.log('| Song                 | Artist          | Overall | Theme | Mood  | M.Comp | Context | Intensity |');
      console.log('------------------------------------------------------------------------------------------');

      matches.matches.forEach((match) => {
        const title = match.track_info?.title || 'Unknown';
        const artist = match.track_info?.artist || 'Unknown';
        const overall = match.similarity.toFixed(2);

        // Component scores (if available)
        const theme = match.component_scores?.theme_similarity?.toFixed(2) || 'N/A';
        const mood = match.component_scores?.mood_similarity?.toFixed(2) || 'N/A';
        const moodComp = match.component_scores?.mood_compatibility?.toFixed(2) || 'N/A';
        const context = match.component_scores?.context_similarity?.toFixed(2) || 'N/A';
        const intensity = match.component_scores?.intensity_match?.toFixed(2) || 'N/A';

        // Format to fixed width for table appearance
        const titlePadded = title.padEnd(20).substring(0, 20);
        const artistPadded = artist.padEnd(15).substring(0, 15);

        console.log(`| ${titlePadded} | ${artistPadded} | ${overall} | ${theme} | ${mood} | ${moodComp} | ${context} | ${intensity} |`);
      });

      console.log('------------------------------------------------------------------------------------------');
      console.log('Legend:');
      console.log('- Overall: Final weighted similarity score');
      console.log('- Theme: Theme content similarity');
      console.log('- Mood: Mood description similarity');
      console.log('- M.Comp: Mood compatibility (higher = more compatible)');
      console.log('- Context: Context/situation similarity');
      console.log('- Intensity: Emotional intensity match');
    }

    // Display playlist information for comparison
    console.log('\n📌 Playlist Information:');
    console.log(`Themes: ${playlist.meaning?.themes.map(t => t.name).join(', ') || 'Unknown'}`);
    console.log(`Mood: ${playlist.emotional?.dominantMood?.mood || 'Unknown'}`);
    console.log(`Intensity: ${playlist.emotional?.intensity_score || 'Unknown'}`);
    console.log(`Primary Setting: ${playlist.context?.primary_setting || 'Unknown'}`);
    console.log(`Perfect For: ${playlist.context?.situations?.perfect_for?.join(', ') || 'Unknown'}`);

    // Display song moods for comparison
    console.log('\n📌 Song Moods:');
    [song1, song2, song3, song4, song5].forEach((song, index) => {
      const title = song.track?.title || `Song ${index + 1}`;
      const mood = song.analysis?.emotional?.dominantMood?.mood || 'Unknown';
      console.log(`- ${title}: ${mood}`);
    });

    console.log('\n✨ All operations completed successfully!');

  } catch (error) {
    console.error('❌ Error:', error);
    if (error instanceof Error && error.message.includes('ECONNREFUSED')) {
      console.error('Make sure the Python FastAPI server is running on http://localhost:8000');
    }
  }
}

main();