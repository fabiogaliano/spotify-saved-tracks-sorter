import type { MetaFunction } from '@remix-run/node'
import { redirect, useLoaderData } from '@remix-run/react'
import { useUserStore } from '~/lib/stores/userStore'
import { useState } from 'react'
import { HomeHeader } from '~/shared/components/home/HomeHeader'
import { TrackFilterControls } from '~/shared/components/tracks/TrackFilterControls'
import { TracksTable } from '~/shared/components/tracks/TracksTable'
import { useTrackFiltering } from '~/shared/hooks/useTrackFiltering'
import { useTrackInitialization } from '~/shared/hooks/useTrackInitialization'
import { useResponsiveDisplay } from '~/shared/hooks/useResponsiveDisplay'
import { loader } from '~/features/tracks/loaders/index.loader.server'
import { action } from '~/features/tracks/actions/index.action.server'
import LandingPage from '~/features/auth/LandingPage'

export { loader, action }

export const meta: MetaFunction = () => {
	return [
		{ title: 'spotify liked songs - ai sorter' },
		{ name: 'description', content: 'Welcome to spotify liked songs - ai sorter!' },
	]
}

export default function Index() {
	const { spotifyProfile, user, savedTracks } = useLoaderData<typeof loader>()
	const [showStatus, setShowStatus] = useState<'all' | 'unsorted' | 'sorted' | 'ignored'>(
		'unsorted'
	)

	const { initialize } = useUserStore()
	initialize(user, spotifyProfile)

	const { showAlbum, showAddedDate, setShowAlbum, setShowAddedDate } =
		useResponsiveDisplay()

	useTrackInitialization({ savedTracks })


	const { filteredTracks } = useTrackFiltering({
		savedTracks,
		showStatus,
		userId: user?.id,
	})

	if (!spotifyProfile) {
		return <LandingPage />
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
					tracks={filteredTracks}
					showStatus={showStatus}
					showAddedDate={showAddedDate}
					showAlbum={showAlbum}
				/>
			</main>
		</div>
	)
}
