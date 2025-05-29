import React from 'react'

export interface LoadingSpinnerProps {
	/**
	 * Size of the spinner
	 * @default "medium"
	 */
	size?: 'small' | 'medium' | 'large'

	/**
	 * Optional text to display under the spinner
	 */
	text?: string

	/**
	 * Whether to center the spinner in its container
	 * @default true
	 */
	centered?: boolean

	/**
	 * Whether the spinner should fill the entire parent container height
	 * @default false
	 */
	fullHeight?: boolean

	/**
	 * Optional additional classes
	 */
	className?: string
}

export function LoadingSpinner({
	size = 'medium',
	text,
	centered = true,
	fullHeight = false,
	className = '',
}: LoadingSpinnerProps) {
	// Size mapping
	const sizeClasses = {
		small: 'h-4 w-4 border-2',
		medium: 'h-8 w-8 border-2',
		large: 'h-12 w-12 border-t-2 border-b-2',
	}

	// Text size mapping
	const textSizes = {
		small: 'text-xs',
		medium: 'text-sm',
		large: 'text-base',
	}

	return (
		<div
			className={`
        ${centered ? 'flex flex-col items-center justify-center' : ''}
        ${fullHeight ? 'min-h-[60vh]' : ''}
        ${className}
      `}
		>
			<div
				className={`
          animate-spin rounded-full 
          ${sizeClasses[size]} 
          border-purple-500 
          mb-${text ? '4' : '0'}
        `}
			></div>
			{text && <p className={`${textSizes[size]} text-muted-foreground/60`}>{text}</p>}
		</div>
	)
}
