import { useState } from 'react'

interface TrackActionsProps {
  userId: string
  trackId: string
}

type Status = 'ignored' | 'unsorted' | 'sorted'

export function TrackActions({ userId, trackId }: TrackActionsProps) {
  const [status, setStatus] = useState<Status>('unsorted')
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [offsetX, setOffsetX] = useState(0)

  const getStatusFromPosition = (position: number): Status => {
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
      setStatus('ignored')
      setOffsetX(-40)
    } else if (clickX > (totalWidth * 2) / 3) {
      setStatus('sorted')
      setOffsetX(40)
    } else {
      setStatus('unsorted')
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
    if (newStatus !== status) {
      setStatus(newStatus)
    }
  }

  const handleMouseUp = () => {
    if (!isDragging) return
    
    setIsDragging(false)
    setOffsetX(status === 'sorted' ? 40 : status === 'ignored' ? -40 : 0)
  }

  return (
    <div className="relative w-[120px] mx-auto">
      <div 
        className="relative h-8 rounded-full bg-gray-100/80 cursor-pointer backdrop-blur-sm"
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Status indicators */}
        <div className="absolute inset-0 flex justify-between items-center px-3">
          {/* Remove icon */}
          <svg className="w-3 h-3 text-rose-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>

          {/* Skip/Pause icon */}
          <svg className="w-3 h-3 text-gray-400" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14m8-14v14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>

          {/* Sort/Plus icon */}
          <svg className="w-3 h-3 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 4v16m8-8H4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        {/* Sliding button with dynamic shapes */}
        <div
          className={`absolute top-1 left-1/2 w-6 h-6 rounded-full shadow-sm transform -translate-x-1/2 transition-all duration-150 
            ${isDragging ? '' : 'transition-all duration-300'}
            ${status === 'sorted' 
              ? 'bg-emerald-50 border-2 border-emerald-200 scale-110' 
              : status === 'ignored' 
                ? 'bg-rose-50 border-2 border-rose-200 scale-110' 
                : 'bg-white border border-gray-200'
            }
            ${isDragging ? 'scale-105' : ''}
          `}
          style={{
            transform: `translateX(calc(-50% + ${offsetX}px))`,
          }}
        >
          {/* Dynamic inner content */}
          <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200
            ${status === 'sorted' ? 'opacity-100' : 'opacity-0'}`}>
            <svg className="w-3 h-3 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 4v16m8-8H4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200
            ${status === 'ignored' ? 'opacity-100' : 'opacity-0'}`}>
            <svg className="w-3 h-3 text-rose-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200
            ${status === 'unsorted' ? 'opacity-100' : 'opacity-0'}`}>
            <svg className="w-3 h-3 text-gray-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14m8-14v14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
      </div>
    </div>
  )
} 