import { RefObject, useEffect } from 'react'

export function useClickOutside<T extends HTMLElement = HTMLElement>(
	refs: RefObject<T> | RefObject<T>[],
	handler: (event: MouseEvent) => void,
	enabled: boolean = true
) {
	useEffect(() => {
		if (!enabled) return

		const handleClickOutside = (event: MouseEvent) => {
			const refsArray = Array.isArray(refs) ? refs : [refs]
			if (
				refsArray.every(ref => ref.current && !ref.current.contains(event.target as Node))
			) {
				handler(event)
			}
		}

		document.addEventListener('mousedown', handleClickOutside)
		return () => document.removeEventListener('mousedown', handleClickOutside)
	}, [refs, handler, enabled])
}
