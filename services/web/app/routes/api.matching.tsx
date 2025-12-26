import { ActionFunctionArgs } from 'react-router'
import { requireUserSession } from '~/features/auth/auth.utils'
import { matchingService } from '~/lib/services'
import { playlistAnalysisRepository } from '~/lib/repositories/PlaylistAnalysisRepository'
import { trackAnalysisRepository } from '~/lib/repositories/TrackAnalysisRepository'
import { trackRepository } from '~/lib/repositories/TrackRepository'
import { playlistRepository } from '~/lib/repositories/PlaylistRepository'
import { logger } from '~/lib/logging/Logger'
import type { Playlist, Song } from '~/lib/models/Matching'
import type { SongAnalysis } from '~/lib/services/analysis/analysis-schemas'

export async function action({ request }: ActionFunctionArgs) {
  const user = await requireUserSession(request)
  const formData = await request.formData()
  
  const playlistId = parseInt(formData.get('playlistId') as string, 10)
  const trackIdsJson = formData.get('trackIds') as string

  if (Number.isNaN(playlistId) || !trackIdsJson) {
    return Response.json(
      { error: 'Missing playlistId or trackIds' },
      { status: 400 }
    )
  }

  try {
    const trackIds = JSON.parse(trackIdsJson) as number[]
    logger.info('Starting matching', { playlistId, trackCount: trackIds.length })

    // Get playlist data with analysis
    const playlist = await playlistRepository.getPlaylistById(playlistId)
    if (!playlist || playlist.user_id !== user.userId) {
      return Response.json(
        { error: 'Playlist not found or unauthorized' },
        { status: 404 }
      )
    }

    // Get playlist analysis
    const playlistAnalysis = await playlistAnalysisRepository.getAnalysisByPlaylistId(playlistId)
    if (!playlistAnalysis) {
      return Response.json(
        { error: 'Playlist analysis not found. Please analyze the playlist first.' },
        { status: 400 }
      )
    }

    // Transform playlist to matching format
    const matchingPlaylist: Playlist = {
      id: playlist.id.toString(),
      title: playlist.name,
      description: playlist.description || '',
      ...playlistAnalysis.analysis // Spread the analysis data
    }

    // Get tracks with analyses (parallel fetching)
    const trackResults = await Promise.all(
      trackIds.map(async (trackId) => {
        const [track, trackAnalysis] = await Promise.all([
          trackRepository.getTrackById(trackId),
          trackAnalysisRepository.getByTrackId(trackId)
        ])
        return { track, trackAnalysis }
      })
    )

    const songs: Song[] = trackResults
      .filter(({ track, trackAnalysis }) => track && trackAnalysis)
      .map(({ track, trackAnalysis }) => ({
        id: track!.id,
        spotifyTrackId: track!.spotify_track_id,
        track: {
          id: track!.id.toString(),
          title: track!.name,
          artist: track!.artist,
          album: track!.album || '',
          spotify_id: track!.spotify_track_id
        },
        analysis: trackAnalysis!.analysis as SongAnalysis
      }))

    // Get existing tracks in the playlist for profiling (parallel fetching)
    const existingTracks = await playlistRepository.getPlaylistTracks(playlistId)
    const existingTrackResults = await Promise.all(
      existingTracks.slice(0, 20).map(async (pt) => {
        const [track, trackAnalysis] = await Promise.all([
          trackRepository.getTrackById(pt.track_id),
          trackAnalysisRepository.getByTrackId(pt.track_id)
        ])
        return { track, trackAnalysis }
      })
    )

    const existingPlaylistSongs: Song[] = existingTrackResults
      .filter(({ track, trackAnalysis }) => track && trackAnalysis)
      .map(({ track, trackAnalysis }) => ({
        id: track!.id,
        spotifyTrackId: track!.spotify_track_id,
        track: {
          id: track!.id.toString(),
          title: track!.name,
          artist: track!.artist,
          album: track!.album || '',
          spotify_id: track!.spotify_track_id
        },
        analysis: trackAnalysis!.analysis as SongAnalysis
      }))

    logger.info('Fetched tracks for matching', {
      existingTracks: existingPlaylistSongs.length,
      candidateTracks: songs.length
    })

    if (songs.length === 0) {
      return Response.json(
        { error: 'No tracks with analysis found' },
        { status: 400 }
      )
    }

    // Perform matching
    const startTime = Date.now()
    const results = await matchingService.matchSongsToPlaylist(matchingPlaylist, songs, existingPlaylistSongs)
    const processingTime = Date.now() - startTime

    logger.info('Matching completed', {
      playlistId,
      resultCount: results.length,
      processingTime
    })

    return Response.json({
      playlistId: playlistId.toString(),
      results,
      processingTime
    })

  } catch (error) {
    logger.error('Error performing matching', error as Error)
    return Response.json(
      { error: 'Failed to perform matching' },
      { status: 500 }
    )
  }
}