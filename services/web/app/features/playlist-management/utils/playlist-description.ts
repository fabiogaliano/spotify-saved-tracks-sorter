import { PLAYLIST_AI_PREFIX, PLAYLIST_MAX_DESCRIPTION_LENGTH } from '~/lib/constants/playlist.constants';

export function extractUserDescription(description: string | null | undefined): string {
  if (!description) return '';
  return description.replace(PLAYLIST_AI_PREFIX, '');
}

export function getMaxCharacterLimit(smartSortingEnabled: boolean): number {
  return smartSortingEnabled
    ? PLAYLIST_MAX_DESCRIPTION_LENGTH - PLAYLIST_AI_PREFIX.length
    : PLAYLIST_MAX_DESCRIPTION_LENGTH;
}

export function getCurrentCharacterCount(
  description: string | null | undefined,
  editMode: boolean,
  editValue: string
): number {
  const text = editMode ? editValue : extractUserDescription(description);
  return text.length;
}

type Playlist = {
  description: string | null | undefined;
  smartSortingEnabled: boolean;
}

export function isCharacterLimitExceeded(
  playlist: Playlist,
  editMode: boolean,
  editValue: string,
): boolean {
  return getCurrentCharacterCount(playlist.description, editMode, editValue) > getMaxCharacterLimit(playlist.smartSortingEnabled);
}