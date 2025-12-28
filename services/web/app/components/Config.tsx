import { useEffect, useState } from 'react'

import { useLoaderData } from 'react-router'

import { ApiKeyNotification } from '~/components/ApiKeys/ApiKeyNotification'
import { ProviderKeysManager } from '~/components/ApiKeys/ProviderKeysManager'
import { apiRoutes } from '~/lib/config/routes'
import { ConfigLoaderData } from '~/routes/config'

export function Config() {
	const [removeLikedSongs, setRemoveLikedSongs] = useState(false)
	const [hasApiKeys, setHasApiKeys] = useState(false)
	const [providerStatuses, setProviderStatuses] = useState<
		Array<{ provider: string; hasKey: boolean; isActive: boolean }>
	>([])
	const { user } = useLoaderData<ConfigLoaderData>()

	useEffect(() => {
		if (user?.id) {
			fetchProviderStatuses(user.id)
		}
	}, [user])

	const fetchProviderStatuses = async (userId: string) => {
		try {
			const response = await fetch(`${apiRoutes.llmProvider.statuses}?userId=${userId}`)
			const data = await response.json()
			setProviderStatuses(data.providerStatuses)
			setHasApiKeys(
				data.providerStatuses.some((status: { hasKey: boolean }) => status.hasKey)
			)
		} catch (error) {
			console.error('Failed to fetch provider statuses:', error)
		}
	}

	return (
		<div className="space-y-6">
			{/* API Key Notification */}
			{user?.id && <ApiKeyNotification hasApiKeys={hasApiKeys} />}

			<div className="bg-muted rounded-2xl p-8">
				<h2 className="mb-6 text-lg font-semibold">Configuration</h2>

				<div className="space-y-8">
					{/* Liked Songs Setting */}
					<div className="flex items-center justify-between gap-8">
						<div className="flex-1">
							<h3 className="text-sm font-medium">Remove from Liked Songs</h3>
							<p className="text-muted-foreground/60 mt-1.5 text-xs">
								Automatically remove tracks from your Liked Songs after sorting them into
								playlists
							</p>
						</div>

						{/* Toggle Switch */}
						<div className="relative w-[100px]">
							<div
								className="bg-muted/80 h-9 cursor-pointer rounded-full backdrop-blur-xs"
								onClick={() => setRemoveLikedSongs(!removeLikedSongs)}
							>
								{/* Status indicators */}
								<div className="absolute inset-0 flex items-center justify-between px-3">
									{/* Remove icon */}
									<svg
										className="h-3 w-3 text-rose-400"
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
										className="h-3 w-3 text-emerald-400"
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
									className={`absolute top-1.5 h-6 w-6 rounded-full shadow-sm transition-all duration-300 ${
										removeLikedSongs ?
											'right-1.5 border-2 border-emerald-200 bg-emerald-50'
										:	'left-1.5 border-2 border-rose-200 bg-rose-50'
									} `}
								>
									{/* Dynamic inner content */}
									<div
										className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 ${removeLikedSongs ? 'opacity-100' : 'opacity-0'}`}
									>
										<svg
											className="h-3 w-3 text-emerald-400"
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
										className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 ${!removeLikedSongs ? 'opacity-100' : 'opacity-0'}`}
									>
										<svg
											className="h-3 w-3 text-rose-400"
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
						<div className="border-border border-t pt-6">
							<ProviderKeysManager
								userId={user.id.toString()}
								providerStatuses={providerStatuses}
							/>
						</div>
					)}
				</div>

				<p className="text-muted-foreground/60 mt-8 text-xs">
					Changes are saved automatically
				</p>
			</div>
		</div>
	)
}
