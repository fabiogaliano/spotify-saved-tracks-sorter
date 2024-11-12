import { Form } from '@remix-run/react'
import { useState, useRef } from 'react'

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
  const formRef = useRef<HTMLFormElement>(null)

  const getStatusFromPosition = (position: number): Status => {
    if (position < -33) return 'ignored'
    if (position > 33) return 'sorted'
    return 'unsorted'
  }

  const getNextStatus = (currentStatus: Status): Status => {
    if (currentStatus === 'unsorted' && offsetX === 0) return 'sorted'
    if (currentStatus === 'sorted' && offsetX === 40) return 'ignored'
    if (currentStatus === 'ignored' && offsetX === -40) return 'unsorted'
    
    if (currentStatus === 'unsorted') return 'sorted'
    if (currentStatus === 'sorted') return 'ignored'
    return 'unsorted'
  }

  const handleSubmit = () => {
    if (formRef.current) {
      formRef.current.requestSubmit()
    }
  }

  // Click handler for simple status changes
  const handleClick = (e: React.MouseEvent) => {
    if (isDragging) return

    // Get click position relative to the slider
    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const totalWidth = rect.width

    // Simply set the state based on which third was clicked
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
    
    handleSubmit()
  }

  // Drag handlers
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
    handleSubmit()
  }

  return (
    <div className="relative w-[120px]">
      <Form ref={formRef} method="post" className="hidden">
        <input type="hidden" name="userId" value={userId} />
        <input type="hidden" name="trackId" value={trackId} />
        <input type="hidden" name="status" value={status} />
        <input type="hidden" name="_action" value="updateTrackStatus" />
      </Form>

      <div 
        className="relative h-8 rounded-full bg-gray-100/80 cursor-pointer backdrop-blur-sm"
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Status indicators */}
        <div className="absolute inset-0 flex justify-between items-center px-3 text-xs">
          <span className="text-rose-300">–</span>
          <span className="text-gray-300">•</span>
          <span className="text-emerald-300">+</span>
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
            transform: `translateX(calc(-50% + ${offsetX}px)) ${
              status === 'sorted'
                ? 'rotate(45deg)'
                : status === 'ignored'
                ? 'rotate(-45deg)'
                : 'rotate(0deg)'
            }`,
          }}
        >
          {/* Dynamic inner content */}
          <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200
            ${status === 'sorted' 
              ? 'opacity-100' 
              : 'opacity-0'}`}>
            <div className="w-2 h-2 rounded-sm bg-emerald-200 rotate-[-45deg]" />
          </div>
          <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200
            ${status === 'ignored' 
              ? 'opacity-100' 
              : 'opacity-0'}`}>
            <div className="w-2 h-2 rounded-sm bg-rose-200 rotate-[45deg]" />
          </div>
        </div>
      </div>
    </div>
  )
} 