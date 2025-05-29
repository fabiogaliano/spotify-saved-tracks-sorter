import { useState, useEffect } from 'react'
import { Form, useActionData, useNavigation, useSubmit } from 'react-router';
import { Notification, type NotificationType } from '~/components/common/Notification'

type ProviderStatus = {
	provider: string
	hasKey: boolean
	isActive?: boolean
}

type ProviderKeysManagerProps = {
	userId: string
	providerStatuses: ProviderStatus[]
}

export function ProviderKeysManager({
	userId,
	providerStatuses,
}: ProviderKeysManagerProps) {
	const actionData = useActionData<{ success?: boolean; error?: string }>()
	const navigation = useNavigation()
	const submit = useSubmit()
	const [activeProvider, setActiveProvider] = useState<string | null>(null)
	const [apiKey, setApiKey] = useState('')
	const [showApiKey, setShowApiKey] = useState(false)
	const [localProviderStatuses, setLocalProviderStatuses] =
		useState<ProviderStatus[]>(providerStatuses)

	// Initialize local state from props
	useEffect(() => {
		setLocalProviderStatuses(providerStatuses)
	}, [providerStatuses])

	// Reset form when provider changes
	useEffect(() => {
		setApiKey('')
		setShowApiKey(false)
	}, [activeProvider])

	// Get provider display name
	const getProviderDisplayName = (provider: string) => {
		switch (provider) {
			case 'openai':
				return 'OpenAI'
			case 'anthropic':
				return 'Anthropic'
			case 'google':
				return 'Google'
			default:
				return provider
		}
	}

	// Get provider logo/icon
	const getProviderIcon = (provider: string) => {
		switch (provider) {
			case 'openai':
				return (
					<svg
						className="w-5 h-5 text-muted-foreground/70"
						viewBox="0 0 24 24"
						fill="none"
						xmlns="http://www.w3.org/2000/svg"
					>
						<path
							d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.5091-2.6067-1.4997z"
							fill="currentColor"
						/>
					</svg>
				)
			case 'anthropic':
				return (
					<svg
						className="w-5 h-5 text-muted-foreground/70"
						viewBox="0 0 24 24"
						fill="none"
						xmlns="http://www.w3.org/2000/svg"
					>
						<path
							d="M13.827 3.52h3.603L24 20h-3.603l-6.57-16.48zm-7.258 0h3.767L16.906 20h-3.674l-1.343-3.461H5.017l-1.344 3.46H0L6.57 3.522zm4.132 9.959L8.453 7.687 6.205 13.48H10.7z"
							fill="currentColor"
						/>
					</svg>
				)
			case 'google':
				return (
					<svg
						className="w-5 h-5 text-muted-foreground/70"
						viewBox="0 0 24 24"
						fill="none"
						xmlns="http://www.w3.org/2000/svg"
					>
						<path
							d="M23 12.245c0-.905-.075-1.565-.236-2.25h-10.54v4.083h6.186c-.124 1.014-.797 2.542-2.294 3.569l-.021.136 3.332 2.53.23.022C21.779 18.417 23 15.593 23 12.245z"
							fill="currentColor"
						/>
						<path
							d="M12.225 23c3.03 0 5.574-.978 7.433-2.665l-3.542-2.688c-.948.648-2.22 1.1-3.891 1.1a6.745 6.745 0 01-6.386-4.572l-.132.011-3.465 2.628-.045.124C4.043 20.531 7.835 23 12.225 23z"
							fill="currentColor"
						/>
						<path
							d="M5.84 14.175A6.65 6.65 0 015.463 12c0-.758.138-1.491.361-2.175l-.006-.147-3.508-2.67-.115.054A10.831 10.831 0 001 12c0 1.772.436 3.447 1.197 4.938l3.642-2.763z"
							fill="currentColor"
						/>
						<path
							d="M12.225 5.253c2.108 0 3.529.892 4.34 1.638l3.167-3.031C17.787 2.088 15.255 1 12.225 1 7.834 1 4.043 3.469 2.197 7.062l3.63 2.763a6.77 6.77 0 016.398-4.572z"
							fill="currentColor"
						/>
					</svg>
				)
			default:
				return null
		}
	}

	// Handle form submission

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()

		if (!activeProvider || !apiKey.trim()) return

		const formData = new FormData()
		formData.append('action', 'saveKey')
		formData.append('provider', activeProvider)
		formData.append('apiKey', apiKey)

		try {
			setLoading('saving')

			const response = await fetch('/api/llm-provider', {
				method: 'POST',
				body: formData,
			})

			const data = await response.json()

			if (response.ok) {
				// Update local state to reflect the saved API key
				setLocalProviderStatuses(prevStatuses => {
					return prevStatuses.map(status => {
						if (status.provider === activeProvider) {
							return { ...status, hasKey: true }
						}
						return status
					})
				})

				setLoading(null) // Reset loading state

				// Check if this is the first API key being added
				const hasAnyActiveProvider = localProviderStatuses.some(s => s.isActive)
				const isFirstKey = !localProviderStatuses.some(
					s => s.hasKey && s.provider !== activeProvider
				)

				// If this is the first key or there's no active provider, automatically set it as active
				if (!hasAnyActiveProvider || isFirstKey) {
					// Set as active in local state immediately
					setLocalProviderStatuses(prevStatuses => {
						return prevStatuses.map(status => ({
							...status,
							isActive: status.provider === activeProvider,
						}))
					})

					// Also update in the backend
					const activeFormData = new FormData()
					activeFormData.append('action', 'setActiveProvider')
					activeFormData.append('provider', activeProvider)

					fetch('/api/llm-provider', {
						method: 'POST',
						body: activeFormData,
					}).catch(error => {
						console.error('Error setting new key as active provider:', error)
					})

					setNotification({
						type: 'success',
						message: `${getProviderDisplayName(
							activeProvider
						)} API key saved and set as active`,
					})
				} else {
					setNotification({
						type: 'success',
						message:
							data.message ||
							`${getProviderDisplayName(activeProvider)} API key saved successfully`,
					})
				}

				// Close the form after successful save
				setActiveProvider(null)
			} else {
				console.error('Error saving API key:', data)
				setLoading(null) // Reset loading state
				setNotification({
					type: 'error',
					message: data.details || data.error || 'Failed to save API key',
				})
			}
		} catch (error) {
			console.error('Error saving API key:', error)
			setLoading(null) // Reset loading state
			setNotification({
				type: 'error',
				message: `Failed to save ${getProviderDisplayName(activeProvider)} API key`,
			})
		}
	}

	// Handle setting active provider
	const handleSetActiveProvider = async (provider: string) => {
		const formData = new FormData()
		formData.append('action', 'setActiveProvider')
		formData.append('provider', provider)

		try {
			setLoading('setting')

			const response = await fetch('/api/llm-provider', {
				method: 'POST',
				body: formData,
			})

			const data = await response.json()

			if (response.ok) {
				// Update local state to reflect the new active provider
				setLocalProviderStatuses(prevStatuses => {
					return prevStatuses.map(status => ({
						...status,
						isActive: status.provider === provider,
					}))
				})

				setLoading(null) // Reset loading state
				setNotification({
					type: 'success',
					message:
						data.message || `${getProviderDisplayName(provider)} set as active provider`,
				})
			} else {
				console.error('Error setting active provider:', data)
				setLoading(null) // Reset loading state
				setNotification({
					type: 'error',
					message: data.details || data.error || 'Failed to set active provider',
				})
			}
		} catch (error) {
			console.error('Error setting active provider:', error)
			setLoading(null) // Reset loading state
			setNotification({
				type: 'error',
				message: `Failed to set ${getProviderDisplayName(provider)} as active provider`,
			})
		}
	}

	// Handle delete key
	const handleDeleteKey = async (provider: string) => {
		if (
			!confirm(
				`Are you sure you want to remove the ${getProviderDisplayName(provider)} API key?`
			)
		) {
			return
		}

		const formData = new FormData()
		formData.append('action', 'deleteKey')
		formData.append('provider', provider)

		try {
			setLoading('removing')

			const response = await fetch('/api/llm-provider', {
				method: 'POST',
				body: formData,
			})

			const data = await response.json()

			if (response.ok) {
				// Check if the deleted provider was active
				const wasActive = localProviderStatuses.find(
					s => s.provider === provider
				)?.isActive

				// Update local state to reflect the removed API key
				setLocalProviderStatuses(prevStatuses => {
					const updatedStatuses = prevStatuses.map(status => {
						if (status.provider === provider) {
							return { ...status, hasKey: false, isActive: false }
						}
						return status
					})

					// If the deleted provider was active, find another provider with a key to set as active
					if (wasActive) {
						const remainingWithKey = updatedStatuses.find(
							s => s.hasKey && s.provider !== provider
						)
						if (remainingWithKey) {
							// Set the first remaining provider with a key as active
							return updatedStatuses.map(status => ({
								...status,
								isActive: status.provider === remainingWithKey.provider,
							}))
						}
					}

					return updatedStatuses
				})

				setLoading(null) // Reset loading state
				// If the deleted provider was active, automatically set the remaining provider as active in the backend
				if (wasActive) {
					const remainingWithKey = localProviderStatuses.find(
						s => s.hasKey && s.provider !== provider
					)
					if (remainingWithKey) {
						// Call the API to set the new active provider
						const newActiveProvider = remainingWithKey.provider
						const formData = new FormData()
						formData.append('action', 'setActiveProvider')
						formData.append('provider', newActiveProvider)

						fetch('/api/llm-provider', {
							method: 'POST',
							body: formData,
						})
							.then(response => response.json())
							.then(data => {
								if (response.ok) {
									setNotification({
										type: 'success',
										message: `${getProviderDisplayName(
											provider
										)} API key removed and ${getProviderDisplayName(
											newActiveProvider
										)} set as active`,
									})
								}
							})
							.catch(error => {
								console.error('Error setting new active provider:', error)
							})
					} else {
						setNotification({
							type: 'success',
							message:
								data.message ||
								`${getProviderDisplayName(provider)} API key removed successfully`,
						})
					}
				} else {
					setNotification({
						type: 'success',
						message:
							data.message ||
							`${getProviderDisplayName(provider)} API key removed successfully`,
					})
				}

				// Close the form if the deleted provider was active
				if (activeProvider === provider) {
					setActiveProvider(null)
				}
			} else {
				console.error('Error removing API key:', data)
				setLoading(null) // Reset loading state
				setNotification({
					type: 'error',
					message: data.details || data.error || 'Failed to remove API key',
				})
			}
		} catch (error) {
			console.error('Error removing API key:', error)
			setLoading(null) // Reset loading state
			setNotification({
				type: 'error',
				message: `Failed to remove ${getProviderDisplayName(provider)} API key`,
			})
		}
	}

	// Validate API key before saving
	const validateApiKey = async (provider: string, key: string) => {
		const formData = new FormData()
		formData.append('provider', provider)
		formData.append('apiKey', key)

		try {
			const response = await fetch('/api/provider-keys/validate', {
				method: 'POST',
				body: formData,
			})
			const data = await response.json()
			return data.isValid
		} catch (error) {
			console.error('Error validating API key:', error)
			return false
		}
	}

	// Notification state
	const [notification, setNotification] = useState<{
		type: NotificationType
		message: string
	} | null>(null)

	// Loading state
	const [loading, setLoading] = useState<string | null>(null)

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-4">
				<h3 className="text-sm font-medium">API Keys</h3>
				<p className="text-xs text-muted-foreground/60">
					Add your own API keys for language models to use in the application.
				</p>
				{notification && (
					<div className="mt-2">
						<Notification
							type={notification.type}
							message={notification.message}
							onClose={() => setNotification(null)}
						/>
					</div>
				)}

				{/* Provider cards - vertical layout */}
				<div className="flex flex-col gap-4 mt-2">
					{localProviderStatuses.map(status => (
						<div key={status.provider} className="flex flex-col">
							{/* Provider header */}
							<div
								className={`
                  p-3 transition-all border
                  ${
										status.hasKey
											? 'bg-blue-50/50 border-blue-200'
											: 'bg-muted border-border hover:border-gray-300'
									}
                  ${activeProvider === status.provider ? 'rounded-t-xl' : 'rounded-xl'}
                  cursor-pointer
                `}
								onClick={() =>
									setActiveProvider(
										activeProvider === status.provider ? null : status.provider
									)
								}
							>
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-3">
										<div className={`text-${status.hasKey ? 'blue' : 'gray'}-600`}>
											{getProviderIcon(status.provider)}
										</div>
										<span className="font-medium text-sm">
											{getProviderDisplayName(status.provider)}
										</span>
									</div>
									{status.hasKey && (
										<div className="flex items-center gap-2">
											{status.isActive ? (
												<span className="inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-medium bg-green-100 text-green-800">
													Active
												</span>
											) : (
												<button
													type="button"
													onClick={e => {
														e.stopPropagation()
														handleSetActiveProvider(status.provider)
													}}
													className="inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100"
													disabled={loading !== null}
												>
													{loading === 'setting' && status.provider === activeProvider ? (
														<span className="flex items-center">
															<svg
																className="animate-spin -ml-1 mr-1 h-3 w-3 text-blue-700"
																xmlns="http://www.w3.org/2000/svg"
																fill="none"
																viewBox="0 0 24 24"
															>
																<circle
																	className="opacity-25"
																	cx="12"
																	cy="12"
																	r="10"
																	stroke="currentColor"
																	strokeWidth="4"
																></circle>
																<path
																	className="opacity-75"
																	fill="currentColor"
																	d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
																></path>
															</svg>
															Setting...
														</span>
													) : (
														'Set Active'
													)}
												</button>
											)}
										</div>
									)}
								</div>
							</div>

							{/* API Key Form - appears directly under the provider when active */}
							{activeProvider === status.provider && (
								<div className="p-4 border border-blue-200 border-t-0 bg-white rounded-b-xl">
									<Form
										method="post"
										onSubmit={async e => {
											e.preventDefault()

											if (!activeProvider || !apiKey.trim()) return

											// Validate key before saving
											setLoading('validating')

											try {
												const isValid = await validateApiKey(activeProvider, apiKey)

												if (isValid) {
													// If valid, proceed with saving
													handleSubmit(e)
												} else {
													setLoading(null) // Reset loading state
													setNotification({
														type: 'error',
														message: `Invalid ${getProviderDisplayName(
															activeProvider
														)} API key. Please check your key and try again.`,
													})
												}
											} catch (error) {
												console.error('Error validating API key:', error)
												setLoading(null) // Reset loading state
												setNotification({
													type: 'error',
													message: `Error validating ${getProviderDisplayName(
														activeProvider
													)} API key`,
												})
											}
										}}
									>
										<div className="space-y-4">
											<div>
												<label
													htmlFor="apiKey"
													className="block text-xs font-medium text-muted-foreground/50 mb-1"
												>
													API Key
												</label>
												<div className="relative">
													<input
														type={showApiKey ? 'text' : 'password'}
														id="apiKey"
														name="apiKey"
														value={apiKey}
														onChange={e => setApiKey(e.target.value)}
														className="block w-full rounded-md border-gray-300 shadow-xs focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
														placeholder={`Enter your ${getProviderDisplayName(
															activeProvider
														)} API key`}
														required
													/>
													<button
														type="button"
														className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-muted-foreground/60"
														onClick={() => setShowApiKey(!showApiKey)}
													>
														{showApiKey ? (
															<svg
																className="h-5 w-5"
																fill="none"
																viewBox="0 0 24 24"
																stroke="currentColor"
															>
																<path
																	strokeLinecap="round"
																	strokeLinejoin="round"
																	strokeWidth={2}
																	d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
																/>
															</svg>
														) : (
															<svg
																className="h-5 w-5"
																fill="none"
																viewBox="0 0 24 24"
																stroke="currentColor"
															>
																<path
																	strokeLinecap="round"
																	strokeLinejoin="round"
																	strokeWidth={2}
																	d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
																/>
																<path
																	strokeLinecap="round"
																	strokeLinejoin="round"
																	strokeWidth={2}
																	d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
																/>
															</svg>
														)}
													</button>
												</div>
												<p className="mt-1 text-xs text-muted-foreground/70">
													Your API key is encrypted before being stored and never shared.
												</p>
											</div>

											<div className="flex justify-between">
												{status.hasKey && (
													<button
														type="button"
														className="text-xs text-rose-600 hover:text-rose-800 transition-colors inline-flex items-center"
														disabled={loading !== null}
														onClick={e => {
															e.stopPropagation()
															handleDeleteKey(status.provider)
														}}
													>
														{loading === 'removing' &&
														status.provider === activeProvider ? (
															<span className="flex items-center">
																<svg
																	className="animate-spin -ml-1 mr-1 h-3 w-3 text-rose-600"
																	xmlns="http://www.w3.org/2000/svg"
																	fill="none"
																	viewBox="0 0 24 24"
																>
																	<circle
																		className="opacity-25"
																		cx="12"
																		cy="12"
																		r="10"
																		stroke="currentColor"
																		strokeWidth="4"
																	></circle>
																	<path
																		className="opacity-75"
																		fill="currentColor"
																		d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
																	></path>
																</svg>
																Removing...
															</span>
														) : (
															'Remove Key'
														)}
													</button>
												)}
												<div className={status.hasKey ? '' : 'ml-auto'}>
													<button
														type="submit"
														disabled={navigation.state === 'submitting' || !apiKey.trim()}
														className={`
                              inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm
                              text-foreground bg-blue-600 hover:bg-blue-700 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                              ${
																navigation.state === 'submitting' ||
																!apiKey.trim() ||
																loading !== null
																	? 'opacity-75 cursor-not-allowed'
																	: ''
															}
                            `}
													>
														{navigation.state === 'submitting' ||
														loading === 'saving' ||
														loading === 'validating' ? (
															<span className="flex items-center">
																<svg
																	className="animate-spin -ml-1 mr-2 h-4 w-4 text-foreground"
																	xmlns="http://www.w3.org/2000/svg"
																	fill="none"
																	viewBox="0 0 24 24"
																>
																	<circle
																		className="opacity-25"
																		cx="12"
																		cy="12"
																		r="10"
																		stroke="currentColor"
																		strokeWidth="4"
																	></circle>
																	<path
																		className="opacity-75"
																		fill="currentColor"
																		d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
																	></path>
																</svg>
																{loading === 'validating' ? 'Validating...' : 'Saving...'}
															</span>
														) : (
															'Save API Key'
														)}
													</button>
												</div>
											</div>
										</div>
									</Form>
								</div>
							)}
						</div>
					))}
				</div>
			</div>
		</div>
	)
}
