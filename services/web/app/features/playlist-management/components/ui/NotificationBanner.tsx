import React from 'react'

import { CheckCircle2, Info } from 'lucide-react'

interface NotificationBannerProps {
	type: 'success' | 'info' | 'error'
	message: string
}

export const NotificationBanner: React.FC<NotificationBannerProps> = ({
	type,
	message,
}) => {
	return (
		<div
			className={`rounded-md border p-4 ${
				type === 'success' ?
					'border-green-800 bg-green-900/20 text-green-400'
				:	'border-blue-800 bg-blue-900/20 text-blue-400'
			}`}
		>
			<div className="flex items-center gap-2">
				{type === 'success' ?
					<CheckCircle2 className="h-4 w-4" />
				:	<Info className="h-4 w-4" />}
				{message}
			</div>
		</div>
	)
}
