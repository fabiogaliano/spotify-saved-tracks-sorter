import { Playlist, PlaylistWithTracks, TrackWithAddedAt } from '~/lib/models/Playlist';
import { PlaylistUIFormat, PlaylistTrackUI } from './components/playlist-viewer/types';

export const getColorForPlaylist = (playlistId: string): string => {
  const colors = ['blue', 'green', 'purple', 'pink', 'yellow'];
  // ensures the same playlist always gets the same color
  const charSum = playlistId.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return colors[charSum % colors.length];
};

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;

  const months = Math.floor(diffDays / 30);
  if (months < 12) return `${months} months ago`;

  const years = Math.floor(months / 12);
  return `${years} year${years !== 1 ? 's' : ''} ago`;
};

export const mapPlaylistToUIFormat = (playlist: Playlist | PlaylistWithTracks): PlaylistUIFormat => {
  return {
    id: playlist.id.toString(),
    name: playlist.name,
    songCount: playlist.track_count,
    imageColor: getColorForPlaylist(playlist.id.toString()),
    description: playlist.description || 'No description',
    aiEnabled: playlist.is_flagged || false,
    tracksSyncStatus: playlist.tracks_sync_status
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
