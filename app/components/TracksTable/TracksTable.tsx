import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
  ColumnDef,
} from '@tanstack/react-table'
import { useEffect, useRef, useState } from 'react'
import { columns } from './columns'
import type { TracksTableProps } from './types'

const INITIAL_LOAD = 20
const LOAD_MORE_COUNT = 15

export function TracksTable({ tracks, showStatus }: TracksTableProps) {
  const [displayedRows, setDisplayedRows] = useState(tracks.slice(0, INITIAL_LOAD))
  const [isLoading, setIsLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const allRowsLoaded = displayedRows.length >= tracks.length

  const table = useReactTable({
    data: displayedRows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  const { rows } = table.getRowModel()

  // Set up intersection observer for infinite loading
  useEffect(() => {
    if (!containerRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0]
        if (target.isIntersecting && !isLoading && !allRowsLoaded) {
          loadMoreRows()
        }
      },
      {
        root: null,
        rootMargin: '100px',
        threshold: 0.1,
      }
    )

    observer.observe(containerRef.current)

    return () => observer.disconnect()
  }, [displayedRows.length, isLoading])

  const loadMoreRows = () => {
    setIsLoading(true)
    
    // Simulate network delay
    setTimeout(() => {
      const currentLength = displayedRows.length
      const newRows = tracks.slice(
        currentLength,
        currentLength + LOAD_MORE_COUNT
      )
      
      setDisplayedRows(prev => [...prev, ...newRows])
      setIsLoading(false)
    }, 500)
  }

  return (
    <>
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full align-middle">
          <div className="overflow-hidden border border-gray-200 rounded-2xl">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                {table.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map(header => (
                      <th
                        key={header.id}
                        scope="col"
                        className="py-3 pl-4 pr-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sm:pl-6"
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {rows.map(row => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    {row.getVisibleCells().map(cell => (
                      <td
                        key={cell.id}
                        className="px-3 py-4 text-sm text-gray-500 truncate max-w-xs"
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Loading indicator and intersection observer target */}
      <div ref={containerRef} className="h-20 flex items-center justify-center">
        {isLoading ? (
          <div className="animate-pulse text-gray-500">Loading more tracks...</div>
        ) : !allRowsLoaded ? (
          <div className="text-gray-400">Scroll to load more</div>
        ) : (
          <div className="text-gray-400">All tracks loaded</div>
        )}
      </div>
    </>
  )
} 