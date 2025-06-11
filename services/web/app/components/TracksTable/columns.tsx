import { createColumnHelper } from '@tanstack/react-table'
import type { Track } from './types'
import { TrackActions } from './TrackActions'

const columnHelper = createColumnHelper<Track>()

export const createColumns = ({ 
  showAddedDate = false, 
  showAlbum = true,
  isSmallScreen = false 
}) => {
  let columns = []

  // Actions column - will be first on small screens
  const actionsColumn = columnHelper.accessor('id', {
    header: () => (
      <div className="flex justify-center w-full">
        Actions
      </div>
    ),
    cell: info => (
      <div className="flex justify-center w-full">
        <TrackActions 
          userId={String(info.row.original.userId)}
          trackId={info.getValue()} 
        />
      </div>
    ),
    enableSorting: false,
  })

  // Add columns in the correct order based on screen size
  if (isSmallScreen) {
    columns.push(actionsColumn)
  }

  columns.push(
    columnHelper.accessor('artist', {
      header: 'Artist',
      cell: info => info.getValue(),
      sortingFn: 'alphanumeric',
    }),
    columnHelper.accessor('name', {
      header: 'Track',
      cell: info => info.getValue(),
      sortingFn: 'alphanumeric',
    })
  )

  if (showAlbum) {
    columns.push(
      columnHelper.accessor('album', {
        header: 'Album',
        cell: info => info.getValue(),
        sortingFn: 'alphanumeric',
      })
    )
  }

  if (!isSmallScreen) {
    columns.push(actionsColumn)
  }

  if (showAddedDate) {
    columns.push(
      columnHelper.accessor('likedAt', {
        header: 'Added',
        cell: info => new Date(info.getValue()).toLocaleDateString(),
        sortingFn: 'datetime',
      })
    )
  }

  return columns
} 