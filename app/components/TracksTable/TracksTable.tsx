import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  ColumnDef,
  SortingState,
} from '@tanstack/react-table'
import { useEffect, useRef, useState, useMemo } from 'react'
import { createColumns } from './columns'
import type { TracksTableProps } from './types'

const INITIAL_LOAD = 20
const LOAD_MORE_COUNT = 15

export function TracksTable({ 
  tracks, 
  showAddedDate = false, 
  showAlbum = true 
}: TracksTableProps) {
  const [displayedRows, setDisplayedRows] = useState(tracks.slice(0, INITIAL_LOAD))
  const [isLoading, setIsLoading] = useState(false)
  const [sorting, setSorting] = useState<SortingState>([])
  const containerRef = useRef<HTMLDivElement>(null)
  const allRowsLoaded = displayedRows.length >= tracks.length
  const [isSmallScreen, setIsSmallScreen] = useState(false)

  useEffect(() => {
    const checkScreenSize = () => {
      setIsSmallScreen(window.innerWidth < 685)
    }
    
    checkScreenSize()
    window.addEventListener('resize', checkScreenSize)
    return () => window.removeEventListener('resize', checkScreenSize)
  }, [])

  const columns = useMemo(
    () => createColumns({ showAddedDate, showAlbum, isSmallScreen }),
    [showAddedDate, showAlbum, isSmallScreen]
  )

  const table = useReactTable({
    data: displayedRows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: {
      sorting,
    },
    onSortingChange: setSorting,
  })

  const { rows } = table.getRowModel()

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
    <div className="w-full overflow-x-auto border border-gray-200 rounded-2xl">
      <table className="w-full min-w-[800px] divide-y divide-gray-200">
        <thead className="bg-gray-50">
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map(header => (
                <th
                  key={header.id}
                  scope="col"
                  className={`py-3 pl-4 pr-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sm:pl-6 whitespace-nowrap
                    ${header.column.getCanSort() ? 'cursor-pointer select-none' : ''}`}
                  onClick={header.column.getToggleSortingHandler()}
                >
                  <div className="flex items-center gap-2">
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                    {header.column.getCanSort() && header.column.getIsSorted() && (
                      <span className="inline-block">
                        {{
                          asc: '↑',
                          desc: '↓',
                        }[header.column.getIsSorted() as string]}
                      </span>
                    )}
                  </div>
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
                  className={`px-3 py-4 text-sm text-gray-500 ${
                    cell.column.id === 'id' 
                      ? 'w-[180px] text-right' 
                      : cell.column.id === 'name'
                        ? 'max-w-[200px]'
                        : 'max-w-xs'
                  }`}
                >
                  <div className={`${
                    cell.column.id === 'name'
                      ? 'truncate overflow-hidden text-ellipsis'
                      : ''
                  }`}>
                    {flexRender(
                      cell.column.columnDef.cell,
                      cell.getContext()
                    )}
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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