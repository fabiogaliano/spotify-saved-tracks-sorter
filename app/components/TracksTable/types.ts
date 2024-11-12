import { Database } from '~/types/database.types'

export type Track = {
  id: string
  name: string
  artist: string
  album: string | null
  likedAt: string
  sortingStatus: "unsorted" | "sorted" | "ignored" | null
  userId?: number
}

export type TracksTableProps = {
  tracks: Track[]
  showStatus: 'all' | 'unsorted' | 'sorted' | 'ignored'
} 