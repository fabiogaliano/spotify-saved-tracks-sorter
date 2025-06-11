import { useState, useEffect } from 'react'
import { Help } from '~/components/Help'

export function HelpButton() {
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
				className="px-4 py-2 
          rounded-full
          font-medium
          text-sm
          bg-muted 
          text-muted-foreground/50 
          flex items-center justify-center 
          hover:bg-muted hover:text-muted-foreground/70 
          transition-all duration-200 
          active:scale-95"
			>
				?
			</button>

			{showInstructions && (
				<>
					{/* Backdrop */}
					<div
						className="fixed inset-0 bg-background/50 z-40"
						onClick={() => setShowInstructions(false)}
					/>

					{/* Modal */}
					<div
						className={`
            fixed z-50
            ${
							isMobile
								? 'inset-4'
								: 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[32rem] max-h-[80vh]'
						}
          `}
					>
						<div
							className={`
              bg-white rounded-2xl shadow-lg border border-border 
              ${isMobile ? 'h-full' : ''}
              overflow-y-auto
            `}
						>
							<div className="sticky top-0 right-0 p-2 flex justify-end bg-white border-b">
								<button
									onClick={() => setShowInstructions(false)}
									className="p-2 text-muted-foreground hover:text-muted-foreground/60"
								>
									✕
								</button>
							</div>
							<div className="p-4">
								<Help />
							</div>
						</div>
					</div>
				</>
			)}
		</div>
	)
}
