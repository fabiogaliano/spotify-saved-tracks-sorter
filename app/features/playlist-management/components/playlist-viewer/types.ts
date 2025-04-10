import { Enums } from '~/types/database.types';

export interface PlaylistTrackUI {
  id: string;
  title: string;
  artist: string;
  album: string;
  dateAdded: string; // Formatted as relative time
  rawAddedAt?: string; // The raw date string for tooltip
}

export interface PlaylistUIFormat {
  id: string;
  name: string;
  description: string;
  imageColor: string;
  songCount: number;
  aiEnabled: boolean;
  tracksSyncStatus: Enums<'playlist_tracks_sync_status_enum'> | null;
}
