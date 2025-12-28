import React from 'react'

import { ListMusic, Search, Sparkles } from 'lucide-react'

import { Card, CardContent, CardHeader } from '~/shared/components/ui/Card'
import { Input } from '~/shared/components/ui/input'
import { ScrollArea } from '~/shared/components/ui/scroll-area'
import { Tabs, TabsList, TabsTrigger } from '~/shared/components/ui/tabs'

import { PlaylistDetailViewTabs, PlaylistUIFormat } from '../../types'
import { IconContainer, PlaylistCard, PlaylistImage, SectionTitle } from '../ui'

interface PlaylistSelectorProps {
	filteredPlaylists: PlaylistUIFormat[]
	searchQuery: string
	selectedTab: PlaylistDetailViewTabs
	selectedPlaylist: string | null
	isLoading?: boolean
	onSearchChange: (query: string) => void
	onTabChange: (value: PlaylistDetailViewTabs) => void
	onSelectPlaylist: (id: string) => void
}

const PlaylistSelector: React.FC<PlaylistSelectorProps> = ({
	filteredPlaylists,
	selectedPlaylist,
	selectedTab,
	searchQuery,
	isLoading = false,
	onSearchChange,
	onTabChange,
	onSelectPlaylist,
}) => {
	// Skeleton loading component
	const PlaylistSkeleton = () => (
		<div className="space-y-2">
			{[...Array(5)].map((_, i) => (
				<div
					key={i}
					className="bg-card/30 border-border min-h-[44px] w-full animate-pulse rounded-md border p-3"
				>
					<div className="flex items-center gap-3">
						<div className="bg-muted/50 h-10 w-10 rounded-md"></div>
						<div className="flex-1">
							<div className="bg-muted/50 mb-1 h-4 w-3/4 rounded"></div>
							<div className="bg-muted/30 h-3 w-1/2 rounded"></div>
						</div>
					</div>
				</div>
			))}
		</div>
	)

	return (
		<div className="lg:col-span-3">
			<Card className="bg-card/50 border-border flex h-full flex-col shadow-sm backdrop-blur-sm">
				<CardHeader className="border-border/50 border-b pb-3">
					<div className="flex items-center justify-between">
						<SectionTitle
							icon={<IconContainer icon={ListMusic} color="purple" />}
							title="Your Playlists"
							count={filteredPlaylists.length}
						/>
					</div>
				</CardHeader>

				<div className="border-border flex-shrink-0 border-b p-4">
					<div className="relative">
						<Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform" />
						<Input
							type="text"
							placeholder="Search playlists..."
							value={searchQuery}
							onChange={e => onSearchChange(e.target.value)}
							className="bg-background/50 border-border/50 focus:bg-background pl-10 transition-colors"
						/>
					</div>
				</div>

				<CardContent className="min-h-0 flex-1 space-y-2 p-4">
					<ScrollArea className="h-[calc(100vh-320px)] pr-4">
						<Tabs
							value={selectedTab}
							onValueChange={value => onTabChange(value as PlaylistDetailViewTabs)}
						>
							<TabsList className="bg-card/50 border-border grid w-full grid-cols-2 border">
								<TabsTrigger
									value="is_flagged"
									className="data-[state=active]:bg-card text-muted-foreground data-[state=active]:text-foreground"
								>
									AI-Enabled
								</TabsTrigger>
								<TabsTrigger
									value="others"
									className="data-[state=active]:bg-card text-muted-foreground data-[state=active]:text-foreground"
								>
									Others Playlists
								</TabsTrigger>
							</TabsList>
						</Tabs>

						{isLoading ?
							<PlaylistSkeleton />
						: filteredPlaylists.length === 0 ?
							<div className="flex flex-col items-center justify-center px-4 py-12">
								<div className="bg-muted/20 mb-4 rounded-full p-4">
									<ListMusic className="text-muted-foreground/60 h-8 w-8" />
								</div>
								<h3 className="text-foreground mb-2 text-base font-medium">
									No playlists found
								</h3>
								<p className="text-muted-foreground max-w-sm text-center text-sm">
									{searchQuery ?
										`No playlists match "${searchQuery}". Try adjusting your search terms.`
									:	'No playlists available in this category. Create some playlists to get started.'
									}
								</p>
							</div>
						:	<div className="space-y-2">
								{filteredPlaylists.map(playlist => {
									return (
										<button
											key={playlist.id}
											onClick={() => onSelectPlaylist(playlist.id)}
											className={`focus:ring-primary focus:ring-offset-background min-h-[44px] w-full rounded-md p-3 text-left transition-colors focus:ring-2 focus:ring-offset-2 focus:outline-none ${
												selectedPlaylist === playlist.id ?
													'bg-card-primary border-primary/30 text-foreground border'
												:	'bg-card/50 border-border text-foreground hover:bg-card hover:border-border active:bg-card border'
											}`}
										>
											<div className="flex items-center gap-3">
												<PlaylistImage
													spotifyPlaylistId={playlist.spotifyId}
													playlistName={playlist.name}
													color={playlist.imageColor}
												/>
												<div>
													<div className="flex items-center gap-1.5">
														<span>{playlist.name}</span>
														{playlist.smartSortingEnabled && (
															<IconContainer
																icon={Sparkles}
																color={playlist.imageColor}
																size="sm"
															/>
														)}
													</div>
												</div>
											</div>
										</button>
									)
								})}
							</div>
						}
					</ScrollArea>
				</CardContent>
			</Card>
		</div>
	)
}

export default PlaylistSelector
