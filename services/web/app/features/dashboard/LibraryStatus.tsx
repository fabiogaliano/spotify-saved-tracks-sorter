import { Suspense, useEffect } from 'react'

import { Music, RefreshCw } from 'lucide-react'
import { Await, useFetcher } from 'react-router'
import { toast } from 'sonner'

import { Playlist } from '~/lib/models/Playlist'
import { TrackWithAnalysis } from '~/lib/models/Track'
import { Card, CardContent, CardHeader, CardTitle } from '~/shared/components/ui/Card'
import { Button } from '~/shared/components/ui/button'
import { Progress } from '~/shared/components/ui/progress'

export function LibraryStatus({
	likedSongs,
	playlists,
}: {
	likedSongs: TrackWithAnalysis[]
	playlists?: Promise<Playlist[]>
}) {
	const syncFetcher = useFetcher()
	const isSyncing = syncFetcher.state === 'submitting' || syncFetcher.state === 'loading'

	useEffect(() => {
		if (syncFetcher.data && syncFetcher.state === 'idle') {
			if (syncFetcher.data.error) {
				toast.error(`Sync failed: ${syncFetcher.data.error}`)
			} else if (syncFetcher.data.success) {
				const { savedTracks, playlists, playlistTracks } = syncFetcher.data
				toast.success(
					`Library synced! Updated ${savedTracks.newItems} tracks, ${playlists.newItems} playlists, and ${playlistTracks.newItems} playlist tracks.`
				)
			}
		}
	}, [syncFetcher.data, syncFetcher.state])

	return (
		<Card className="bg-card border-border overflow-hidden">
			<CardHeader className="border-border border-b pb-2">
				<CardTitle className="text-foreground flex justify-between gap-2 text-lg">
					<div className="flex items-center gap-2">
						<div className="rounded-md bg-green-500/20 p-1.5">
							<Music className="h-5 w-5 text-green-400" />
						</div>
						<span className="font-bold">Library Status</span>
					</div>
					<div className="flex gap-2">
						<syncFetcher.Form method="post" action="/actions/sync-library">
							<Button
								type="submit"
								variant="secondary"
								size="sm"
								className="gap-2 transition-colors"
								disabled={isSyncing}
							>
								<RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
								{isSyncing ? 'Syncing...' : 'Sync Library'}
							</Button>
						</syncFetcher.Form>
					</div>
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="space-y-2">
					<div className="flex justify-between">
						<span className="text-muted-foreground">Liked songs</span>
						<span className="text-foreground font-medium">{likedSongs.length}</span>
					</div>
					<div className="flex justify-between">
						<span className="text-muted-foreground">Songs analyzed</span>
						<span className="text-foreground font-medium">
							{likedSongs.filter(track => track.analysis !== null).length}
						</span>
					</div>
					<div className="flex justify-between">
						<span className="text-muted-foreground">AI-flagged playlists</span>
						<span className="text-foreground font-medium">
							{playlists ?
								<Suspense fallback="?">
									<Await resolve={playlists}>
										{resolvedPlaylists =>
											resolvedPlaylists.filter(p => p.is_flagged).length
										}
									</Await>
								</Suspense>
							:	0}
						</span>
					</div>
				</div>

				<div className="w-full">
					<div className="mb-1 flex justify-between text-xs">
						<span className="text-muted-foreground">Analysis Progress</span>
						<span className="font-medium text-green-400">
							{calculateAnalysisPercentage(likedSongs).toFixed(1)}%
						</span>
					</div>
					<Progress
						value={calculateAnalysisPercentage(likedSongs)}
						className="bg-card border-border h-3 border"
						indicatorClassName="bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]"
					/>
				</div>
			</CardContent>
		</Card>
	)
}

function calculateAnalysisPercentage(tracks: TrackWithAnalysis[]): number {
	const total = tracks.length
	const withAnalysis = tracks.filter(track => track.analysis !== null).length
	return total > 0 ? (withAnalysis / total) * 100 : 0
}
