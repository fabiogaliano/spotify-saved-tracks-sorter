import React from 'react'

export interface CardProps {
	/**
	 * Card content
	 */
	children: React.ReactNode

	/**
	 * Optional card title
	 */
	title?: string

	/**
	 * Optional card subtitle
	 */
	subtitle?: string

	/**
	 * Optional action buttons to display in the header
	 */
	actions?: React.ReactNode

	/**
	 * Whether to add extra padding
	 * @default true
	 */
	padding?: boolean

	/**
	 * Whether to add border
	 * @default true
	 */
	bordered?: boolean

	/**
	 * Whether to add shadow
	 * @default true
	 */
	shadowed?: boolean

	/**
	 * Optional additional classes
	 */
	className?: string

	/**
	 * Optional additional classes for the content area
	 */
	contentClassName?: string

	/**
	 * Optional footer content
	 */
	footer?: React.ReactNode

	/**
	 * Whether the card is in a loading state
	 * @default false
	 */
	isLoading?: boolean
}

export function Card({
	children,
	title,
	subtitle,
	actions,
	padding = true,
	bordered = true,
	shadowed = true,
	className = '',
	contentClassName = '',
	footer,
	isLoading = false,
}: CardProps) {
	const hasHeader = title || subtitle || actions

	return (
		<div
			className={`
        bg-white 
        rounded-lg 
        overflow-hidden
        ${bordered ? 'border border-gray-200' : ''}
        ${shadowed ? 'shadow-md' : ''}
        ${className}
      `}
		>
			{hasHeader && (
				<div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
					<div>
						{title && <h2 className="text-xl font-semibold mb-1">{title}</h2>}
						{subtitle && <p className="text-gray-600 text-sm">{subtitle}</p>}
					</div>
					{actions && <div className="flex items-center space-x-2">{actions}</div>}
				</div>
			)}

			<div className={`${padding ? 'p-6' : ''} ${contentClassName}`}>
				{isLoading ? (
					<div className="flex justify-center items-center py-8">
						<div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
					</div>
				) : (
					children
				)}
			</div>

			{footer && (
				<div className="px-6 py-3 bg-gray-50 border-t border-gray-200">{footer}</div>
			)}
		</div>
	)
}
