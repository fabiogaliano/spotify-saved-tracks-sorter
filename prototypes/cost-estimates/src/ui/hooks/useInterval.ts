/**
 * useInterval Hook
 *
 * Sets up an interval that is properly cleaned up on unmount.
 * Pass null as delay to pause the interval.
 */

import { useEffect, useRef } from 'react'

export function useInterval(callback: () => void, delay: number | null) {
	const savedCallback = useRef<() => void>(callback)

	// Remember the latest callback
	useEffect(() => {
		savedCallback.current = callback
	}, [callback])

	// Set up the interval
	useEffect(() => {
		if (delay === null) return

		const id = setInterval(() => {
			savedCallback.current?.()
		}, delay)

		return () => clearInterval(id)
	}, [delay])
}
