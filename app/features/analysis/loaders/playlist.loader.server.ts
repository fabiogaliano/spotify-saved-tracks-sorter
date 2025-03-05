import { LoaderFunctionArgs, json } from '@remix-run/node'
import { getSupabase } from '~/lib/db/db'
import path from 'path'
import fs from 'fs'
import type { AnalysisStatus } from '~/types/analysis'

interface PlaylistAnalysis {
  playlist_id: number;
  id: number;
  created_at: string | null;
}

interface Playlist {
  id: number;
  name: string;
  description?: string;
  spotify_playlist_id: string;
  user_id: number;
  is_flagged: boolean;
  [key: string]: any; // For any additional properties
}

// Read the playlist analysis prompt - this is executed only on the server
let PLAYLIST_ANALYSIS_PROMPT = '';
try {
  // Only read the file on the server
  if (typeof process !== 'undefined' && process.env.NODE_ENV) {
    const promptPath = path.join(
      process.cwd(),
      'matching-algorithm',
      'prompts',
      'playlist-analysis_prompt.txt'
    );
    PLAYLIST_ANALYSIS_PROMPT = fs.readFileSync(promptPath, 'utf-8');
  }
} catch (error) {
  console.error('Error reading playlist analysis prompt:', error);
  PLAYLIST_ANALYSIS_PROMPT = 'Default prompt: Analyze this playlist and describe its mood, themes, and musical characteristics.';
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    // Get flagged playlists from the database
    // Using a default user ID of 1 for now - this should be replaced with the actual user ID from the session
    const userId = 1; // Replace with actual user ID from session

    // Add a method to get flagged playlists
    const { data: flaggedPlaylists, error: playlistsError } = await getSupabase()
      .from('playlists')
      .select('*')
      .eq('user_id', userId)
      .eq('is_flagged', true)
      .order('name');

    if (playlistsError) {
      console.error('Error fetching flagged playlists:', playlistsError);
    }

    // Get playlist analysis status
    const { data: playlistAnalyses, error } = await getSupabase()
      .from('playlist_analyses')
      .select('playlist_id, id, created_at')

    if (error) {
      console.error('Error fetching playlist analyses:', error)
    }

    // Create a map of playlist_id to analysis status
    const analysisStatusMap: Record<number, AnalysisStatus> = (playlistAnalyses || []).reduce((acc, analysis: PlaylistAnalysis) => {
      acc[analysis.playlist_id] = {
        analyzed: true,
        analysisId: analysis.id
      }
      return acc
    }, {} as Record<number, AnalysisStatus>)

    return json({
      playlists: flaggedPlaylists as Playlist[] || [],
      analysisStatusMap,
      prompt: PLAYLIST_ANALYSIS_PROMPT
    })
  } catch (error) {
    console.error('Error loading playlists:', error)
    return json({
      playlists: [] as Playlist[],
      analysisStatusMap: {} as Record<number, AnalysisStatus>,
      prompt: PLAYLIST_ANALYSIS_PROMPT
    })
  }
} 