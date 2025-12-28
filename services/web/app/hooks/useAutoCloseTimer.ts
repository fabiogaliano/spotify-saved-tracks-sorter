import { useCallback, useEffect, useRef } from 'react'

/**
 * Hook to manage an auto-close timer with proper cleanup
 * @param callback Function to call when the timer expires
 * @param duration Duration in milliseconds
 * @returns Object with functions to start and clear the timer
 */
export function useAutoCloseTimer(callback: () => void, duration: number = 30000) {
	const timerRef = useRef<NodeJS.Timeout | null>(null)

	// Clear any existing timer
	const clearTimer = useCallback(() => {
		if (timerRef.current) {
			clearTimeout(timerRef.current)
			timerRef.current = null
		}
	}, [])

	// Start a new timer, clearing any existing one
	const startTimer = useCallback(() => {
		clearTimer()
		timerRef.current = setTimeout(() => {
			callback()
			timerRef.current = null
		}, duration)
	}, [callback, duration, clearTimer])

	// Clean up on unmount
	useEffect(() => {
		return clearTimer
	}, [clearTimer])

	return {
		startTimer,
		clearTimer,
		isActive: !!timerRef.current,
	}
}
