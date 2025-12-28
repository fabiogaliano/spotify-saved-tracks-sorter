import { useEffect, useRef, useState } from 'react'

import { Columns, Play, RefreshCw, Sparkles } from 'lucide-react'

import { apiRoutes } from '~/lib/config/routes'
import { Button } from '~/shared/components/ui/button'
import { Checkbox } from '~/shared/components/ui/checkbox'

interface AnalysisControlsProps {
	selectedCount: number
	totalCount: number
	analyzedCount: number
	unanalyzedCount: number
	onAnalyzeSelected: (batchSize?: 1 | 5 | 10) => void
	onAnalyzeAll: (batchSize?: 1 | 5 | 10) => void
	isAnalyzing: boolean
	disabled: boolean
	columnVisibility: Record<string, boolean>
	onColumnVisibilityChange: (visibility: Record<string, boolean>) => void
}

export const AnalysisControls = ({
	selectedCount,
	totalCount,
	analyzedCount,
	unanalyzedCount,
	onAnalyzeSelected,
	onAnalyzeAll,
	isAnalyzing,
	disabled,
	columnVisibility,
	onColumnVisibilityChange,
}: AnalysisControlsProps) => {
	const dropdownRef = useRef<HTMLDivElement>(null)
	const [batchSize, setBatchSize] = useState<1 | 5 | 10>(5)

	// Load user preferences including batch size
	useEffect(() => {
		const loadPreferences = async () => {
			try {
				const response = await fetch(apiRoutes.user.preferences)
				if (response.ok) {
					const data = await response.json()
					if (data.preferences?.batch_size) {
						setBatchSize(data.preferences.batch_size as 1 | 5 | 10)
					}
				}
			} catch (error) {
				console.error('Failed to load preferences:', error)
				// Fallback to localStorage
				const savedBatchSize = localStorage.getItem('analysisBatchSize')
				if (savedBatchSize && ['1', '5', '10'].includes(savedBatchSize)) {
					setBatchSize(Number(savedBatchSize) as 1 | 5 | 10)
				}
			}
		}

		loadPreferences()
	}, [])

	// Close dropdown when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			const dropdown = document.getElementById('column-visibility-menu')
			const button = document.getElementById('column-visibility-button')

			if (
				dropdown &&
				button &&
				!dropdown.contains(event.target as Node) &&
				!button.contains(event.target as Node)
			) {
				dropdown.style.display = 'none'
			}
		}

		document.addEventListener('mousedown', handleClickOutside)
		return () => document.removeEventListener('mousedown', handleClickOutside)
	}, [])

	const columns = [
		{ id: 'title', label: 'Title' },
		{ id: 'artist', label: 'Artist' },
		{ id: 'album', label: 'Album' },
		{ id: 'addedAt', label: 'Date Added' },
		{ id: 'analysisStatus', label: 'Status' },
	]

	return (
		<div className="flex items-center gap-6">
			{/* Column visibility dropdown */}
			<div className="relative">
				<Button
					id="column-visibility-button"
					variant="outline"
					size="sm"
					className="h-10"
					onClick={() => {
						const menu = document.getElementById('column-visibility-menu')
						if (menu) {
							const isVisible = menu.style.display === 'block'
							menu.style.display = isVisible ? 'none' : 'block'
						}
					}}
				>
					<Columns className="mr-2 h-4 w-4" />
					Columns
				</Button>

				{/* Custom dropdown */}
				<div
					id="column-visibility-menu"
					className="bg-card border-border absolute top-full right-0 z-50 mt-1 w-48 rounded-md border p-2 shadow-lg"
					style={{ display: 'none' }}
				>
					<div className="text-muted-foreground px-2 py-1 text-sm font-medium">
						Toggle columns
					</div>
					<div className="bg-border my-1 h-px" />

					{columns.map(column => (
						<div
							key={column.id}
							className="hover:bg-muted/50 flex cursor-pointer items-center gap-2 rounded px-2 py-1.5"
							onClick={() => {
								onColumnVisibilityChange({
									...columnVisibility,
									[column.id]: !columnVisibility[column.id],
								})
							}}
						>
							<Checkbox
								checked={columnVisibility[column.id] !== false}
								className="h-4 w-4"
							/>
							<span className="text-sm">{column.label}</span>
						</div>
					))}
				</div>
			</div>

			<div className="flex items-center gap-2">
				<Button
					variant={selectedCount > 0 ? 'default' : 'outline'}
					disabled={selectedCount === 0 || disabled}
					onClick={() => onAnalyzeSelected(batchSize)}
					className={`flex items-center gap-2 ${selectedCount > 0 ? 'bg-blue-500 text-white hover:bg-blue-600' : ''}`}
				>
					<Sparkles className={`h-4 w-4 ${isAnalyzing ? 'animate-pulse' : ''}`} />
					{selectedCount > 0 ? `Analyze ${selectedCount} Selected` : 'Analyze Selected'}
				</Button>

				<Button
					variant="outline"
					disabled={unanalyzedCount === 0 || disabled}
					onClick={() => onAnalyzeAll(batchSize)}
					className="flex items-center gap-2"
				>
					<Play className={`h-4 w-4 ${isAnalyzing ? 'animate-pulse' : ''}`} />
					Analyze All ({unanalyzedCount})
				</Button>
			</div>
		</div>
	)
}
