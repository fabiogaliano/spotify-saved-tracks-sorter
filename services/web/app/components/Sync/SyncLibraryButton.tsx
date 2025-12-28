import { useEffect, useState } from 'react'

import { useFetcher } from 'react-router'

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
					className={`rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${
						isLoading ?
							'bg-muted text-muted-foreground cursor-not-allowed'
						:	'text-foreground bg-[#1DB954] hover:bg-[#1ed760] active:scale-95'
					} `}
				>
					{buttonText}
				</button>
			</fetcher.Form>

			<SyncStatus result={fetcher.data} />
		</div>
	)
}

// ;<button class=" text-sm font-medium text-muted-foreground/50 bg-muted rounded-full hover:bg-muted transition-colors">
