import { useEffect } from 'react'

type SyncNotificationProps = {
	type: 'success' | 'error'
	message: string
	onClose: () => void
}

export function SyncNotification({ type, message, onClose }: SyncNotificationProps) {
	useEffect(() => {
		const timer = setTimeout(() => {
			onClose()
		}, 7000)

		return () => clearTimeout(timer)
	}, [onClose])

	return (
		<div className={`
			flex items-center justify-between
			px-4 py-3 
			rounded-xl
			shadow-lg
			backdrop-blur-sm
			transition-all duration-300 ease-in-out
			${type === 'success' 
				? 'bg-emerald-50/90 text-emerald-700 border border-emerald-200/50' 
				: 'bg-rose-50/90 text-rose-700 border border-rose-200/50'
			}
		`}>
			<span className="text-sm font-medium">
				{message}
			</span>
			<button
				onClick={onClose}
				className={`
					ml-4 p-1.5
					rounded-full
					transition-all duration-200
					${type === 'success' 
						? 'hover:bg-emerald-100 active:bg-emerald-200' 
						: 'hover:bg-rose-100 active:bg-rose-200'
					}
				`}
				aria-label="Close notification"
			>
				<svg 
					className="w-3.5 h-3.5" 
					viewBox="0 0 20 20" 
					fill="currentColor"
				>
					<path 
						fillRule="evenodd" 
						d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" 
						clipRule="evenodd" 
					/>
				</svg>
			</button>
		</div>
	)
} 