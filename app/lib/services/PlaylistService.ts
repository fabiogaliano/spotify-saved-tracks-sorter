import { playlistRepository } from '~/lib/repositories/PlaylistRepository'
import { Playlist } from '~/lib/models/Playlist'
import { SavedTrackRow } from '~/lib/models/Track';
import type { PlaylistWithTracks } from '~/lib/models/Playlist';

export class PlaylistService {
  async getPlaylists(userId: number): Promise<Playlist[]> {
    return playlistRepository.getPlaylists(userId)
  }

  async getUserPlaylistsWithTracks(userId: number, allTracks: SavedTrackRow[]): Promise<PlaylistWithTracks[]> {
    const userPlaylistTracks = await playlistRepository.getPlaylistTracksByUserId(userId);

    const playlistIds = [...new Set(userPlaylistTracks.map(pt => pt.playlist_id))];
    const playlists = await playlistRepository.getPlaylistsByIds(playlistIds);

    return playlists.map(playlist => {
      const trackIdsForPlaylist = userPlaylistTracks
        .filter(pt => pt.playlist_id === playlist.id)
        .map(pt => pt.track_id);

      const tracksInPlaylist = allTracks
        .filter(savedTrack => trackIdsForPlaylist.includes(savedTrack.track.id));

      return {
        ...playlist,
        tracks: tracksInPlaylist
      };
    });
  }

}


export const playlistService = new PlaylistService()
