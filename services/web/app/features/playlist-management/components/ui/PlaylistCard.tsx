import React from 'react'

import { getColorClasses } from '../../utils/colors'

interface PlaylistCardProps {
	color: string
	size?: 'sm' | 'md' | 'lg'
}

export const PlaylistCard: React.FC<PlaylistCardProps> = ({ color, size = 'md' }) => {
	const sizes = {
		sm: { outer: 'w-6 h-6', inner: 'w-4 h-4' },
		md: { outer: 'w-10 h-10', inner: 'w-7 h-7' },
		lg: { outer: 'w-32 h-32', inner: 'w-24 h-24' },
	}

	const { outer, inner } = sizes[size]
	const colors = getColorClasses(color)

	return (
		<div
			className={`${outer} ${colors.bg} flex items-center justify-center rounded-md transition-all duration-200 hover:scale-105 hover:shadow-sm`}
		>
			<div
				className={`${inner} ${colors.inner} rounded-sm transition-all duration-200`}
			></div>
		</div>
	)
}
