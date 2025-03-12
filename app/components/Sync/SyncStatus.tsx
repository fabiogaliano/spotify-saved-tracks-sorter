import { useState, useEffect } from 'react'
import { SyncResult } from '~/lib/models/Sync'
import { SyncNotification } from './SyncNotification'

type SyncStatusProps = {
	result?: {
		savedTracks: SyncResult
		playlists: SyncResult
	}
}

export function SyncStatus({ result }: SyncStatusProps) {
	const [notifications, setNotifications] = useState<
		Array<{
			id: number
			type: 'success' | 'error'
			message: string
		}>
	>([])

	useEffect(() => {
		if (!result) return

		const newNotifications: Array<{
			id: number
			type: 'success' | 'error'
			message: string
		}> = []

		if (result.savedTracks) {
			newNotifications.push({
				id: Date.now(),
				type: result.savedTracks.success ? 'success' : 'error',
				message: `Songs: ${
					result.savedTracks.success ? 'Synced successfully' : 'Failed to sync'
				}${result.savedTracks.message ? ` - ${result.savedTracks.message}` : ''}`,
			})
		}

		if (result.playlists) {
			newNotifications.push({
				id: Date.now() + 1,
				type: result.playlists.success ? 'success' : 'error',
				message: `Playlists: ${
					result.playlists.success ? 'Synced successfully' : 'Failed to sync'
				}${result.playlists.message ? ` - ${result.playlists.message}` : ''}`,
			})
		}

		setNotifications(prev => [...prev, ...newNotifications])
	}, [result])

	const removeNotification = (id: number) => {
		setNotifications(prev => prev.filter(n => n.id !== id))
	}

	if (!notifications.length) return null

	return (
		<div
			className="fixed bottom-4 right-4 flex flex-col gap-2 max-w-sm z-50"
			role="alert"
			aria-live="polite"
		>
			{notifications.map(notification => (
				<div
					key={notification.id}
					className="animate-slide-in transform transition-all duration-300 ease-out"
				>
					<SyncNotification
						type={notification.type}
						message={notification.message}
						onClose={() => removeNotification(notification.id)}
					/>
				</div>
			))}
		</div>
	)
}
