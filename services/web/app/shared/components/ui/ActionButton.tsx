import React from 'react'

import { Link } from 'react-router'

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'back'
export type ButtonSize = 'small' | 'medium' | 'large'

export interface ActionButtonProps {
	/**
	 * Button text content
	 */
	children: React.ReactNode

	/**
	 * Button style variant
	 * @default "primary"
	 */
	variant?: ButtonVariant

	/**
	 * Button size
	 * @default "medium"
	 */
	size?: ButtonSize

	/**
	 * Whether the button is disabled
	 * @default false
	 */
	disabled?: boolean

	/**
	 * URL to navigate to (renders as Link instead of button)
	 */
	to?: string

	/**
	 * Click handler (not used if 'to' is provided)
	 */
	onClick?: () => void

	/**
	 * Optional icon to display before text
	 */
	icon?: React.ReactNode

	/**
	 * Optional additional classes
	 */
	className?: string

	/**
	 * Aria label for accessibility
	 */
	ariaLabel?: string

	/**
	 * Whether the button is currently in a loading state
	 * @default false
	 */
	isLoading?: boolean

	/**
	 * Whether the button is rounded as a circle (icon-only button)
	 * @default false
	 */
	isRounded?: boolean
}

export function ActionButton({
	children,
	variant = 'primary',
	size = 'medium',
	disabled = false,
	to,
	onClick,
	icon,
	className = '',
	ariaLabel,
	isLoading = false,
	isRounded = false,
}: ActionButtonProps) {
	// Variant styling
	const variantClasses = {
		primary: 'bg-blue-500 hover:bg-blue-600 text-foreground',
		secondary: 'bg-secondary hover:bg-secondary text-foreground',
		danger: 'bg-red-500 hover:bg-red-600 text-foreground',
		success: 'bg-green-500 hover:bg-green-600 text-foreground',
		back: 'bg-secondary hover:bg-secondary text-foreground', // Back button is just secondary with an icon
	}

	// Size styling
	const sizeClasses = {
		small: 'py-1 px-2 text-sm',
		medium: 'py-2 px-4 text-base',
		large: 'py-3 px-6 text-lg',
	}

	// Base classes that apply to all button variants
	const baseClasses = `
    font-semibold
    ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
    transition-colors duration-200
    ${isRounded ? 'rounded-full' : 'rounded-sm'}
    flex items-center justify-center
    ${isLoading ? 'relative' : ''}
    ${className}
  `

	// Combine all classes
	const buttonClasses = `
    ${baseClasses}
    ${variantClasses[variant]}
    ${sizeClasses[size]}
  `

	// Back button icon
	const backIcon = (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			className="h-5 w-5"
			viewBox="0 0 20 20"
			fill="currentColor"
		>
			<path
				fillRule="evenodd"
				d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
				clipRule="evenodd"
			/>
		</svg>
	)

	// Loading spinner
	const loadingSpinner = (
		<div className="absolute inset-0 flex items-center justify-center">
			<div className="h-4 w-4 animate-spin rounded-full border-t-2 border-b-2 border-white"></div>
		</div>
	)

	// Determine which icon to show
	const iconToShow = variant === 'back' ? backIcon : icon

	// The button content
	const content = (
		<>
			{iconToShow && <span className={`${children ? 'mr-2' : ''}`}>{iconToShow}</span>}
			<span className={isLoading ? 'invisible' : ''}>{children}</span>
			{isLoading && loadingSpinner}
		</>
	)

	// Render as Link if 'to' is provided, otherwise as button
	if (to) {
		return (
			<Link to={to} className={buttonClasses} aria-label={ariaLabel}>
				{content}
			</Link>
		)
	}

	return (
		<button
			onClick={onClick}
			disabled={disabled || isLoading}
			className={buttonClasses}
			aria-label={ariaLabel}
			type="button"
		>
			{content}
		</button>
	)
}
