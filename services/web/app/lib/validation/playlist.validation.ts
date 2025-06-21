import * as v from 'valibot'
import { PLAYLIST_AI_PREFIX, PLAYLIST_MAX_DESCRIPTION_LENGTH, PLAYLIST_MAX_NAME_LENGTH } from '../constants/playlist.constants'

export const CreateAIPlaylistSchema = v.object({
  name: v.pipe(
    v.string('Playlist name is required'),
    v.trim(),
    v.nonEmpty('Playlist name cannot be empty'),
    v.maxLength(PLAYLIST_MAX_NAME_LENGTH, `Playlist name cannot exceed ${PLAYLIST_MAX_NAME_LENGTH} characters`)
  ),
  description: v.pipe(
    v.string('Description is required'),
    v.trim(),
    v.nonEmpty('Description cannot be empty'),
    v.maxLength(PLAYLIST_MAX_DESCRIPTION_LENGTH, `Playlist description cannot exceed ${PLAYLIST_MAX_DESCRIPTION_LENGTH} characters`),
    v.startsWith(`${PLAYLIST_AI_PREFIX}`, `Description must start with "${PLAYLIST_AI_PREFIX}"`)
  )
})

export const CreateAIPlaylistInputSchema = v.object({
  name: v.pipe(
    v.string('Playlist name is required'),
    v.trim(),
    v.nonEmpty('Playlist name cannot be empty'),
    v.maxLength(100, 'Playlist name cannot exceed 100 characters')
  ),
  description: v.pipe(
    v.string('Description is required'),
    v.trim(),
    v.nonEmpty('Description cannot be empty'),
    v.maxLength(PLAYLIST_MAX_DESCRIPTION_LENGTH - PLAYLIST_AI_PREFIX.length, `Description cannot exceed ${PLAYLIST_MAX_DESCRIPTION_LENGTH - PLAYLIST_AI_PREFIX.length} characters`),
    v.startsWith(`${PLAYLIST_AI_PREFIX}`, `Description must start with "${PLAYLIST_AI_PREFIX}"`)
  )
})

export type CreateAIPlaylistInput = v.InferInput<typeof CreateAIPlaylistSchema>
export type CreateAIPlaylistOutput = v.InferOutput<typeof CreateAIPlaylistSchema>