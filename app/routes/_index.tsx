import type { MetaFunction } from '@remix-run/node'
import { useLoaderData, useActionData } from '@remix-run/react'
import { useState, useEffect } from 'react'
import { SpotifyLogin } from '~/components/SpotifyLogin'
import { HomeHeader } from '~/components/Home/HomeHeader'
import { StatusFilter } from '~/components/TracksTable/StatusFilter'
import { ColumnToggle } from '~/components/TracksTable/ColumnVisibility'
import { TracksTable } from '~/components/TracksTable/TracksTable'
import { useTracksStore } from '~/core/stores/tracksStore'
import { loader } from '~/core/loaders/index.loader.server'
import { action } from '~/core/actions/index.action.server'
import type { SavedTrackRow, SavedTrackStore } from '~/core/domain/Track'
import type { Track as TrackTableItem } from '~/components/TracksTable/types'

export { loader, action }

export const meta: MetaFunction = () => {
	return [
		{ title: 'spotify liked songs - ai sorter' },
		{ name: 'description', content: 'Welcome to spotify liked songs - ai sorter!' },
	]
}

interface TrackFilterControlsProps {
	showStatus: 'all' | 'unsorted' | 'sorted' | 'ignored'
	onStatusChange: (status: 'all' | 'unsorted' | 'sorted' | 'ignored') => void
	showAlbum: boolean
	showAddedDate: boolean
	onShowAlbumChange: (show: boolean) => void
	onShowAddedDateChange: (show: boolean) => void
}

function TrackFilterControls({
	showStatus,
	onStatusChange,
	showAlbum,
	showAddedDate,
	onShowAlbumChange,
	onShowAddedDateChange,
}: TrackFilterControlsProps) {
	return (
		<div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6 lg:mb-8">
			<div className="w-full flex justify-center sm:justify-start sm:w-auto">
				<StatusFilter showStatus={showStatus} onStatusChange={onStatusChange} />
			</div>
			<div className="w-full flex justify-center sm:justify-start sm:w-auto">
				<ColumnToggle
					showAlbum={showAlbum}
					showAddedDate={showAddedDate}
					onShowAlbumChange={onShowAlbumChange}
					onShowAddedDateChange={onShowAddedDateChange}
				/>
			</div>
		</div>
	)
}

export default function Index() {
	const { spotifyProfile, user, savedTracks } = useLoaderData<typeof loader>()
	const [showStatus, setShowStatus] = useState<'all' | 'unsorted' | 'sorted' | 'ignored'>(
		'unsorted'
	)
	const [showAlbum, setShowAlbum] = useState(false)
	const [showAddedDate, setShowAddedDate] = useState(false)
	const setTracks = useTracksStore(state => state.setTracks)

	useEffect(() => {
		if (typeof window === 'undefined') return

		if (savedTracks && savedTracks.length > 0) {
			const trackObjects: SavedTrackStore[] = savedTracks.map(
				(savedTrack: SavedTrackRow) => ({
					id: savedTrack.track.id,
					spotify_track_id: savedTrack.track.spotify_track_id,
					name: savedTrack.track.name,
					artist: savedTrack.track.artist,
					album: savedTrack.track.album,
					liked_at: savedTrack.liked_at,
					sorting_status: savedTrack.sorting_status || 'unsorted',
				})
			)
			setTracks(trackObjects)
		}
	}, [savedTracks, setTracks])

	useEffect(() => {
		if (typeof window !== 'undefined') {
			setShowAlbum(window.innerWidth >= 1000)

			const handleResize = () => setShowAlbum(window.innerWidth >= 1000)
			window.addEventListener('resize', handleResize)
			return () => window.removeEventListener('resize', handleResize)
		}
	}, [])

	if (!spotifyProfile) {
		return (
			<div className="h-screen flex items-center justify-center p-4">
				<SpotifyLogin />
			</div>
		)
	}

	const filterTracks = (): TrackTableItem[] => {
		if (!savedTracks) return []

		return savedTracks
			.filter(
				(track: SavedTrackRow) =>
					showStatus === 'all' || track.sorting_status === showStatus
			)
			.map(
				(track: SavedTrackRow): TrackTableItem => ({
					id: track.track.spotify_track_id,
					name: track.track.name,
					artist: track.track.artist,
					album: track.track.album || '',
					likedAt: track.liked_at,
					sortingStatus: track.sorting_status || 'unsorted',
					userId: user?.id,
				})
			)
	}

	return (
		<div className="max-w-[120rem] mx-auto px-2 sm:px-6 lg:px-10 py-6 lg:py-14">
			<HomeHeader spotifyProfile={spotifyProfile} user={user} />

			<main>
				<TrackFilterControls
					showStatus={showStatus}
					onStatusChange={setShowStatus}
					showAlbum={showAlbum}
					showAddedDate={showAddedDate}
					onShowAlbumChange={setShowAlbum}
					onShowAddedDateChange={setShowAddedDate}
				/>

				<TracksTable
					tracks={filterTracks()}
					showStatus={showStatus}
					showAddedDate={showAddedDate}
					showAlbum={showAlbum}
				/>
			</main>
		</div>
	)
}
