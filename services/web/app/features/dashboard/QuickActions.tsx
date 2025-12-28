import { ArrowRight, ListMusic, Music, Play } from 'lucide-react'

import { Card, CardContent } from '~/shared/components/ui/Card'
import { Button } from '~/shared/components/ui/button'

export function QuickActions() {
	return (
		<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
			<Card className="bg-card-primary border-primary/20 hover:border-primary/50 cursor-pointer overflow-hidden border transition-all">
				<CardContent className="flex h-full flex-col p-5">
					<div className="mb-3 w-fit rounded-full bg-green-500/20 p-2">
						<Play className="h-5 w-5 text-green-400" />
					</div>
					<h3 className="text-foreground mb-1 font-medium">Match Songs to Playlists</h3>
					<p className="text-muted-foreground mb-3 text-sm">
						Find the perfect playlists for your songs
					</p>
					<Button className="text-foreground mt-auto w-full border-0 bg-white/10 hover:bg-white/20">
						Start Matching <ArrowRight className="ml-2 h-4 w-4" />
					</Button>
				</CardContent>
			</Card>

			<Card className="bg-card-secondary border-secondary/20 hover:border-secondary/50 cursor-pointer overflow-hidden border transition-all">
				<CardContent className="flex h-full flex-col p-5">
					<div className="mb-3 w-fit rounded-full bg-blue-500/20 p-2">
						<Music className="h-5 w-5 text-blue-400" />
					</div>
					<h3 className="text-foreground mb-1 font-medium">Analyze Songs</h3>
					<p className="text-muted-foreground mb-3 text-sm">
						Process lyrics and metadata (Batch: 15)
					</p>
					<Button className="text-foreground mt-auto w-full border-0 bg-white/10 hover:bg-white/20">
						Analyze Batch <ArrowRight className="ml-2 h-4 w-4" />
					</Button>
				</CardContent>
			</Card>

			<Card className="bg-card-accent border-accent/20 hover:border-accent/50 cursor-pointer overflow-hidden border transition-all">
				<CardContent className="flex h-full flex-col p-5">
					<div className="mb-3 w-fit rounded-full bg-purple-500/20 p-2">
						<ListMusic className="h-5 w-5 text-purple-400" />
					</div>
					<h3 className="text-foreground mb-1 font-medium">Manage Playlists</h3>
					<p className="text-muted-foreground mb-3 text-sm">
						Configure AI flags and descriptions
					</p>
					<Button className="text-foreground mt-auto w-full border-0 bg-white/10 hover:bg-white/20">
						View Playlists <ArrowRight className="ml-2 h-4 w-4" />
					</Button>
				</CardContent>
			</Card>
		</div>
	)
}
