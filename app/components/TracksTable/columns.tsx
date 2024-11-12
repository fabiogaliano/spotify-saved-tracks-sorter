import { Form } from '@remix-run/react'
import { createColumnHelper } from '@tanstack/react-table'
import type { Track } from './types'

const columnHelper = createColumnHelper<Track>()

export const columns = [
  columnHelper.accessor('name', {
    header: 'Track',
    cell: info => info.getValue(),
  }),
  columnHelper.accessor('artist', {
    header: 'Artist',
    cell: info => info.getValue(),
  }),
  columnHelper.accessor('album', {
    header: 'Album',
    cell: info => info.getValue(),
  }),
  columnHelper.accessor('likedAt', {
    header: 'Added',
    cell: info => new Date(info.getValue()).toLocaleDateString(),
  }),
  columnHelper.accessor('id', {
    header: 'Actions',
    cell: info => (
      <Form method="post" className="inline-flex space-x-2">
        <input type="hidden" name="userId" value={info.row.original.userId} />
        <input type="hidden" name="trackId" value={info.getValue()} />
        <button
          type="submit"
          name="_action"
          value="updateTrackStatus"
          className="px-3 py-1 bg-[#1DB954] text-white text-sm rounded-full hover:bg-[#1ed760] transition-colors"
        >
          Sort
        </button>
        <button
          type="submit"
          name="status"
          value="ignored"
          className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full hover:bg-gray-200 transition-colors"
        >
          Ignore
        </button>
      </Form>
    ),
  }),
] 