import { useEffect, useRef } from 'react'

/**
 * Custom hook for setting up an interval that can be paused/resumed
 * @param callback Function to call on each interval
 * @param delay Delay in milliseconds, or null to pause the interval
 */
export function useInterval(callback: () => void, delay: number | null) {
	const savedCallback = useRef<() => void>()

	// Remember the latest callback
	useEffect(() => {
		savedCallback.current = callback
	}, [callback])

	// Set up the interval
	useEffect(() => {
		// Don't schedule if delay is null
		if (delay === null) return

		const tick = () => {
			if (savedCallback.current) {
				savedCallback.current()
			}
		}

		const id = setInterval(tick, delay)
		return () => clearInterval(id)
	}, [delay])
}
