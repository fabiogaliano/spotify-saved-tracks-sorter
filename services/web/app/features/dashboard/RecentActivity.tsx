import { Activity, CheckCircle2, ChevronRight, ListMusic, Music } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '~/shared/components/ui/Card'
import { Button } from '~/shared/components/ui/button'

export function RecentActivity() {
	return (
		<Card className="bg-card border-border h-full overflow-hidden">
			<CardHeader className="border-border border-b pb-2">
				<div className="flex items-center justify-between">
					<CardTitle className="text-foreground flex items-center gap-2 text-lg">
						<div className="rounded-md bg-blue-500/20 p-1.5">
							<Activity className="h-5 w-5 text-blue-400" />
						</div>
						<span className="font-bold">Recent Activity</span>
					</CardTitle>
					<Button
						variant="ghost"
						size="sm"
						className="text-muted-foreground hover:text-foreground h-auto p-0 hover:bg-transparent"
					>
						View All <ChevronRight className="ml-1 h-4 w-4" />
					</Button>
				</div>
			</CardHeader>
			<CardContent>
				<div className="space-y-1">
					<div className="hover:bg-background/20 flex items-start gap-3 rounded-md p-3 transition-colors">
						<div className="mt-0.5 rounded-full bg-green-500/20 p-1.5">
							<CheckCircle2 className="h-4 w-4 text-green-400" />
						</div>
						<div className="flex-1">
							<div className="flex items-start justify-between">
								<p className="text-foreground font-medium">
									12 songs matched to "Workout Mix"
								</p>
								<span className="text-muted-foreground ml-2 text-xs whitespace-nowrap">
									Just now
								</span>
							</div>
							<p className="text-muted-foreground text-sm">
								Songs automatically sorted based on analysis
							</p>
						</div>
					</div>

					<div className="hover:bg-background/20 flex items-start gap-3 rounded-md p-3 transition-colors">
						<div className="mt-0.5 rounded-full bg-blue-500/20 p-1.5">
							<Music className="h-4 w-4 text-blue-400" />
						</div>
						<div className="flex-1">
							<div className="flex items-start justify-between">
								<p className="text-foreground font-medium">15 songs analyzed</p>
								<span className="text-muted-foreground ml-2 text-xs whitespace-nowrap">
									5 min ago
								</span>
							</div>
							<p className="text-muted-foreground text-sm">
								Batch analysis completed in 45 seconds
							</p>
						</div>
					</div>

					<div className="hover:bg-background/20 flex items-start gap-3 rounded-md p-3 transition-colors">
						<div className="mt-0.5 rounded-full bg-purple-500/20 p-1.5">
							<ListMusic className="h-4 w-4 text-purple-400" />
						</div>
						<div className="flex-1">
							<div className="flex items-start justify-between">
								<p className="text-foreground font-medium">
									"Chill Vibes" playlist updated
								</p>
								<span className="text-muted-foreground ml-2 text-xs whitespace-nowrap">
									2 hours ago
								</span>
							</div>
							<p className="text-muted-foreground text-sm">
								AI flag added: "relaxing acoustic songs with nature themes"
							</p>
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	)
}
