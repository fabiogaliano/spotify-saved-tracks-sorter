import { useEffect } from 'react'

export type NotificationType = 'success' | 'error' | 'warning' | 'info'

type NotificationProps = {
	type: NotificationType
	message: string
	onClose: () => void
	persistent?: boolean
	action?: {
		label: string
		onClick: () => void
	}
}

export function Notification({ 
	type, 
	message, 
	onClose, 
	persistent = false,
	action
}: NotificationProps) {
	useEffect(() => {
		if (!persistent) {
			const timer = setTimeout(() => {
				onClose()
			}, 7000)

			return () => clearTimeout(timer)
		}
	}, [onClose, persistent])

	const getTypeStyles = () => {
		switch (type) {
			case 'success':
				return 'bg-emerald-50/90 text-emerald-700 border border-emerald-200/50'
			case 'error':
				return 'bg-rose-50/90 text-rose-700 border border-rose-200/50'
			case 'warning':
				return 'bg-amber-50/90 text-amber-700 border border-amber-200/50'
			case 'info':
				return 'bg-blue-50/90 text-blue-700 border border-blue-200/50'
			default:
				return 'bg-gray-50/90 text-gray-700 border border-gray-200/50'
		}
	}

	const getButtonHoverStyles = () => {
		switch (type) {
			case 'success':
				return 'hover:bg-emerald-100 active:bg-emerald-200'
			case 'error':
				return 'hover:bg-rose-100 active:bg-rose-200'
			case 'warning':
				return 'hover:bg-amber-100 active:bg-amber-200'
			case 'info':
				return 'hover:bg-blue-100 active:bg-blue-200'
			default:
				return 'hover:bg-gray-100 active:bg-gray-200'
		}
	}

	return (
		<div className={`
			flex items-center justify-between
			px-4 py-3 
			rounded-xl
			shadow-lg
			backdrop-blur-sm
			transition-all duration-300 ease-in-out
			${getTypeStyles()}
		`}>
			<div className="flex-1">
				<span className="text-sm font-medium">
					{message}
				</span>
				
				{action && (
					<button
						onClick={action.onClick}
						className={`
							mt-2 text-xs font-medium underline
							transition-all duration-200
							${getButtonHoverStyles()}
						`}
					>
						{action.label}
					</button>
				)}
			</div>
			
			<button
				onClick={onClose}
				className={`
					ml-4 p-1.5
					rounded-full
					transition-all duration-200
					${getButtonHoverStyles()}
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
