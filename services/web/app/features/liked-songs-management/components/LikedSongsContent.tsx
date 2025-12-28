import React from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { useQueryClient } from '@tanstack/react-query'
import {
	createColumnHelper,
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	useReactTable,
} from '@tanstack/react-table'
import type { VisibilityState } from '@tanstack/react-table'
import {
	AlertCircle,
	CheckCircle,
	Clock,
	Columns,
	Music,
	RefreshCw,
	Sparkles,
} from 'lucide-react'

import TrackAnalysisModal from '~/components/TrackAnalysisModal'
import { TrackWithAnalysis, UIAnalysisStatus } from '~/lib/models/Track'
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from '~/shared/components/ui/Card'
import { Badge } from '~/shared/components/ui/badge'
import { Button } from '~/shared/components/ui/button'
import { Checkbox } from '~/shared/components/ui/checkbox'

import { useAnalysisSubscription } from '../hooks/useAnalysisSubscription'
import { useLikedSongsManagement } from '../hooks/useLikedSongsManagement'
import {
	type AnalysisJob,
	type CompletionDelayJob,
	likedSongsKeys,
	useAnalysisStatus,
	useSyncLikedSongs,
} from '../queries/liked-songs-queries'
import { useLikedSongsUIContext } from '../store/liked-songs-ui-store'
import { AnalysisControls } from './AnalysisControls'
import { AnalysisJobStatus } from './AnalysisJobStatus'
import { SearchInput } from './SearchInput'
import { StatusCard } from './StatusCard'
import { StatusCardWithJobStatus } from './StatusCardWithJobStatus'
import { TablePagination } from './TablePagination'
import { TrackRowAnalysisIndicator } from './TrackRowAnalysisIndicator'

// Re-export for backwards compatibility
export type { UIAnalysisStatus }

interface LikedSongsContentProps {
	initialSongs: TrackWithAnalysis[]
	userId: number
}

// Styles
const styles = {
	card: 'bg-card border-border',
	iconContainer: 'p-2 rounded-full',
	tableHeader:
		'text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider',
	tableCell: 'px-4 py-4 text-foreground',
	tableRow: 'border-b border-border/50 hover:bg-muted/30 transition-colors duration-150',
}

const LikedSongsContent: React.FC<LikedSongsContentProps> = ({
	initialSongs,
	userId,
}) => {
	// Hooks
	const {
		filteredTracks,
		rowSelection,
		setRowSelection,
		selectedTracks,
		searchQuery,
		setSearchQuery,
		statusFilter,
		setStatusFilter,
		stats,
		analyzeSelectedTracks,
		analyzeTracks,
		isAnalyzing,
	} = useLikedSongsManagement({ initialSongs })

	const {
		currentPage,
		pageSize,
		sortBy,
		sortOrder,
		selectedTrackForModal,
		isAnalysisModalOpen,
		columnVisibility,
		setCurrentPage,
		setPageSize,
		setSorting,
		openAnalysisModal,
		closeAnalysisModal,
		setColumnVisibility,
	} = useLikedSongsUIContext()

	// Mutations
	const syncMutation = useSyncLikedSongs()
	const { data: analysisStatus, isLoading: isAnalysisStatusLoading } = useAnalysisStatus()
	const queryClient = useQueryClient()

	// Don't render real-time subscription until analysis status is loaded
	const shouldEnableSubscription = !isAnalysisStatusLoading

	// Real-time updates - only enable after analysis status loads
	const { isConnected } = useAnalysisSubscription({
		userId,
		enabled: shouldEnableSubscription,
	})

	// Completion delay state to keep job data available after completion
	const [completionDelayJob, setCompletionDelayJob] = useState<CompletionDelayJob | null>(
		null
	)
	const completionTimeoutRef = useRef<NodeJS.Timeout | null>(null)
	const previousJobRef = useRef<AnalysisJob | null>(null)

	// Detect job completion and maintain data for completion UI
	useEffect(() => {
		const currentJob = analysisStatus?.currentJob
		const hasActiveJob = analysisStatus?.hasActiveJob
		const previousJob = previousJobRef.current

		// Update ref
		previousJobRef.current = currentJob || null

		// Job just completed (had job before, no job now)
		if (previousJob && !hasActiveJob) {
			const realCompletionStats = analysisStatus?.lastCompletionStats

			// Keep the last job data available for completion UI with REAL completion stats from WebSocket
			setCompletionDelayJob({
				job: {
					...previousJob,
					status: 'completed' as const,
					// Use the REAL completion stats from WebSocket message
					dbStats:
						realCompletionStats ?
							{
								itemsProcessed: realCompletionStats.itemsProcessed,
								itemsSucceeded: realCompletionStats.itemsSucceeded,
								itemsFailed: realCompletionStats.itemsFailed,
							}
						:	{
								// Fallback if WebSocket stats not available
								itemsProcessed: previousJob.itemCount,
								itemsSucceeded: previousJob.itemCount,
								itemsFailed: 0,
							},
				},
				isActive: false,
			})

			// Clear after 6 seconds (1 second longer than child popup)
			if (completionTimeoutRef.current) {
				clearTimeout(completionTimeoutRef.current)
			}
			completionTimeoutRef.current = setTimeout(() => {
				setCompletionDelayJob(null)
			}, 6000)
		}

		// New job started - clear completion delay
		if (hasActiveJob && completionDelayJob) {
			if (completionTimeoutRef.current) {
				clearTimeout(completionTimeoutRef.current)
				completionTimeoutRef.current = null
			}
			setCompletionDelayJob(null)
		}
	}, [analysisStatus?.hasActiveJob, analysisStatus?.currentJob, completionDelayJob])

	// Show active job or completion delay job
	const displayJob =
		analysisStatus?.hasActiveJob && analysisStatus?.currentJob ?
			{
				job: analysisStatus.currentJob,
				isActive: true,
			}
		:	completionDelayJob

	// Simple progress stats - now get real data from WebSocket completion stats
	const progressStats = {
		itemsProcessed: displayJob?.job?.dbStats?.itemsProcessed ?? 0,
		itemsSucceeded: displayJob?.job?.dbStats?.itemsSucceeded ?? 0,
		itemsFailed: displayJob?.job?.dbStats?.itemsFailed ?? 0,
	}

	// Table setup
	const columnHelper = createColumnHelper<TrackWithAnalysis>()

	const columns = useMemo(
		() => [
			columnHelper.accessor('track.name', {
				id: 'title',
				header: 'Title',
				cell: ({ row }) => (
					<div className="text-foreground text-sm font-semibold">
						{row.original.track.name}
					</div>
				),
			}),
			columnHelper.accessor('track.artist', {
				id: 'artist',
				header: 'Artist',
				cell: ({ getValue }) => (
					<div className="text-foreground/80 text-sm">{getValue()}</div>
				),
			}),
			columnHelper.accessor('track.album', {
				id: 'album',
				header: 'Album',
				cell: ({ getValue }) => (
					<div
						className="text-muted-foreground max-w-[200px] truncate text-xs"
						title={getValue() || 'N/A'}
					>
						{getValue() || 'N/A'}
					</div>
				),
			}),
			columnHelper.accessor('liked_at', {
				id: 'addedAt',
				header: 'Date Added',
				cell: ({ getValue }) => (
					<div className="text-muted-foreground text-xs tabular-nums">
						{new Date(getValue()).toLocaleDateString('en-US', {
							month: 'short',
							day: 'numeric',
							year: 'numeric',
						})}
					</div>
				),
			}),
			columnHelper.accessor('uiAnalysisStatus', {
				id: 'analysisStatus',
				header: 'Status',
				cell: ({ row }) => {
					const track = row.original
					return (
						<div className="flex justify-center">
							<TrackRowAnalysisIndicator
								trackId={track.track.id}
								initialStatus={track.uiAnalysisStatus}
								onView={() => openAnalysisModal(track.track.id)}
								onAnalyze={() => analyzeTracks({ trackId: track.track.id })}
							/>
						</div>
					)
				},
			}),
			columnHelper.display({
				id: 'select',
				header: ({ table }) => (
					<div className="flex justify-center">
						<Checkbox
							checked={table.getIsAllPageRowsSelected()}
							onCheckedChange={value => table.toggleAllPageRowsSelected(!!value)}
							aria-label="Select all"
							className="border-border data-[state=checked]:bg-blue-500"
						/>
					</div>
				),
				cell: ({ row }) => (
					<div className="flex justify-center">
						<Checkbox
							checked={row.getIsSelected()}
							disabled={
								row.original.uiAnalysisStatus === 'pending' ||
								row.original.uiAnalysisStatus === 'analyzed' ||
								row.original.uiAnalysisStatus === 'failed'
							}
							onCheckedChange={value => row.toggleSelected(!!value)}
							aria-label="Select row"
							className="border-border data-[state=checked]:bg-blue-500"
						/>
					</div>
				),
				enableSorting: false,
				enableHiding: false,
			}),
		],
		[columnHelper, analyzeTracks, openAnalysisModal]
	)

	const table = useReactTable({
		data: filteredTracks,
		columns,
		state: {
			rowSelection,
			pagination: {
				pageIndex: currentPage,
				pageSize,
			},
			columnVisibility,
		},
		enableRowSelection: true,
		onRowSelectionChange: setRowSelection,
		getCoreRowModel: getCoreRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		getSortedRowModel: getSortedRowModel(),
		autoResetPageIndex: false, // Preserve page when data changes (e.g., during analysis)
		onPaginationChange: updater => {
			if (typeof updater === 'function') {
				const newState = updater({ pageIndex: currentPage, pageSize })
				setCurrentPage(newState.pageIndex)
				if (newState.pageSize !== pageSize) {
					setPageSize(newState.pageSize)
				}
			} else {
				setCurrentPage(updater.pageIndex)
				if (updater.pageSize !== pageSize) {
					setPageSize(updater.pageSize)
				}
			}
		},
		onColumnVisibilityChange: (updater: any) => {
			if (typeof updater === 'function') {
				const newVisibility = updater(columnVisibility)
				setColumnVisibility(newVisibility)
			} else {
				setColumnVisibility(updater)
			}
		},
		manualPagination: false,
		pageCount: Math.ceil(filteredTracks.length / pageSize),
	})

	return (
		<div className="flex h-full flex-col space-y-6">
			{/* Header */}
			<div className="flex items-start justify-between">
				<div>
					<h1 className="text-foreground mb-1 text-xl font-bold md:text-2xl">
						Liked Songs Analysis
					</h1>
					<p className="text-foreground">
						Manage and analyze your liked songs from Spotify
					</p>
				</div>

				{/* Sync button */}
				<Button
					onClick={() => syncMutation.mutate()}
					disabled={syncMutation.isPending}
					className="bg-secondary hover:bg-secondary/80 text-secondary-foreground gap-2 border-0 transition-colors"
				>
					<RefreshCw
						className={`h-4 w-4 ${syncMutation.isPending ? 'animate-spin' : ''}`}
					/>
					{syncMutation.isPending ? 'Syncing...' : 'Sync Liked Songs'}
				</Button>
			</div>

			{/* Status Cards */}
			<div className="grid grid-cols-1 gap-4 md:grid-cols-4">
				<StatusCard
					title="Total Tracks"
					value={stats.total}
					icon={<Music className="text-foreground h-6 w-6" />}
					iconBg="bg-muted"
					valueColor="text-foreground"
				/>

				<StatusCard
					title="Analyzed"
					value={stats.analyzed}
					valueColor="text-green-400"
					iconBg="bg-green-500/20"
					icon={<CheckCircle className="h-6 w-6 text-green-400" />}
				/>

				<StatusCardWithJobStatus
					title="In Progress"
					value={stats.pending}
					valueColor="text-blue-400"
					iconBg="bg-blue-500/20"
					icon={<Clock className="h-6 w-6 text-blue-400" />}
					currentJob={displayJob?.job || null}
					showJobStatus={!!displayJob}
					itemsProcessed={progressStats.itemsProcessed}
					itemsSucceeded={progressStats.itemsSucceeded}
					itemsFailed={progressStats.itemsFailed}
				/>

				<StatusCard
					title="Not Analyzed"
					value={stats.notAnalyzed + stats.failed}
					icon={<AlertCircle className="text-muted-foreground h-6 w-6" />}
					iconBg="bg-red-500/20"
					valueColor="text-red-400"
				/>
			</div>

			{/* Table Card */}
			<Card className={`${styles.card} flex-1`}>
				<CardHeader className="border-border border-b pb-2">
					<div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
						<div className="flex flex-wrap items-center gap-3">
							<CardTitle className="text-foreground flex items-center gap-2 text-lg">
								<div className="rounded-md bg-blue-500/20 p-1.5">
									<Music className="h-5 w-5 text-blue-400" />
								</div>
								<span className="font-bold">Liked Songs</span>
							</CardTitle>
						</div>

						<div className="space-y-4">
							{/* Analysis controls with integrated column visibility */}
							<AnalysisControls
								selectedCount={selectedTracks().length}
								totalCount={stats.total}
								analyzedCount={stats.analyzed}
								unanalyzedCount={stats.notAnalyzed}
								onAnalyzeSelected={batchSize => analyzeSelectedTracks(batchSize)}
								onAnalyzeAll={batchSize => analyzeTracks({ useAll: true, batchSize })}
								isAnalyzing={isAnalyzing}
								disabled={isAnalyzing}
								columnVisibility={columnVisibility}
								onColumnVisibilityChange={setColumnVisibility}
							/>
						</div>
					</div>

					<div className="mt-4">
						<SearchInput
							value={searchQuery}
							onChange={e => setSearchQuery(e.target.value)}
							placeholder="Search all columns..."
						/>
					</div>
				</CardHeader>

				<CardContent className="p-0">
					<div className="hover-show-scrollbar relative overflow-x-auto">
						<table className="w-full min-w-[640px]">
							<thead className="border-border border-b">
								{table.getHeaderGroups().map(headerGroup => (
									<tr key={headerGroup.id}>
										{headerGroup.headers.map(header => {
											// Only render headers for visible columns
											if (!header.column.getIsVisible()) {
												return null
											}
											return (
												<th key={header.id} className={styles.tableHeader}>
													{header.isPlaceholder ? null : (
														<div
															{...{
																className:
																	header.column.getCanSort() ?
																		'cursor-pointer select-none'
																	:	'',
																onClick: header.column.getToggleSortingHandler(),
															}}
														>
															{flexRender(
																header.column.columnDef.header,
																header.getContext()
															)}
														</div>
													)}
												</th>
											)
										})}
									</tr>
								))}
							</thead>
							<tbody>
								{table.getRowModel().rows.map(row => (
									<tr key={row.id} className={styles.tableRow}>
										{row.getVisibleCells().map(cell => (
											<td key={cell.id} className={styles.tableCell}>
												{flexRender(cell.column.columnDef.cell, cell.getContext())}
											</td>
										))}
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</CardContent>

				<CardFooter className="border-border border-t p-4">
					<div className="flex w-full justify-between">
						<div className="text-muted-foreground text-sm">
							{table.getFilteredRowModel().rows.length} results
						</div>
						<TablePagination table={table} />
					</div>
				</CardFooter>
			</Card>

			{/* Track Analysis Modal */}
			{isAnalysisModalOpen &&
				selectedTrackForModal &&
				(() => {
					const selectedTrack = filteredTracks.find(
						(track: TrackWithAnalysis) => track.track.id === selectedTrackForModal
					)
					return selectedTrack ?
							<TrackAnalysisModal
								trackName={selectedTrack.track.name}
								artistName={selectedTrack.track.artist}
								analysis={selectedTrack.analysis?.analysis}
								isOpen={isAnalysisModalOpen}
								onOpenChange={open => (open ? null : closeAnalysisModal())}
							/>
						:	null
				})()}
		</div>
	)
}

export default LikedSongsContent
