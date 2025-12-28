import { useEffect, useState } from 'react'

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
				className="bg-muted text-muted-foreground/50 hover:bg-muted hover:text-muted-foreground/70 flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 active:scale-95"
			>
				?
			</button>

			{showInstructions && (
				<>
					{/* Backdrop */}
					<div
						className="bg-background/50 fixed inset-0 z-40"
						onClick={() => setShowInstructions(false)}
					/>

					{/* Modal */}
					<div
						className={`fixed z-50 ${
							isMobile ? 'inset-4' : (
								'top-1/2 left-1/2 max-h-[80vh] w-[32rem] -translate-x-1/2 -translate-y-1/2'
							)
						} `}
					>
						<div
							className={`border-border rounded-2xl border bg-white shadow-lg ${isMobile ? 'h-full' : ''} overflow-y-auto`}
						>
							<div className="sticky top-0 right-0 flex justify-end border-b bg-white p-2">
								<button
									onClick={() => setShowInstructions(false)}
									className="text-muted-foreground hover:text-muted-foreground/60 p-2"
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
