import { useCallback } from 'react';
import { formatDate, mapTrackToUIFormat } from '../utils';
import { PlaylistTrackUI } from '../types';
import { TrackWithAddedAt } from '~/lib/models/Playlist';
import { usePlaylistTracks as usePlaylistTracksQuery } from '../queries/playlist-queries';

export function usePlaylistTracks(playlistId?: string | null) {
  const query = usePlaylistTracksQuery(playlistId || null);

  const formatTrackData = useCallback((track: any): PlaylistTrackUI => {
    // handle different track data formats (API vs UI)
    // if the track already has the right format properties, just ensure date formatting
    if (track.title) {
      return {
        ...track,
        dateAdded: track.dateAdded || 'Unknown',
        rawAddedAt: track.rawAddedAt || ''
      };
    }
    // if the track has API format properties, use mapTrackToUIFormat
    else if (track.name || track.spotify_track_id) {
      const mappedTrack = mapTrackToUIFormat(track as TrackWithAddedAt);
      return {
        ...mappedTrack,
        rawAddedAt: track.added_at || ''
      };
    }

    return {
      id: track.id || track.spotify_track_id || 'unknown',
      title: track.title || track.name || 'Unknown Title',
      artist: track.artist || 'Unknown Artist',
      album: track.album || 'Unknown Album',
      dateAdded: track.dateAdded || formatDate(track.added_at || ''),
      rawAddedAt: track.rawAddedAt || track.added_at || ''
    };
  }, []);

  return {
    tracks: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    formatTrackData
  };
}