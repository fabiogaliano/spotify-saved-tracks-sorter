import { StatusFilter } from './StatusFilter'
import { ColumnToggle } from './ColumnVisibility'

export interface TrackFilterControlsProps {
	showStatus: 'all' | 'unsorted' | 'sorted' | 'ignored'
	onStatusChange: (status: 'all' | 'unsorted' | 'sorted' | 'ignored') => void
	showAlbum: boolean
	showAddedDate: boolean
	onShowAlbumChange: (show: boolean) => void
	onShowAddedDateChange: (show: boolean) => void
}

export function TrackFilterControls({
	showStatus,
	onStatusChange,
	showAlbum,
	showAddedDate,
	onShowAlbumChange,
	onShowAddedDateChange,
}: TrackFilterControlsProps) {
	return (
		<div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6 lg:mb-8">
			<div className="w-full flex justify-center sm:justify-start sm:w-auto">
				<StatusFilter showStatus={showStatus} onStatusChange={onStatusChange} />
			</div>
			<div className="w-full flex justify-center sm:justify-start sm:w-auto">
				<ColumnToggle
					showAlbum={showAlbum}
					showAddedDate={showAddedDate}
					onShowAlbumChange={onShowAlbumChange}
					onShowAddedDateChange={onShowAddedDateChange}
				/>
			</div>
		</div>
	)
}
