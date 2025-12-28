import { Clock } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '~/shared/components/ui/Card'
import { Button } from '~/shared/components/ui/button'

export function AnalysisStats() {
	return (
		<Card className="bg-card border-border h-full overflow-hidden">
			<CardHeader className="border-border border-b pb-2">
				<CardTitle className="text-foreground flex items-center gap-2 text-lg">
					<div className="rounded-md bg-purple-500/20 p-1.5">
						<Clock className="h-5 w-5 text-purple-400" />
					</div>
					<span className="font-bold">Processing Status</span>
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="space-y-3">
					<div className="flex justify-between">
						<span className="text-muted-foreground">API credits used</span>
						<span className="text-foreground font-medium">127</span>
					</div>
					<div className="flex justify-between">
						<span className="text-muted-foreground">API credits remaining</span>
						<span className="text-foreground font-medium">873</span>
					</div>
					<div className="flex justify-between">
						<span className="text-muted-foreground">Estimated completion</span>
						<span className="text-foreground font-medium">~35 minutes</span>
					</div>
				</div>

				<Card className="bg-card-secondary border-border">
					<CardContent className="p-4">
						<h4 className="text-foreground mb-1 text-sm font-medium">
							Need faster analysis?
						</h4>
						<p className="text-muted-foreground text-xs">
							Increase your batch size in settings to process more songs at once.
						</p>
						<Button
							size="sm"
							className="text-foreground mt-2 h-auto bg-white/10 px-3 py-1 text-xs transition-colors hover:bg-white/20"
						>
							Adjust Settings
						</Button>
					</CardContent>
				</Card>
			</CardContent>
		</Card>
	)
}
