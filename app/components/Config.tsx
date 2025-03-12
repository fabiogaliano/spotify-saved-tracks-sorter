import { useState, useEffect } from 'react'
import { useLoaderData } from '@remix-run/react'
import { ProviderKeysManager } from '~/components/ApiKeys/ProviderKeysManager'
import { ApiKeyNotification } from '~/components/ApiKeys/ApiKeyNotification'
import { ConfigLoaderData } from '~/routes/config'

export function Config() {
	const [removeLikedSongs, setRemoveLikedSongs] = useState(false)
	const [hasApiKeys, setHasApiKeys] = useState(false)
	const [providerStatuses, setProviderStatuses] = useState([])
	const { user } = useLoaderData<ConfigLoaderData>()

	useEffect(() => {
		if (user?.id) {
			fetchProviderStatuses(user.id)
		}
	}, [user])

	const fetchProviderStatuses = async (userId: string) => {
		try {
			const response = await fetch(`/api/provider-keys/statuses?userId=${userId}`)
			const data = await response.json()
			setProviderStatuses(data.providerStatuses)
			setHasApiKeys(data.providerStatuses.some(status => status.hasKey))
		} catch (error) {
			console.error('Failed to fetch provider statuses:', error)
		}
	}

	return (
		<div className="space-y-6">
			{/* API Key Notification */}
			{user?.id && <ApiKeyNotification hasApiKeys={hasApiKeys} />}

			<div className="bg-gray-50 rounded-2xl p-8">
				<h2 className="text-lg font-semibold mb-6">Configuration</h2>

				<div className="space-y-8">
					{/* Liked Songs Setting */}
					<div className="flex items-center justify-between gap-8">
						<div className="flex-1">
							<h3 className="text-sm font-medium">Remove from Liked Songs</h3>
							<p className="text-xs text-gray-600 mt-1.5">
								Automatically remove tracks from your Liked Songs after sorting them into
								playlists
							</p>
						</div>

						{/* Toggle Switch */}
						<div className="relative w-[100px]">
							<div
								className="h-9 rounded-full bg-gray-100/80 cursor-pointer backdrop-blur-xs"
								onClick={() => setRemoveLikedSongs(!removeLikedSongs)}
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
										<path
											d="M18 6L6 18M6 6l12 12"
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
										<path
											d="M12 4v16m8-8H4"
											strokeLinecap="round"
											strokeLinejoin="round"
										/>
									</svg>
								</div>

								{/* Sliding button */}
								<div
									className={`absolute top-1.5 w-6 h-6 rounded-full shadow-sm transition-all duration-300
										${
											removeLikedSongs
												? 'right-1.5 bg-emerald-50 border-2 border-emerald-200'
												: 'left-1.5 bg-rose-50 border-2 border-rose-200'
										}
									`}
								>
									{/* Dynamic inner content */}
									<div
										className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200
										${removeLikedSongs ? 'opacity-100' : 'opacity-0'}`}
									>
										<svg
											className="w-3 h-3 text-emerald-400"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											strokeWidth="2"
										>
											<path
												d="M12 4v16m8-8H4"
												strokeLinecap="round"
												strokeLinejoin="round"
											/>
										</svg>
									</div>
									<div
										className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200
										${!removeLikedSongs ? 'opacity-100' : 'opacity-0'}`}
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
								</div>
							</div>
						</div>
					</div>

					{/* API Key Management */}
					{user?.id && (
						<div className="pt-6 border-t border-gray-200">
							<ProviderKeysManager
								userId={user.id.toString()}
								providerStatuses={providerStatuses}
							/>
						</div>
					)}
				</div>

				<p className="text-xs text-gray-600 mt-8">Changes are saved automatically</p>
			</div>
		</div>
	)
}

