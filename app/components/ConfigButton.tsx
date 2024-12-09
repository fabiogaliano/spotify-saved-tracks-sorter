import { useState, useEffect } from 'react'
import { Config } from '~/components/Config'

export function ConfigButton() {
	const [showConfig, setShowConfig] = useState(false)
	const [isMobile, setIsMobile] = useState(false)

	// Handle screen size detection
	useEffect(() => {
		const checkMobile = () => {
			setIsMobile(window.innerWidth < 640)
		}

		checkMobile()
		window.addEventListener('resize', checkMobile)
		return () => window.removeEventListener('resize', checkMobile)
	}, [])

	return (
		<div className="relative">
			<button
				onClick={() => setShowConfig(!showConfig)}
				className="px-4 py-2 
          rounded-full
          font-medium
          text-sm
          bg-gray-100 
          text-gray-700 
          flex items-center justify-center 
          hover:bg-gray-200 hover:text-gray-500 
          transition-all duration-200 
          active:scale-95"
			>
				<svg
					className="w-4 h-4"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
				>
					<path
						d="M12 15a3 3 0 100-6 3 3 0 000 6z"
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
					<path
						d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
				</svg>
			</button>

			{showConfig && (
				<>
					<div
						className="fixed inset-0 bg-black/50 z-40"
						onClick={() => setShowConfig(false)}
					/>

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
              bg-white rounded-2xl shadow-lg border border-gray-200 
              ${isMobile ? 'h-full' : ''}
              overflow-y-auto
            `}
						>
							<div className="sticky top-0 right-0 p-2 flex justify-end bg-white border-b">
								<button
									onClick={() => setShowConfig(false)}
									className="p-2 text-gray-400 hover:text-gray-600"
								>
									✕
								</button>
							</div>
							<div className="p-4">
								<Config />
							</div>
						</div>
					</div>
				</>
			)}
		</div>
	)
} 