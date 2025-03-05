import { Link } from '@remix-run/react'
import { useEffect, useState } from 'react'
import { SpotifySignOut } from '~/components/SpotifySignOut'
import { HelpButton } from '~/components/HelpButton'
import { ConfigButton } from '~/components/ConfigButton'
import { SyncLibraryButton } from '~/components/Sync/SyncLibraryButton'
import { useTrackSortingStore } from '~/lib/stores/trackSortingStore'
import { SpotifyProfile } from '~/core/domain/Spotify'
import { User } from '~/core/domain/User'
import { useFetcherStore } from '~/lib/stores/fetcherStore'

interface HomeHeaderProps {
	spotifyProfile: {
		display_name?: string
	} | null
	user: {
		id: number
	} | null
}

export function HomeHeader({ spotifyProfile, user }: HomeHeaderProps) {
	const [mounted, setMounted] = useState(false)
	const [sortedTracksCount, setSortedTracksCount] = useState(0)

	useEffect(() => {
		setMounted(true)
		if (typeof window !== 'undefined') {
			const count = useTrackSortingStore.getState().getSortedTracksCount()
			setSortedTracksCount(count)

			const unsubscribe = useTrackSortingStore.subscribe(() =>
				setSortedTracksCount(useTrackSortingStore.getState().getSortedTracksCount())
			)

			return unsubscribe
		}
	}, [])

	return (
		<nav className="space-y-6 lg:space-y-10 mb-6 lg:mb-12">
			<div className="flex flex-col-reverse sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-4 lg:pb-8">
				<div className="w-full sm:w-auto">
					{spotifyProfile?.display_name && (
						<h1 className="text-xl sm:text-2xl lg:text-3xl font-medium text-gray-900 break-words text-center sm:text-left">
							Welcome, {spotifyProfile.display_name}
						</h1>
					)}
				</div>
				<div className="w-full sm:w-auto flex justify-center sm:justify-end gap-4">
					{mounted && sortedTracksCount > 0 && (
						<Link
							to="/analysis/music"
							className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
						>
							Match Songs{' '}
							<span className="ml-2 px-2 py-1 text-xs bg-blue-800 rounded-full">
								{sortedTracksCount}
							</span>
						</Link>
					)}
					{user?.id && <SyncLibraryButton userId={user.id} />}
					<HelpButton />
					<ConfigButton />
					<SpotifySignOut />
				</div>
			</div>
		</nav>
	)
}
