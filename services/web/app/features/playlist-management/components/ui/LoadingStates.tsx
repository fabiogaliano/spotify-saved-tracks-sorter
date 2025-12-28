import React from 'react'

import { AlertTriangle, RefreshCcw } from 'lucide-react'

import { Button } from '~/shared/components/ui/button'
import { ScrollArea } from '~/shared/components/ui/scroll-area'

import { PlaylistTrackUI, PlaylistUIFormat } from '../../types'
import { TableElements } from './TableElements'

export const LoadingTracksState: React.FC<{ currentPlaylist: PlaylistUIFormat }> = ({
	currentPlaylist,
}) => (
	<div className="flex h-[calc(100vh-500px)] flex-col items-center justify-center p-12">
		<div className="bg-card mb-4 rounded-full p-5">
			<RefreshCcw className="text-muted-foreground/60 h-10 w-10 animate-spin" />
		</div>
		<h3 className="text-foreground mb-2 text-xl font-medium">Loading Tracks</h3>
		<p className="text-muted-foreground mb-6 max-w-md text-center">
			Fetching tracks for this playlist...
		</p>
		{currentPlaylist?.songCount === 0 && (
			<p className="text-sm text-yellow-500">This playlist appears to be empty.</p>
		)}
	</div>
)

export const NotStartedSyncState: React.FC<{
	syncPlaylistTracks: (playlistId: string) => void
	currentPlaylistId: string
	isSyncing: boolean
	playlistIsEmpty?: boolean
}> = ({ syncPlaylistTracks, currentPlaylistId, isSyncing, playlistIsEmpty = false }) => (
	<div className="flex h-[calc(100vh-500px)] flex-col items-center justify-center p-12">
		<div className="bg-card mb-4 rounded-full p-5">
			<RefreshCcw className="text-muted-foreground/60 h-10 w-10" />
		</div>
		<h3 className="text-foreground mb-2 text-xl font-medium">Tracks Not Synced</h3>
		<p className="text-muted-foreground mb-6 max-w-md text-center">
			{playlistIsEmpty ?
				'This playlist appears to be empty. No tracks to sync.'
			:	"This playlist's tracks haven't been synced yet. Sync now to view and manage tracks in this playlist."
			}
		</p>
		{!playlistIsEmpty && (
			<Button
				onClick={() => syncPlaylistTracks(currentPlaylistId)}
				disabled={isSyncing}
				className="text-foreground gap-2 border-0 bg-green-600 transition-colors hover:bg-green-700"
			>
				<RefreshCcw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
				{isSyncing ? 'Syncing...' : 'Sync Playlist Tracks'}
			</Button>
		)}
	</div>
)

export const FailedSyncEmptyState: React.FC<{
	syncPlaylistTracks: (playlistId: string) => void
	currentPlaylistId: string
	isSyncing: boolean
}> = ({ syncPlaylistTracks, currentPlaylistId, isSyncing }) => (
	<div className="flex h-[calc(100vh-500px)] flex-col items-center justify-center p-12">
		<div className="mb-4 rounded-full bg-red-900/30 p-5">
			<AlertTriangle className="h-10 w-10 text-red-500" />
		</div>
		<h3 className="text-foreground mb-2 text-xl font-medium">Sync Failed</h3>
		<p className="text-muted-foreground mb-6 max-w-md text-center">
			There was an error syncing tracks for this playlist. Please try again.
		</p>
		<Button
			onClick={() => syncPlaylistTracks(currentPlaylistId)}
			disabled={isSyncing}
			className="text-foreground gap-2 border-0 bg-red-700 transition-colors hover:bg-red-800"
		>
			<RefreshCcw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
			Retry Sync
		</Button>
	</div>
)

export const FailedSyncWithTracksState: React.FC<{
	syncPlaylistTracks: (playlistId: string) => void
	currentPlaylistId: string
	isSyncing: boolean
	playlistTracks: PlaylistTrackUI[]
}> = ({ syncPlaylistTracks, currentPlaylistId, isSyncing, playlistTracks }) => (
	<>
		{/* Blurred overlay with error message */}
		<div className="bg-background/40 absolute inset-0 z-10 flex flex-col items-center justify-center p-6 backdrop-blur-sm">
			<div className="max-w-md rounded-lg border border-red-700 bg-red-900/80 p-6 text-center">
				<AlertTriangle className="mx-auto mb-3 h-10 w-10 text-red-400" />
				<h3 className="text-foreground mb-2 text-xl font-medium">Sync Failed</h3>
				<p className="text-foreground mb-4">
					There was an error syncing tracks for this playlist. Please try again.
				</p>
				<Button
					onClick={() => syncPlaylistTracks(currentPlaylistId)}
					disabled={isSyncing}
					className="text-foreground gap-2 border-0 bg-red-700 transition-colors hover:bg-red-800"
				>
					<RefreshCcw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
					Retry Sync
				</Button>
			</div>
		</div>

		{/* Blurred table in background */}
		<ScrollArea className="hover-show-scrollbar h-[calc(100vh-500px)]">
			<div className="overflow-x-auto p-4">
				<div className="min-w-[480px]">
					<TableElements.PlaylistTable playlistTracks={playlistTracks} />
				</div>
			</div>
		</ScrollArea>
	</>
)

export const TracksTableState: React.FC<{ playlistTracks: PlaylistTrackUI[] }> = ({
	playlistTracks,
}) => (
	<ScrollArea className="hover-show-scrollbar h-[calc(100vh-500px)]">
		<div className="overflow-x-auto p-4">
			<div className="min-w-[480px]">
				<TableElements.PlaylistTable playlistTracks={playlistTracks} />
			</div>
		</div>
	</ScrollArea>
)
