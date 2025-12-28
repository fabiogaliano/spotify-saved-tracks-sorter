import React, { ReactNode } from 'react'

interface StatusBadgeProps {
	children: ReactNode
	color?: string
	className?: string
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
	children,
	color = 'blue',
	className = '',
}) => {
	return (
		<div
			className={`text-xs bg-${color}-500/20 rounded-md px-2 py-1 text-${color}-400 font-medium ${className}`}
		>
			{children}
		</div>
	)
}
