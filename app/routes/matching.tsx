import { Link, useLoaderData } from '@remix-run/react'
import { useState } from 'react'
import type { LoaderFunctionArgs } from '@remix-run/node'
import { json } from '@remix-run/node'
import { getSupabase } from '~/core/db/db'
import { playlistRepository } from '~/core/repositories/PlaylistRepository'
import { trackRepository } from '~/core/repositories/TrackRepository'
import { trackAnalysisRepository } from '~/core/repositories/TrackAnalysisRepository'
import type { MatchResult, Playlist as MatchingPlaylist, Song } from '~/core/domain/Matching'
import { matchSongsToPlaylist } from '../../matching-algorithm/matching-algorithm'

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const userId = 1 // Replace with actual user ID from session

    // Get playlists with analyses
    const { data: playlistsWithAnalysis, error: playlistError } = await getSupabase()
      .from('playlist_analyses')
      .select('id, playlist_id, analysis')
      .eq('user_id', userId)

    if (playlistError) {
      console.error('Error fetching playlist analyses:', playlistError)
      return json({ playlists: [], tracks: [] })
    }

    console.log('Playlists with analysis:', playlistsWithAnalysis?.length || 0)

    let playlists = []
    if (playlistsWithAnalysis && playlistsWithAnalysis.length > 0) {
      const playlistIds = playlistsWithAnalysis.map(pa => pa.playlist_id) || []

      const { data: fetchedPlaylists, error: fetchPlaylistsError } = await getSupabase()
        .from('playlists')
        .select('*')
        .in('id', playlistIds)

      if (fetchPlaylistsError) {
        console.error('Error fetching playlists:', fetchPlaylistsError)
      } else {
        // Combine playlists with their analyses
        playlists = (fetchedPlaylists || []).map(playlist => {
          const analysisRecord = playlistsWithAnalysis.find(pa => pa.playlist_id === playlist.id)
          return {
            ...playlist,
            analysis: analysisRecord?.analysis || null
          }
        })
      }
    }

    // Get tracks with analyses
    const analyses = await trackAnalysisRepository.getAllAnalyses()

    // Get all tracks
    const tracks = await trackRepository.getAllTracks()

    // Combine tracks with their analyses
    const tracksWithAnalyses = tracks.map(track => {
      const analysis = analyses.find(a => a.track_id === track.id)
      return {
        ...track,
        analysis: analysis?.analysis || null
      }
    }).filter(track => track.analysis !== null)

    return json({
      playlists,
      tracks: tracksWithAnalyses
    })
  } catch (error) {
    console.error('Error in loader:', error)
    return json({
      playlists: [],
      tracks: []
    })
  }
}

export default function Matching() {
  const { playlists, tracks } = useLoaderData<typeof loader>()
  const [matchingPlaylists, setMatchingPlaylists] = useState<Record<string | number, boolean>>({})
  const [errors, setErrors] = useState<Record<string | number, string>>({})
  const [matchResults, setMatchResults] = useState<Record<string | number, MatchResult[]>>({})

  const startMatching = async (playlist: any) => {
    try {
      setMatchingPlaylists(prev => ({ ...prev, [playlist.id]: true }));
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[playlist.id];
        return newErrors;
      });

      // Convert playlist to the format expected by the matching algorithm
      const matchingPlaylist: MatchingPlaylist = {
        id: playlist.id.toString(),
        name: playlist.name,
        description: playlist.description,
        spotify_playlist_id: playlist.spotify_playlist_id,
        ...playlist.analysis
      };

      // Convert tracks to the format expected by the matching algorithm
      const matchingSongs: Song[] = tracks.map(track => ({
        track: {
          id: track.id.toString(),
          title: track.name,
          artist: track.artist,
          spotify_track_id: track.spotify_track_id,
          album: track.album || ''
        },
        analysis: track.analysis
      }));

      // Use the real matching algorithm
      try {
        const matches = await matchSongsToPlaylist(matchingPlaylist, matchingSongs);

        // Set results and clear matching state
        setMatchResults(prev => ({
          ...prev,
          [playlist.id]: matches
        }));

        setMatchingPlaylists(prev => {
          const newState = { ...prev };
          delete newState[playlist.id];
          return newState;
        });
      } catch (matchError) {
        console.error('Error in matching algorithm:', matchError);
        setErrors(prev => ({
          ...prev,
          [playlist.id]: `Error in matching algorithm: ${matchError instanceof Error ? matchError.message : String(matchError)}`
        }));

        setMatchingPlaylists(prev => {
          const newState = { ...prev };
          delete newState[playlist.id];
          return newState;
        });
      }
    } catch (err) {
      console.error(`Error matching playlist ${playlist.id}:`, err);
      setErrors(prev => ({
        ...prev,
        [playlist.id]: `Error: ${err instanceof Error ? err.message : String(err)}`
      }));

      // Mark playlist as no longer matching
      setMatchingPlaylists(prev => {
        const newState = { ...prev };
        delete newState[playlist.id];
        return newState;
      });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Playlist Matching</h1>

      <div className="mb-6">
        <p className="mb-4">
          This page shows your analyzed playlists. Click "Start Matching" on any playlist
          to find the best matches between your analyzed songs and that playlist.
          The matches are based on AI analysis of both your songs and playlists.
        </p>

        <div className="flex space-x-4 mb-6">
          <Link
            to="/analysis/playlist"
            className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-3 rounded-full"
            aria-label="Back to Playlist Analysis"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
          </Link>
        </div>
      </div>

      {playlists.length === 0 || tracks.length === 0 ? (
        <div className="bg-white shadow-md rounded-lg p-6 text-center">
          <p className="text-gray-500">
            Please ensure you have analyzed both playlists and songs before matching.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {playlists.map(playlist => {
            const isMatching = matchingPlaylists[playlist.id] || false;
            const error = errors[playlist.id];
            const playlistMatches = (matchResults[playlist.id] || []).slice(0, 10); // Top 10 matches
            const hasMatches = playlistMatches.length > 0;

            return (
              <div key={playlist.id} className="bg-white shadow-md rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-semibold mb-1">{playlist.name}</h2>
                    <p className="text-gray-600 text-sm">{playlist.description || 'No description'}</p>
                  </div>

                  {!hasMatches && (
                    <button
                      onClick={() => startMatching(playlist)}
                      disabled={isMatching}
                      className={`px-4 py-2 rounded ${isMatching
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                    >
                      {isMatching ? 'Matching...' : 'Start Matching'}
                    </button>
                  )}
                </div>

                {error && (
                  <div className="px-6 py-2 bg-red-100 border-b border-red-400 text-red-700">
                    {error}
                  </div>
                )}

                {hasMatches ? (
                  <div>
                    <div className="flex justify-between items-center px-6 py-2 bg-gray-50 border-b border-gray-200">
                      <h3 className="font-medium">Top Matching Songs</h3>
                      <button
                        onClick={() => {
                          // Remove the matches for this playlist
                          setMatchResults(prev => {
                            const newResults = { ...prev };
                            delete newResults[playlist.id];
                            return newResults;
                          });
                        }}
                        className="text-sm text-red-600 hover:text-red-800"
                      >
                        Clear Results
                      </button>
                    </div>
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Track</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Artist</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Match Score</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {playlistMatches.map(match => (
                          <tr key={match.track_info.id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{match.track_info.title}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-500">{match.track_info.artist}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                <div className="relative pt-1">
                                  <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200">
                                    <div
                                      style={{ width: `${Math.min(match.similarity * 100, 100)}%` }}
                                      className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${match.similarity > 0.8 ? 'bg-green-500' :
                                        match.similarity > 0.6 ? 'bg-green-600' :
                                          match.similarity > 0.4 ? 'bg-yellow-500' : 'bg-red-500'
                                        }`}
                                    ></div>
                                  </div>
                                  <div className="text-xs mt-1 text-right">
                                    {Math.round(match.similarity * 100)}%
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <button
                                onClick={() => alert(JSON.stringify(match.component_scores, null, 2))}
                                className="text-xs text-blue-600 hover:underline"
                              >
                                View Details
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : isMatching ? (
                  <div className="px-6 py-12 text-center">
                    <svg className="animate-spin h-8 w-8 text-blue-500 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="text-gray-500">Matching songs to this playlist...</p>
                  </div>
                ) : (
                  <div className="px-6 py-12 text-center">
                    <p className="text-gray-500">Click the "Start Matching" button to find the best matches for this playlist.</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  )
}
