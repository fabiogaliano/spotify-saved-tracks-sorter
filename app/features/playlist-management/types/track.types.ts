export interface PlaylistTrackUI {
  id: string;
  title: string;
  artist: string;
  album: string;
  dateAdded: string; // Formatted as relative time
  rawAddedAt?: string; // The raw date string for tooltip
}