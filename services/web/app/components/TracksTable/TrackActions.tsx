import { useState } from 'react'
import { useTrackSortingStore, TrackStatus } from '~/lib/stores/trackSortingStore'

interface TrackActionsProps {
	userId: string
	trackId: string
}

export function TrackActions({ userId, trackId }: TrackActionsProps) {
	const { getTrackStatus, setTrackStatus } = useTrackSortingStore()
	const storeStatus = useTrackSortingStore(state => state.getTrackStatus(trackId))
	const [isDragging, setIsDragging] = useState(false)
	const [startX, setStartX] = useState(0)
	const [offsetX, setOffsetX] = useState(() => {
		// Initialize offset based on the status from the store
		const initialStatus = getTrackStatus(trackId)
		return initialStatus === 'sorted' ? 40 : initialStatus === 'ignored' ? -40 : 0
	})

	const getStatusFromPosition = (position: number): TrackStatus => {
		if (position < -33) return 'ignored'
		if (position > 33) return 'sorted'
		return 'unsorted'
	}

	const handleClick = (e: React.MouseEvent) => {
		if (isDragging) return

		const rect = e.currentTarget.getBoundingClientRect()
		const clickX = e.clientX - rect.left
		const totalWidth = rect.width

		if (clickX < totalWidth / 3) {
			setTrackStatus(trackId, 'ignored')
			setOffsetX(-40)
		} else if (clickX > (totalWidth * 2) / 3) {
			setTrackStatus(trackId, 'sorted')
			setOffsetX(40)
		} else {
			setTrackStatus(trackId, 'unsorted')
			setOffsetX(0)
		}
	}

	const handleMouseDown = (e: React.MouseEvent) => {
		setIsDragging(true)
		setStartX(e.clientX - offsetX)
	}

	const handleMouseMove = (e: React.MouseEvent) => {
		if (!isDragging) return

		const newOffset = Math.max(Math.min(e.clientX - startX, 40), -40)
		setOffsetX(newOffset)

		const newStatus = getStatusFromPosition(newOffset)
		if (newStatus !== storeStatus) {
			setTrackStatus(trackId, newStatus)
		}
	}

	const handleMouseUp = () => {
		if (!isDragging) return

		setIsDragging(false)
		setOffsetX(storeStatus === 'sorted' ? 40 : storeStatus === 'ignored' ? -40 : 0)
	}

	return (
		<div className="relative w-[120px] mx-auto">
			<div
				className="relative h-8 rounded-full bg-muted/80 cursor-pointer backdrop-blur-xs"
				onClick={handleClick}
				onMouseDown={handleMouseDown}
				onMouseMove={handleMouseMove}
				onMouseUp={handleMouseUp}
				onMouseLeave={handleMouseUp}
			>
				{/* Status indicators */}
				<div className="absolute inset-0 flex justify-between items-center px-3">
					{/* Remove icon */}
					<svg
						className="w-3 h-3 text-rose-400"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
					>
						<path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
					</svg>

					{/* Skip/Pause icon */}
					<svg className="w-3 h-3 text-muted-foreground" viewBox="0 0 24 24" fill="currentColor">
						<path
							d="M8 5v14m8-14v14"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
					</svg>

					{/* Sort/Plus icon */}
					<svg
						className="w-3 h-3 text-emerald-400"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
					>
						<path d="M12 4v16m8-8H4" strokeLinecap="round" strokeLinejoin="round" />
					</svg>
				</div>

				{/* Sliding button with dynamic shapes */}
				<div
					className={`absolute top-1 left-1/2 w-6 h-6 rounded-full shadow-sm transform -translate-x-1/2 transition-all duration-150 
            ${isDragging ? '' : 'transition-all duration-300'}
            ${
							storeStatus === 'sorted'
								? 'bg-emerald-50 border-2 border-emerald-200 scale-110'
								: storeStatus === 'ignored'
								? 'bg-rose-50 border-2 border-rose-200 scale-110'
								: 'bg-white border border-border'
						}
            ${isDragging ? 'scale-105' : ''}
          `}
					style={{
						transform: `translateX(calc(-50% + ${offsetX}px))`,
					}}
				>
					{/* Dynamic inner content */}
					<div
						className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200
            ${storeStatus === 'sorted' ? 'opacity-100' : 'opacity-0'}`}
					>
						<svg
							className="w-3 h-3 text-emerald-400"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
						>
							<path d="M12 4v16m8-8H4" strokeLinecap="round" strokeLinejoin="round" />
						</svg>
					</div>
					<div
						className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200
            ${storeStatus === 'ignored' ? 'opacity-100' : 'opacity-0'}`}
					>
						<svg
							className="w-3 h-3 text-rose-400"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
						>
							<path
								d="M18 6L6 18M6 6l12 12"
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
						</svg>
					</div>
					<div
						className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200
            ${storeStatus === 'unsorted' ? 'opacity-100' : 'opacity-0'}`}
					>
						<svg
							className="w-3 h-3 text-muted-foreground"
							viewBox="0 0 24 24"
							fill="currentColor"
						>
							<path
								d="M8 5v14m8-14v14"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
						</svg>
					</div>
				</div>
			</div>
		</div>
	)
}
