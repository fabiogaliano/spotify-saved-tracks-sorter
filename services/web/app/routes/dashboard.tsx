import { ComponentProps, Suspense, useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import { Await, useLoaderData, useNavigation } from 'react-router'

import SettingsTab from '~/components/Settings'
import {
	AnalysisStats,
	LibraryStatus,
	QuickActions,
	RecentActivity,
} from '~/features/dashboard'
import { DashboardLoaderData, loader } from '~/features/dashboard/dashboard.loader.server'
import { LikedSongsTable } from '~/features/liked-songs-management/LikedSongsTable'
import MatchingPage from '~/features/matching/MatchingPage'
import PlaylistManagement from '~/features/playlist-management/components/PlaylistManagement'
import { apiRoutes } from '~/lib/config/routes'
import { Header } from '~/shared/components/Header'
import { Card, CardContent } from '~/shared/components/ui/Card'
import { LoadingSpinner } from '~/shared/components/ui/LoadingSpinner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/shared/components/ui/tabs'

export { loader }
type LoadedTabs = {
	[key: string]: boolean
}

const DashboardTab = ({ value, ...props }: ComponentProps<typeof TabsTrigger>) => {
	const formatDisplayText = (val: string) => {
		if (val === 'likedsongs') return 'Liked Songs Analysis'
		if (val === 'matching') return 'Match Songs to Playlists'
		return val.charAt(0).toUpperCase() + val.slice(1)
	}

	return (
		<TabsTrigger
			value={value}
			className="data-[state=active]:text-foreground text-muted-foreground hover:text-foreground rounded-none px-4 py-2 data-[state=active]:border-b-2 data-[state=active]:border-green-500 data-[state=active]:bg-transparent"
			{...props}
		>
			{formatDisplayText(value)}
		</TabsTrigger>
	)
}

const LoadingFallback = () => (
	<div className="flex h-64 items-center justify-center">
		<LoadingSpinner className="h-8 w-8 text-green-500" />
		<span className="text-muted-foreground ml-2">Loading data...</span>
	</div>
)

const AwaitError = ({ message }: { message: string }) => (
	<Card className="bg-destructive/10 border-destructive">
		<CardContent className="p-6 text-center">
			<p className="text-destructive mb-4">{message}</p>
			<button
				onClick={() => window.location.reload()}
				className="bg-destructive/20 hover:bg-destructive/30 text-destructive rounded-md px-4 py-2 transition-colors"
			>
				Retry
			</button>
		</CardContent>
	</Card>
)

const MatchingWrapper = ({ userId }: { userId: number }) => {
	const { data, isLoading, error } = useQuery({
		queryKey: ['dashboard-matching-data', userId],
		queryFn: async () => {
			const response = await fetch(apiRoutes.matching.data(userId.toString()))
			if (!response.ok) {
				throw new Error('Failed to fetch matching data')
			}
			return response.json()
		},
		staleTime: 5 * 60 * 1000, // 5 minutes
	})

	if (isLoading) {
		return <LoadingFallback />
	}

	if (error) {
		return (
			<div className="flex h-64 items-center justify-center">
				<div className="text-center">
					<p className="text-muted-foreground">Failed to load matching data</p>
					<p className="text-muted-foreground mt-1 text-sm">
						Please try refreshing the page
					</p>
				</div>
			</div>
		)
	}

	return <MatchingPage playlists={data?.playlists || []} tracks={data?.tracks || []} />
}

const Dashboard = () => {
	const { user, likedSongs, playlists } = useLoaderData<DashboardLoaderData>()
	const navigation = useNavigation()
	const isLoading = navigation.state === 'loading'
	const [activeTab, setActiveTab] = useState('overview')
	const [loadedTabs, setLoadedTabs] = useState<LoadedTabs>({
		overview: true, // only the default tab is loaded initially
	})

	const handleTabChange = (value: string) => {
		setActiveTab(value)

		if (!loadedTabs[value]) {
			setLoadedTabs(prev => ({
				...prev,
				[value]: true,
			}))
		}
	}

	return (
		<>
			{isLoading && (
				<div className="bg-background/70 fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm">
					<div className="bg-card flex max-w-md flex-col items-center rounded-lg p-8 shadow-xl">
						<LoadingSpinner className="mb-4 h-12 w-12 text-green-500" />
						<h2 className="text-foreground mb-2 text-xl font-bold">
							Loading your library
						</h2>
						<p className="text-muted-foreground text-center">
							Please wait while we prepare your dashboard...
						</p>
					</div>
				</div>
			)}
			<div className="bg-theme-gradient text-foreground min-h-screen p-4 md:p-6">
				<div className="container mx-auto max-w-7xl">
					{/* Header */}
					<Header userName={user.spotify.name} image={user.spotify.image} />

					{/* Tabs Navigation */}
					<Tabs value={activeTab} onValueChange={handleTabChange} className="mb-6 w-full">
						<TabsList className="bg-card/50 border-border h-auto w-full justify-start rounded-none border-b px-0">
							<DashboardTab value="overview" />
							<DashboardTab value="likedsongs" />
							<DashboardTab value="matching" />
							<DashboardTab value="playlists" />
							<DashboardTab value="settings" />
						</TabsList>

						{/* Overview Tab Content */}
						<TabsContent value="overview" className="mt-6 space-y-6">
							<div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
								<div className="lg:col-span-4">
									<Suspense fallback={<LoadingFallback />}>
										<Await
											resolve={likedSongs}
											errorElement={
												<AwaitError message="Failed to load library status. Please try again." />
											}
										>
											{resolvedLikedSongs => (
												<LibraryStatus
													likedSongs={resolvedLikedSongs}
													playlists={playlists}
												/>
											)}
										</Await>
									</Suspense>
								</div>
								<div className="lg:col-span-8">
									<QuickActions />
								</div>
								<div className="lg:order-3 lg:col-span-8">
									<RecentActivity />
								</div>
								<div className="lg:order-4 lg:col-span-4">
									<AnalysisStats />
								</div>
							</div>
						</TabsContent>

						{/* Other Tab Contents - Only render if they've been loaded */}
						<TabsContent value="likedsongs" className="mt-6">
							{loadedTabs.likedsongs && (
								<Card className="bg-card border-border">
									<CardContent className="p-6">
										<Suspense fallback={<LoadingFallback />}>
											<Await
												resolve={likedSongs}
												errorElement={
													<AwaitError message="Failed to load liked songs. Please try again." />
												}
											>
												{resolvedLikedSongs => (
													<LikedSongsTable
														initialSongs={resolvedLikedSongs}
														userId={user.id}
													/>
												)}
											</Await>
										</Suspense>
									</CardContent>
								</Card>
							)}
						</TabsContent>

						<TabsContent value="playlists" className="mt-6">
							{loadedTabs.playlists && (
								<Card className="bg-card border-border">
									<CardContent className="p-6">
										<Suspense fallback={<LoadingFallback />}>
											<Await
												resolve={playlists}
												errorElement={
													<AwaitError message="Failed to load playlists. Please try again." />
												}
											>
												{resolvedPlaylists => (
													<PlaylistManagement playlists={resolvedPlaylists} />
												)}
											</Await>
										</Suspense>
									</CardContent>
								</Card>
							)}
						</TabsContent>

						<TabsContent value="matching" className="mt-6">
							{loadedTabs.matching && <MatchingWrapper userId={user.id} />}
						</TabsContent>

						<TabsContent value="settings" className="mt-6">
							{loadedTabs.settings && (
								<Card className="bg-card border-border">
									<CardContent className="p-6">
										<SettingsTab />
									</CardContent>
								</Card>
							)}
						</TabsContent>
					</Tabs>
				</div>
			</div>
		</>
	)
}

const DashboardWithProviders = () => {
	return <Dashboard />
}

export default DashboardWithProviders
