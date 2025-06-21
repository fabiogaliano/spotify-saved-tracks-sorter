import { Playlist, PlaylistWithTracks, TrackWithAddedAt } from '~/lib/models/Playlist';
import { PlaylistUIFormat, PlaylistTrackUI } from '../types';
import { getColorForPlaylist } from './colors';
import { formatDate } from './formatters';

export const mapPlaylistToUIFormat = (playlist: Playlist | PlaylistWithTracks): PlaylistUIFormat => {
  return {
    id: playlist.id.toString(),
    name: playlist.name,
    songCount: playlist.track_count,
    imageColor: getColorForPlaylist(playlist.id.toString()),
    description: playlist.description || null,
    smartSortingEnabled: playlist.is_flagged || false,
    tracksSyncStatus: playlist.tracks_sync_status,
    spotifyId: playlist.spotify_playlist_id
  };
};

export const mapTrackToUIFormat = (track: TrackWithAddedAt): PlaylistTrackUI => ({
  id: track.spotify_track_id,
  title: track.name,
  artist: track.artist,
  album: track.album || 'Unknown Album',
  dateAdded: formatDate(track.added_at || ''),
  rawAddedAt: track.added_at
});