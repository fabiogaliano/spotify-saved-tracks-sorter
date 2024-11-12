import { Form } from '@remix-run/react'
import { createColumnHelper } from '@tanstack/react-table'
import type { Track } from './types'
import { TrackActions } from './TrackActions'

const columnHelper = createColumnHelper<Track>()

export const createColumns = ({ showAddedDate = false, showAlbum = true }) => {
  const columns = [
    columnHelper.accessor('artist', {
      header: 'Artist',
      cell: info => info.getValue(),
    }),
    columnHelper.accessor('name', {
      header: 'Track',
      cell: info => info.getValue(),
    }),
  ]

  if (showAlbum) {
    columns.push(
      columnHelper.accessor('album', {
        header: 'Album',
        cell: info => info.getValue(),
      })
    )
  }

  columns.push(
    columnHelper.accessor('id', {
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
    })
  )

  if (showAddedDate) {
    columns.push(
      columnHelper.accessor('likedAt', {
        header: 'Added',
        cell: info => new Date(info.getValue()).toLocaleDateString(),
      })
    )
  }

  return columns
} 