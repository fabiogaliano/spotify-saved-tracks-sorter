import * as v from 'valibot'

export const CreateAIPlaylistSchema = v.object({
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
    v.maxLength(300, 'Playlist description cannot exceed 300 characters'),
    v.startsWith('AI:', 'Description must start with "AI:"')
  )
})

// Schema for user input (before we add "AI:" prefix)
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
    v.maxLength(296, 'Description cannot exceed 296 characters') // 296 + 4 ("AI: ") = 300
  )
})

export type CreateAIPlaylistInput = v.InferInput<typeof CreateAIPlaylistSchema>
export type CreateAIPlaylistOutput = v.InferOutput<typeof CreateAIPlaylistSchema>