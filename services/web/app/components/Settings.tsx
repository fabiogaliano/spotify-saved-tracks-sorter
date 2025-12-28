import React, { useCallback, useEffect, useRef, useState } from 'react'

import {
	AlertTriangle,
	HelpCircle,
	Key,
	RefreshCw,
	Save,
	Settings,
	Sliders,
	Trash2,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { useFetcher, useLoaderData } from 'react-router'

import { ApiKeyManager } from '~/components/ApiKeys/ApiKeyManager'
import { DashboardLoaderData } from '~/features/dashboard/dashboard.loader.server'
import { apiRoutes } from '~/lib/config/routes'
import { LibrarySyncMode, UserPreferences } from '~/lib/models/User'
import { useNotificationStore } from '~/lib/stores/notificationStore'
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from '~/shared/components/ui/Card'
import { Button } from '~/shared/components/ui/button'
import { Label } from '~/shared/components/ui/label'
import { Slider } from '~/shared/components/ui/slider'
import { Switch } from '~/shared/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/shared/components/ui/tabs'
import type { Enums } from '~/types/database.types'

const SettingsTab = () => {
	const { user } = useLoaderData<DashboardLoaderData>()
	const fetcher = useFetcher()
	const { theme, setTheme } = useTheme()
	const { success, error } = useNotificationStore()

	// State for settings
	const [batchSize, setBatchSize] = useState<number>(5)
	const [isLoading, setIsLoading] = useState(true)
	const [syncMode, setSyncMode] = useState<LibrarySyncMode>('automatic')
	const [darkMode, setDarkMode] = useState(theme === 'dark')
	const [emailNotifications, setEmailNotifications] = useState(false)
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
	const [activeSettingsTab, setActiveSettingsTab] = useState('general')

	// Track initial state to avoid unnecessary saves
	const initialStateRef = useRef<{
		batchSize: number
		syncMode: LibrarySyncMode
		theme: string
	} | null>(null)

	// Debounce timer ref
	const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

	// Load user preferences on mount
	useEffect(() => {
		const loadPreferences = async () => {
			if (!user?.id) return

			try {
				const response = await fetch(apiRoutes.user.preferences)
				if (response.ok) {
					const data = await response.json()
					const preferences = data.preferences
					if (preferences) {
						setBatchSize(preferences.batch_size)
						setSyncMode(preferences.sync_mode)
						if (preferences.theme_preference) {
							setDarkMode(preferences.theme_preference === 'dark')
							// Don't set theme here to avoid conflict
						}

						// Store initial state
						initialStateRef.current = {
							batchSize: preferences.batch_size,
							syncMode: preferences.sync_mode,
							theme: preferences.theme_preference || theme || 'dark',
						}
					}
				}
			} catch (error) {
				console.error('Failed to load preferences:', error)
			} finally {
				setIsLoading(false)
			}
		}

		loadPreferences()
	}, [user?.id])

	// Sync darkMode state with theme
	useEffect(() => {
		setDarkMode(theme === 'dark')
	}, [theme])

	// Get dynamic batch size description
	const getBatchSizeDescription = () => {
		if (batchSize === 1) return 'Slowest but most reliable'
		if (batchSize === 5) return 'Balanced speed and reliability'
		if (batchSize === 10) return 'Maximum speed'
		return 'Balanced speed and reliability'
	}

	// Debounced save settings
	const debouncedSave = useCallback(() => {
		if (!user?.id || !initialStateRef.current) return

		// Clear existing timeout
		if (saveTimeoutRef.current) {
			clearTimeout(saveTimeoutRef.current)
		}

		// Set new timeout
		saveTimeoutRef.current = setTimeout(async () => {
			// Double-check if anything has actually changed before saving
			if (!initialStateRef.current) return

			const currentTheme = darkMode ? 'dark' : 'light'
			const hasChanges =
				batchSize !== initialStateRef.current.batchSize ||
				syncMode !== initialStateRef.current.syncMode ||
				currentTheme !== initialStateRef.current.theme

			if (!hasChanges) {
				return // No changes, don't save
			}
			// Save to localStorage for backward compatibility
			localStorage.setItem('analysisBatchSize', String(batchSize))

			const formData = {
				batchSize,
				syncMode,
				theme: currentTheme as Enums<'theme'>,
			}

			try {
				const response = await fetch(apiRoutes.user.updatePreferences, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify(formData),
				})

				if (response.ok) {
					success('Settings saved successfully')
					// Update initial state after successful save
					initialStateRef.current = {
						batchSize,
						syncMode,
						theme: currentTheme,
					}
				} else {
					error('Failed to save settings')
				}
			} catch (err) {
				error('Failed to save settings')
				console.error('Save error:', err)
			}
		}, 2000) // 2 second delay
	}, [user?.id, batchSize, syncMode, darkMode, success, error])

	// Auto-save on preference changes
	useEffect(() => {
		if (!isLoading && user?.id && initialStateRef.current) {
			// Check if current state matches initial state
			const currentTheme = darkMode ? 'dark' : 'light'
			const hasChanges =
				batchSize !== initialStateRef.current.batchSize ||
				syncMode !== initialStateRef.current.syncMode ||
				currentTheme !== initialStateRef.current.theme

			if (hasChanges) {
				debouncedSave()
			} else {
				// Cancel any pending save if we're back to initial state
				if (saveTimeoutRef.current) {
					clearTimeout(saveTimeoutRef.current)
					saveTimeoutRef.current = null
				}
			}
		}
	}, [batchSize, syncMode, darkMode, isLoading, debouncedSave])

	// Handle theme change
	const handleThemeChange = (checked: boolean) => {
		const newTheme = checked ? 'dark' : 'light'
		setTheme(newTheme)
		setDarkMode(checked)
	}

	// Handle batch size change - snap to valid values
	const handleBatchSizeChange = (value: number[]) => {
		const val = value[0]
		// Snap to nearest valid value: 1, 5, or 10
		let snappedValue: number
		if (val <= 3) {
			snappedValue = 1
		} else if (val <= 7) {
			snappedValue = 5
		} else {
			snappedValue = 10
		}
		setBatchSize(snappedValue)
	}

	// Handle account deletion
	const handleDeleteAccount = () => {
		success('Account scheduled for deletion. You will receive a confirmation email.')
		setShowDeleteConfirm(false)
	}

	return (
		<div className="flex h-full flex-col space-y-6">
			{/* Header */}
			<div>
				<h1 className="text-foreground mb-1 text-2xl font-bold">Settings</h1>
				<p className="text-foreground">
					Customize your app preferences and manage your account
				</p>
			</div>

			{/* Settings Tabs */}
			<div className="flex flex-col">
				<Tabs
					defaultValue="general"
					value={activeSettingsTab}
					onValueChange={setActiveSettingsTab}
					className="w-full"
				>
					<TabsList className="bg-card/50 border-border h-auto w-full justify-start rounded-none border-b px-0">
						<TabsTrigger
							value="general"
							className="data-[state=active]:text-foreground text-muted-foreground hover:text-foreground rounded-none px-4 py-2 data-[state=active]:border-b-2 data-[state=active]:border-green-500 data-[state=active]:bg-transparent"
						>
							General
						</TabsTrigger>
						<TabsTrigger
							value="api"
							className="data-[state=active]:text-foreground text-muted-foreground hover:text-foreground rounded-none px-4 py-2 data-[state=active]:border-b-2 data-[state=active]:border-green-500 data-[state=active]:bg-transparent"
						>
							API Keys
						</TabsTrigger>
						<TabsTrigger
							value="account"
							className="data-[state=active]:text-foreground text-muted-foreground hover:text-foreground rounded-none px-4 py-2 data-[state=active]:border-b-2 data-[state=active]:border-green-500 data-[state=active]:bg-transparent"
						>
							Account
						</TabsTrigger>
					</TabsList>

					{/* General Settings */}
					<TabsContent value="general" className="mt-6 space-y-6">
						<Card className="bg-card border-border">
							<CardHeader className="border-border border-b pb-2">
								<CardTitle className="text-foreground flex items-center gap-2 text-lg">
									<div className="rounded-md bg-green-500/20 p-1.5">
										<Sliders className="h-5 w-5 text-green-400" />
									</div>
									<span className="font-bold">App Preferences</span>
								</CardTitle>
							</CardHeader>

							<CardContent className="space-y-6 p-6">
								{/* Batch Size Setting */}
								<div className="space-y-2">
									<div className="flex justify-between">
										<Label
											htmlFor="batchSize"
											className="text-foreground text-lg font-normal"
										>
											Batch Size: {batchSize} {batchSize === 1 ? 'song' : 'songs'}
										</Label>
										<span className="text-foreground">{getBatchSizeDescription()}</span>
									</div>
									<div className="py-2">
										<div className="relative">
											<Slider
												id="batchSize"
												min={0}
												max={2}
												step={1}
												value={[
													batchSize === 1 ? 0
													: batchSize === 5 ? 1
													: 2,
												]}
												onValueChange={value => {
													const mappedValue =
														value[0] === 0 ? 1
														: value[0] === 1 ? 5
														: 10
													setBatchSize(mappedValue)
												}}
												className="h-2 cursor-pointer"
											/>
											<div className="text-muted-foreground mt-3 flex justify-between text-xs">
												<button
													onClick={() => setBatchSize(1)}
													className="hover:text-foreground cursor-pointer px-1 transition-colors"
												>
													1
												</button>
												<button
													onClick={() => setBatchSize(5)}
													className="hover:text-foreground cursor-pointer px-1 transition-colors"
												>
													5
												</button>
												<button
													onClick={() => setBatchSize(10)}
													className="hover:text-foreground cursor-pointer px-1 transition-colors"
												>
													10
												</button>
											</div>
										</div>
									</div>
									<p className="text-foreground mt-1">
										Controls how many songs are analyzed simultaneously. Larger batches
										are faster but may use more API credits.
									</p>
								</div>

								{/* Library Sync Setting */}
								<div className="border-border space-y-2 border-t pt-6">
									<Label
										htmlFor="syncMode"
										className="text-foreground mb-2 block text-lg font-normal"
									>
										Library Sync
									</Label>
									<div className="grid grid-cols-2 gap-2">
										<Button
											onClick={() => setSyncMode('manual')}
											className={
												syncMode === 'manual' ?
													'bg-primary text-primary-foreground cursor-default rounded-md border-none text-center font-normal'
												:	'bg-secondary text-secondary-foreground border-border hover:bg-secondary/80 hover:text-foreground cursor-pointer rounded-md border text-center font-normal transition-all'
											}
										>
											Manual
										</Button>
										<Button
											onClick={() => setSyncMode('automatic')}
											className={
												syncMode === 'automatic' ?
													'bg-primary text-primary-foreground cursor-default rounded-md border-none text-center font-normal'
												:	'bg-secondary text-secondary-foreground border-border hover:bg-secondary/80 hover:text-foreground cursor-pointer rounded-md border text-center font-normal transition-all'
											}
										>
											Automatic
										</Button>
									</div>
									<p className="text-foreground mt-2">
										Choose whether to sync your Spotify library automatically when you
										login.
									</p>
								</div>

								{/* Theme Setting */}
								<div className="border-border flex items-center justify-between border-t pt-6">
									<div className="space-y-0.5">
										<h3 className="text-foreground text-lg font-normal">Dark Mode</h3>
										<p className="text-foreground">
											Switch between light and dark themes
										</p>
									</div>
									<Switch
										checked={darkMode}
										onCheckedChange={handleThemeChange}
										className="data-[state=checked]:bg-primary cursor-pointer"
									/>
								</div>

								{/* Notification Setting */}
								<div className="border-border flex items-center justify-between border-t pt-6">
									<div className="space-y-0.5">
										<h3 className="text-foreground text-lg font-normal">
											Email Notifications
										</h3>
										<p className="text-foreground">
											Receive updates about your library and new features
										</p>
									</div>
									<Switch
										checked={emailNotifications}
										onCheckedChange={setEmailNotifications}
										className="data-[state=checked]:bg-primary cursor-pointer"
									/>
								</div>
							</CardContent>

							<CardFooter className="border-border border-t px-6 py-4">
								<p className="text-muted-foreground text-xs">
									Changes are saved automatically
								</p>
							</CardFooter>
						</Card>
					</TabsContent>

					{/* API Keys Settings */}
					<TabsContent value="api" className="mt-6">
						<Card className="bg-card border-border">
							<CardHeader className="border-border border-b pb-2">
								<CardTitle className="text-foreground flex items-center gap-2 text-lg">
									<div className="rounded-md bg-blue-500/20 p-1.5">
										<Key className="h-5 w-5 text-blue-400" />
									</div>
									<span className="font-bold">AI Provider Settings</span>
								</CardTitle>
							</CardHeader>

							<CardContent className="p-6">
								<div className="space-y-6">
									<div className="text-foreground space-y-1">
										<p>
											sort. uses AI services to analyze your music's lyrics, mood, and
											themes. Provide an API key from one of our supported providers.
										</p>
										<p>
											Your API key is stored securely and only used for analyzing your
											music.
										</p>
									</div>

									<ApiKeyManager autoSetActive={true} />

									<div className="text-foreground rounded-lg border border-blue-800 bg-blue-900/20 p-4">
										<div className="flex items-start gap-2">
											<HelpCircle className="mt-0.5 h-5 w-5 shrink-0 text-blue-400" />
											<div>
												<p className="mb-1 font-medium">Need a free API key?</p>
												<p>
													Google AI Studio offers free keys with generous limits.
													<a
														href="https://aistudio.google.com/welcome"
														target="_blank"
														rel="noopener noreferrer"
														className="ml-1 text-blue-400 hover:underline"
													>
														Sign up here
													</a>
												</p>
											</div>
										</div>
									</div>
								</div>
							</CardContent>
						</Card>
					</TabsContent>

					{/* Account Settings */}
					<TabsContent value="account" className="mt-6 space-y-6">
						<Card className="bg-card border-border">
							<CardHeader className="border-border border-b pb-2">
								<CardTitle className="text-foreground flex items-center gap-2 text-lg">
									<div className="rounded-md bg-purple-500/20 p-1.5">
										<Settings className="h-5 w-5 text-purple-400" />
									</div>
									<span className="font-bold">Account Management</span>
								</CardTitle>
							</CardHeader>

							<CardContent className="space-y-6 p-6">
								<div className="bg-card border-border rounded-lg border p-5">
									<div className="flex items-center gap-4">
										<div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-500/30">
											<div className="text-foreground flex h-10 w-10 items-center justify-center rounded-full bg-green-500 text-lg font-bold">
												JD
											</div>
										</div>
										<div>
											<h3 className="text-foreground text-lg font-semibold">John Doe</h3>
											<p className="text-foreground">Connected with Spotify Premium</p>
										</div>
									</div>
								</div>

								{/* Delete Account */}
								<div className="border-border border-t pt-5">
									<h3 className="text-foreground mb-3 text-lg font-normal">
										Danger Zone
									</h3>

									{showDeleteConfirm ?
										<div className="space-y-3 rounded-lg border border-red-800 bg-red-900/30 p-4">
											<div className="text-foreground flex items-center gap-2">
												<AlertTriangle className="h-5 w-5 text-red-400" />
												<span className="font-medium">
													Are you sure you want to delete your account?
												</span>
											</div>
											<p className="text-foreground">
												This action cannot be undone. All your data will be permanently
												removed.
											</p>
											<div className="flex justify-end gap-3 pt-2">
												<Button
													className="bg-secondary hover:bg-secondary/80 text-secondary-foreground border-0"
													onClick={() => setShowDeleteConfirm(false)}
												>
													Cancel
												</Button>
												<Button
													className="bg-destructive hover:bg-destructive/90 text-destructive-foreground border-0"
													onClick={handleDeleteAccount}
												>
													Confirm Delete
												</Button>
											</div>
										</div>
									:	<Button
											className="border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive w-full justify-between border bg-transparent"
											onClick={() => setShowDeleteConfirm(true)}
										>
											<span className="flex items-center gap-2">
												<Trash2 className="h-4 w-4" />
												Delete Account
											</span>
											<span>→</span>
										</Button>
									}
								</div>
							</CardContent>
						</Card>
					</TabsContent>
				</Tabs>
			</div>
		</div>
	)
}

export default SettingsTab
