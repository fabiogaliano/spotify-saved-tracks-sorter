import { Enums } from '~/types/database.types'

export interface PlaylistUIFormat {
	id: string
	name: string
	description: string | null
	imageColor: string
	songCount: number
	smartSortingEnabled: boolean
	tracksSyncStatus: Enums<'playlist_tracks_sync_status_enum'> | null
	spotifyId: string
}

export type PlaylistDetailViewTabs = 'is_flagged' | 'others'
