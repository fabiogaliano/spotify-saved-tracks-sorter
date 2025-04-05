import { Playlist, PlaylistWithTracks } from '~/lib/models/Playlist';
import { PlaylistUIFormat } from './components/PlaylistDetailView';

/**
 * Assigns a deterministic color to a playlist based on its ID
 */
export const getColorForPlaylist = (playlistId: string): string => {
  const colors = ['blue', 'green', 'purple', 'pink', 'yellow'];
  // Use the sum of character codes in the ID to determine the color
  // This ensures the same playlist always gets the same color
  const charSum = playlistId.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return colors[charSum % colors.length];
};

/**
 * Formats a date string into a relative time (Today, Yesterday, X days ago, etc.)
 */
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return `${Math.floor(diffDays / 30)} months ago`;
};

/**
 * Maps a playlist to the UI format
 */
export const mapPlaylistToUIFormat = (playlist: Playlist | PlaylistWithTracks, isAIPlaylist: boolean = false): PlaylistUIFormat => {
  return {
    id: playlist.id.toString(),
    name: playlist.name,
    songCount: playlist.track_count,
    imageColor: getColorForPlaylist(playlist.id.toString()),
    description: playlist.description || 'No description',
    aiEnabled: isAIPlaylist ? (playlist.is_flagged || false) : false,
  };
};

/**
 * Maps a track to the UI format
 */
export const mapTrackToUIFormat = (track: any) => ({
  id: track.spotify_track_id,
  title: track.name,
  artist: track.artist,
  album: track.album || 'Unknown Album',
  dateAdded: formatDate(track.added_at || '')
});
