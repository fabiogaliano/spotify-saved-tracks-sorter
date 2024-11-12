import { useState, useEffect } from 'react'
import { Instructions } from '~/components/Instructions'

export function InstructionsButton() {
  const [showInstructions, setShowInstructions] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Handle screen size detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640) // sm breakpoint
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return (
    <div className="relative">
      <button
        onClick={() => setShowInstructions(!showInstructions)}
        className="w-8 h-8 rounded-full bg-gray-50 text-gray-400 flex items-center justify-center hover:bg-gray-100 hover:text-gray-600 transition-colors"
      >
        ?
      </button>
      
      {showInstructions && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowInstructions(false)}
          />

          {/* Modal */}
          <div className={`
            fixed z-50
            ${isMobile 
              ? 'inset-4' 
              : 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[32rem] max-h-[80vh]'
            }
          `}>
            <div className={`
              bg-white rounded-2xl shadow-lg border border-gray-200 
              ${isMobile ? 'h-full' : ''}
              overflow-y-auto
            `}>
              <div className="sticky top-0 right-0 p-2 flex justify-end bg-white border-b">
                <button
                  onClick={() => setShowInstructions(false)}
                  className="p-2 text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              <div className="p-4">
                <Instructions />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
} 