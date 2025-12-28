import { AlertCircle, CheckCircle, Clock, Loader2 } from 'lucide-react'

import {
	AnalysisJobType,
	AnalysisJobStatus as JobStatus,
} from '~/lib/types/analysis.types'
import { Card, CardContent, CardHeader } from '~/shared/components/ui/Card'

interface AnalysisJobStatusProps {
	jobType?: AnalysisJobType
	status: JobStatus
	itemsProcessed: number
	itemCount: number
	itemsSucceeded: number
	itemsFailed: number
	startedAt?: Date
}

export const AnalysisJobStatus = ({
	jobType = 'track_batch',
	status,
	itemsProcessed,
	itemCount,
	itemsSucceeded,
	itemsFailed,
}: AnalysisJobStatusProps) => {
	const completionPercentage =
		itemCount > 0 ? Math.round((itemsProcessed / itemCount) * 100) : 0
	const isPlaylistJob = jobType === 'playlist'

	const getStatusConfig = () => {
		switch (status) {
			case 'completed':
				return {
					icon: <CheckCircle className="h-4 w-4" />,
					text: 'Analysis Complete',
					subtitle: 'All tracks processed successfully',
					color: 'text-green-400',
					progressColor: 'bg-green-500',
				}
			case 'in_progress':
				return {
					icon: <Loader2 className="h-4 w-4 animate-spin" />,
					text: isPlaylistJob ? 'Analyzing Playlist' : 'Analyzing Tracks',
					subtitle:
						isPlaylistJob ?
							'Processing playlist details'
						:	'Processing your music collection',
					color: 'text-blue-400',
					progressColor: 'bg-blue-500',
				}
			case 'pending':
				return {
					icon: <Clock className="h-4 w-4" />,
					text: isPlaylistJob ? 'Playlist Queued' : 'Analysis Queued',
					subtitle: 'Waiting to be processed',
					color: 'text-yellow-400',
					progressColor: 'bg-yellow-500',
				}
			case 'failed':
				return {
					icon: <AlertCircle className="h-4 w-4" />,
					text: 'Analysis Failed',
					subtitle: 'Processing encountered errors',
					color: 'text-red-400',
					progressColor: 'bg-red-500',
				}
			default:
				return {
					icon: <Clock className="h-4 w-4" />,
					text: 'Unknown Status',
					subtitle: 'Status unavailable',
					color: 'text-muted-foreground',
					progressColor: 'bg-muted',
				}
		}
	}

	const statusConfig = getStatusConfig()

	return (
		<Card className="bg-card border-border w-80 shadow-xl">
			{/* Header with status */}
			<CardHeader className="pb-3">
				<div className="flex items-center gap-3">
					<div className={`${statusConfig.color} flex-shrink-0`}>{statusConfig.icon}</div>
					<div className="min-w-0 flex-1">
						<h3 className={`${statusConfig.color} text-base font-semibold`}>
							{statusConfig.text}
						</h3>
						<p className="text-muted-foreground mt-1 text-xs">{statusConfig.subtitle}</p>
					</div>
				</div>
			</CardHeader>

			{/* Progress section */}
			<CardContent className="space-y-4 pt-0">
				{/* Progress header */}
				<div className="flex items-center justify-between">
					<span className="text-foreground text-sm font-medium">Progress</span>
					<span className={`${statusConfig.color} text-xl font-bold`}>
						{completionPercentage}%
					</span>
				</div>

				{/* Progress bar */}
				<div className="bg-muted h-2 w-full overflow-hidden rounded-full">
					<div
						className={`${statusConfig.progressColor} h-full rounded-full transition-all duration-700 ease-out`}
						style={{ width: `${completionPercentage}%` }}
					/>
				</div>

				{/* Progress text */}
				<div className="text-center">
					{isPlaylistJob ?
						<p className="text-muted-foreground text-sm">
							{status === 'completed' ? 'Playlist analyzed' : 'Analyzing playlist...'}
						</p>
					:	<p className="text-muted-foreground text-sm">
							<span className="text-foreground font-semibold">{itemsProcessed}</span> of{' '}
							<span className="text-foreground font-semibold">{itemCount}</span> tracks
						</p>
					}
				</div>

				{/* Results summary - only show for track batch jobs with processed items */}
				{!isPlaylistJob && itemsProcessed > 0 && (
					<div className="border-border border-t pt-4">
						<div className="grid grid-cols-2 gap-3">
							<div className="rounded-lg border border-green-500/20 bg-green-500/10 p-3 text-center">
								<CheckCircle className="mx-auto mb-1 h-4 w-4 text-green-400" />
								<div className="text-lg font-bold text-green-400">{itemsSucceeded}</div>
								<div className="text-muted-foreground text-xs">Completed</div>
							</div>
							<div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-center">
								<AlertCircle className="mx-auto mb-1 h-4 w-4 text-red-400" />
								<div className="text-lg font-bold text-red-400">{itemsFailed}</div>
								<div className="text-muted-foreground text-xs">Failed</div>
							</div>
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	)
}
