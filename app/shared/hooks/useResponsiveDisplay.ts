import { useState, useEffect } from 'react'

interface UseResponsiveDisplayOptions {
  initialShowAlbum?: boolean
  breakpoint?: number
}

export function useResponsiveDisplay({
  initialShowAlbum = false,
  breakpoint = 1000
}: UseResponsiveDisplayOptions = {}) {
  const [showAlbum, setShowAlbum] = useState(initialShowAlbum)
  const [showAddedDate, setShowAddedDate] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setShowAlbum(window.innerWidth >= breakpoint)

      const handleResize = () => setShowAlbum(window.innerWidth >= breakpoint)
      window.addEventListener('resize', handleResize)
      return () => window.removeEventListener('resize', handleResize)
    }
  }, [breakpoint])

  return {
    showAlbum,
    showAddedDate,
    setShowAlbum,
    setShowAddedDate
  }
} 