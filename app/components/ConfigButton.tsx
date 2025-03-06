import { useState, useEffect } from 'react'
import { useLoaderData } from '@remix-run/react'
import { ProviderKeysManager } from './ApiKeys/ProviderKeysManager'

type RootLoaderData = {
	isAuthenticated: boolean;
	user: { id: string } | null;
}

export function ConfigButton() {
	const { user } = useLoaderData<RootLoaderData>()
	const [isOpen, setIsOpen] = useState(false)
	const [providerStatuses, setProviderStatuses] = useState([
		{ provider: 'openai', hasKey: false },
		{ provider: 'anthropic', hasKey: false },
		{ provider: 'google', hasKey: false }
	])
	
	function closeModal() {
		setIsOpen(false)
	}

	function openModal() {
		setIsOpen(true)
		// Fetch provider statuses when modal opens
		fetchProviderStatuses()
	}

	// Function to fetch provider statuses
	async function fetchProviderStatuses() {
		if (!user?.id) return

		try {
			const response = await fetch(`/api/llm-provider?action=getProviderStatuses`)
			const data = await response.json()
			
			if (data.providerStatuses) {
				setProviderStatuses(data.providerStatuses)
			}
		} catch (error) {
			console.error('Error fetching provider statuses:', error)
		}
	}

	return (
		<>
			<button
				onClick={openModal}
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

			{isOpen && (
				<>
					{/* Modal backdrop */}
					<div 
						className="fixed inset-0 bg-black/25 z-40"
						onClick={closeModal}
					/>

					{/* Modal content */}
					<div className="fixed inset-0 overflow-y-auto z-50">
						<div className="flex min-h-full items-center justify-center p-4 text-center">
							<div className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
								<h3 className="text-lg font-medium leading-6 text-gray-900">
									Configuration
								</h3>

								<div className="mt-6">
									<div className="space-y-6">
										{/* API Keys Section */}
										<div>
											<h4 className="text-sm font-medium text-gray-900">API Keys</h4>
											<p className="mt-1 text-sm text-gray-500">
												Configure your API keys for language models.
											</p>
											
											<div className="mt-4">
												{user?.id ? (
													<ProviderKeysManager
														userId={user.id}
														providerStatuses={providerStatuses}
													/>
												) : (
													<div className="text-sm text-gray-500 p-4 border border-gray-200 rounded-md">
														Please log in to manage your API keys.
													</div>
												)}
											</div>
										</div>

										{/* Other config sections can be added here */}
									</div>
								</div>

								<div className="mt-6 flex justify-end">
									<button
										type="button"
										className="inline-flex justify-center rounded-md border border-transparent bg-blue-100 px-4 py-2 text-sm font-medium text-blue-900 hover:bg-blue-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
										onClick={closeModal}
									>
										Close
									</button>
								</div>
							</div>
						</div>
					</div>
				</>
			)}
		</>
	)
}