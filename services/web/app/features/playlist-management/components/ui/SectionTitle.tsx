import React from 'react'

import { CardTitle } from '~/shared/components/ui'

import { StatusBadge } from './StatusBadge'

interface SectionTitleProps {
	icon: React.ReactNode
	title: string
	count?: number
}

export const SectionTitle: React.FC<SectionTitleProps> = ({ icon, title, count }) => {
	return (
		<div className="flex min-w-0 items-center justify-between gap-4">
			<CardTitle className="text-foreground flex min-w-0 items-center gap-2 text-base md:text-lg">
				{icon}
				<span className="truncate font-bold">{title}</span>
			</CardTitle>
			{count !== undefined && (
				<div className="flex-shrink-0">
					<StatusBadge color="blue">{count} total</StatusBadge>
				</div>
			)}
		</div>
	)
}
