import { useState, useEffect } from 'react'
import { useFetcher } from 'react-router';
import { SyncResult } from '~/lib/models/Sync'
import { SyncStatus } from './SyncStatus'

type SyncLibraryButtonProps = {
	userId: number
}

export function SyncLibraryButton({ userId }: SyncLibraryButtonProps) {
	const fetcher = useFetcher<{ savedTracks: SyncResult; playlists: SyncResult }>()
	const [buttonText, setButtonText] = useState('Sync Spotify Library')

	const isLoading = fetcher.state !== 'idle'

	useEffect(() => {
		if (isLoading) {
			const timer = setTimeout(() => {
				setButtonText('Syncing...')
			}, 100) // Matches the duration-200 transition
			return () => clearTimeout(timer)
		} else {
			setButtonText('Sync Spotify Library')
		}
	}, [isLoading])

	return (
		<div className="flex flex-col items-center gap-2">
			<fetcher.Form method="post">
				<input type="hidden" name="userId" value={userId} />
				<input type="hidden" name="_action" value="sync" />
				<button
					type="submit"
					disabled={isLoading}
					className={`
						px-4 py-2 
						rounded-full
						font-medium
						text-sm
						transition-all duration-200
						${
							isLoading
								? 'bg-gray-100 text-gray-400 cursor-not-allowed'
								: 'bg-[#1DB954] text-white hover:bg-[#1ed760] active:scale-95'
						}
					`}
				>
					{buttonText}
				</button>
			</fetcher.Form>

			<SyncStatus result={fetcher.data} />
		</div>
	)
}

// ;<button class=" text-sm font-medium text-gray-700 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">
