import { useLoaderData, useMatches } from '@remix-run/react'
import { useState } from 'react'
import { HomeHeader } from '~/shared/components/home/HomeHeader'
import { TrackFilterControls } from '~/shared/components/tracks/TrackFilterControls'
import { TracksTable } from '~/shared/components/tracks/TracksTable'
import { useTrackFiltering } from '~/shared/hooks/useTrackFiltering'
import { useTrackInitialization } from '~/shared/hooks/useTrackInitialization'
import { useResponsiveDisplay } from '~/shared/hooks/useResponsiveDisplay'
import { useUserStore } from '~/lib/stores/userStore'
import LandingPage from '~/features/auth/LandingPage'
import type { RootLoaderData } from '~/root'

// Import the loader
import { loader } from '~/features/tracks/loaders/index.loader.server'
import { action } from '~/features/tracks/actions/index.action.server'

export { loader, action }

export default function Index() {
	// Get track data from the index loader
	const { savedTracks } = useLoaderData<typeof loader>()

	// Get authentication data from the root loader
	const matches = useMatches()
	const rootData = matches[0].data as RootLoaderData
	const isAuthenticated = rootData.isAuthenticated
	const spotifyUser = rootData.spotifyUser
	const appUser = rootData.appUser

	const [showStatus, setShowStatus] = useState<'all' | 'unsorted' | 'sorted' | 'ignored'>(
		'unsorted'
	)

	const { showAlbum, showAddedDate, setShowAlbum, setShowAddedDate } =
		useResponsiveDisplay()

	// Only initialize tracks if authenticated and we have tracks
	if (isAuthenticated && savedTracks) {
		useTrackInitialization({ savedTracks })
	}

	// If not authenticated, show landing page
	if (!isAuthenticated || !spotifyUser) {
		return <LandingPage />
	}

	const { filteredTracks } = useTrackFiltering({
		savedTracks: savedTracks || [],
		showStatus,
		userId: appUser?.id,
	})

	return (
		<div className="max-w-[120rem] mx-auto px-2 sm:px-6 lg:px-10 py-6 lg:py-14">
			<HomeHeader spotifyProfile={spotifyUser.name} user={appUser} />
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