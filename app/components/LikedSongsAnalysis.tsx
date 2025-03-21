import { useState, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter
} from '~/shared/components/ui/Card';
import { Button } from '~/shared/components/ui/button';
import { Input } from '~/shared/components/ui/input';
import { Checkbox } from '~/shared/components/ui/checkbox';
import { Badge } from '~/shared/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '~/shared/components/ui/dropdown-menu';
import {
  Search,
  RefreshCw,
  Columns,
  X,
  CheckCircle,
  Clock,
  AlertCircle,
  Music,
  Eye
} from 'lucide-react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel
} from '@tanstack/react-table';

// Sample data
const data = [
  { id: '1', title: 'Billie Jean', artist: 'Michael Jackson', album: 'Thriller', addedAt: '2023-10-15', analysisStatus: 'analyzed' },
  { id: '2', title: 'Bohemian Rhapsody', artist: 'Queen', album: 'A Night at the Opera', addedAt: '2023-09-28', analysisStatus: 'analyzed' },
  { id: '3', title: 'Imagine', artist: 'John Lennon', album: 'Imagine', addedAt: '2023-11-03', analysisStatus: 'not_analyzed' },
  { id: '4', title: 'Smells Like Teen Spirit', artist: 'Nirvana', album: 'Nevermind', addedAt: '2023-08-12', analysisStatus: 'analyzed' },
  { id: '5', title: 'Sweet Child O\' Mine', artist: 'Guns N\' Roses', album: 'Appetite for Destruction', addedAt: '2023-09-05', analysisStatus: 'not_analyzed' },
  { id: '6', title: 'Hotel California', artist: 'Eagles', album: 'Hotel California', addedAt: '2023-07-22', analysisStatus: 'analyzed' },
  { id: '7', title: 'Stairway to Heaven', artist: 'Led Zeppelin', album: 'Led Zeppelin IV', addedAt: '2023-10-01', analysisStatus: 'pending' },
  { id: '8', title: 'Yesterday', artist: 'The Beatles', album: 'Help!', addedAt: '2023-11-10', analysisStatus: 'not_analyzed' },
  { id: '9', title: 'Purple Haze', artist: 'Jimi Hendrix', album: 'Are You Experienced', addedAt: '2023-08-30', analysisStatus: 'failed' },
  { id: '10', title: 'Like a Rolling Stone', artist: 'Bob Dylan', album: 'Highway 61 Revisited', addedAt: '2023-07-15', analysisStatus: 'analyzed' },
];

// Analysis badge component
const AnalysisBadge = ({ status, onAnalyze, onView }) => {
  const badgeStyle = {
    analyzed: "bg-green-500/20 border-green-500 text-green-400 hover:bg-green-500/30 cursor-pointer",
    pending: "bg-blue-500/20 border-blue-500 text-blue-400",
    not_analyzed: "bg-gray-500/20 border-gray-600 text-gray-400 hover:bg-gray-500/30 cursor-pointer",
    failed: "bg-red-500/20 border-red-500 text-red-400 hover:bg-red-500/30 cursor-pointer"
  };

  const statusText = {
    analyzed: "Analyzed",
    pending: "In Progress",
    not_analyzed: "Not Analyzed",
    failed: "Failed"
  };

  const handleClick = () => {
    if (status === 'analyzed') {
      onView();
    } else if (status === 'not_analyzed' || status === 'failed') {
      onAnalyze();
    }
  };

  return (
    <Badge
      className={`${badgeStyle[status]} flex items-center gap-1 whitespace-nowrap px-2 py-1 border`}
      onClick={status !== 'pending' ? handleClick : undefined}
    >
      {status === 'analyzed' ? <CheckCircle className="h-3.5 w-3.5" /> :
        status === 'pending' ? <Clock className="h-3.5 w-3.5" /> :
          status === 'not_analyzed' ? <Music className="h-3.5 w-3.5" /> :
            <AlertCircle className="h-3.5 w-3.5" />
      }
      {statusText[status]}
      {status === 'analyzed' && <Eye className="h-3 w-3 ml-1" />}
      {(status === 'not_analyzed' || status === 'failed') && <RefreshCw className="h-3 w-3 ml-1" />}
    </Badge>
  );
};

// Main component
const LikedSongsAnalysis = () => {
  const [rowSelection, setRowSelection] = useState({});
  const [globalFilter, setGlobalFilter] = useState('');
  const [columnVisibility, setColumnVisibility] = useState({
    addedAt: false
  });

  // Calculate stats for display
  const stats = {
    analyzed: data.filter(track => track.analysisStatus === 'analyzed').length,
    pending: data.filter(track => track.analysisStatus === 'pending').length,
    notAnalyzed: data.filter(track => track.analysisStatus === 'not_analyzed').length,
    failed: data.filter(track => track.analysisStatus === 'failed').length,
    total: data.length
  };

  // Column definitions
  const columnHelper = createColumnHelper();

  const columns = useMemo(() => [
    columnHelper.accessor('title', {
      header: 'Title',
      cell: info => <div className="font-medium text-white">{info.getValue()}</div>
    }),
    columnHelper.accessor('artist', {
      header: 'Artist',
      cell: info => info.getValue()
    }),
    columnHelper.accessor('album', {
      header: 'Album',
      cell: info => info.getValue()
    }),
    columnHelper.accessor('addedAt', {
      header: 'Date Added',
      cell: info => new Date(info.getValue()).toLocaleDateString()
    }),
    columnHelper.accessor('analysisStatus', {
      header: 'Status',
      cell: info => (
        <div className="flex justify-center">
          <AnalysisBadge
            status={info.getValue()}
            onView={() => console.log('View analysis for:', info.row.original.title)}
            onAnalyze={() => console.log('Analyze track:', info.row.original.title)}
          />
        </div>
      )
    }),
    columnHelper.display({
      id: 'select',
      header: ({ table }) => (
        <div className="flex justify-center">
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            onCheckedChange={value => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
          />
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex justify-center">
          <Checkbox
            checked={row.getIsSelected()}
            disabled={row.original.analysisStatus === 'pending'}
            onCheckedChange={value => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        </div>
      )
    })
  ], []);

  // Initialize the table
  const table = useReactTable({
    data,
    columns,
    state: {
      rowSelection,
      globalFilter,
      columnVisibility
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel()
  });

  return (
    <div className="h-full flex flex-col space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Liked Songs Analysis</h1>
        <p className="text-white">Manage and analyze your liked songs from Spotify</p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gray-900/80 border-gray-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Tracks</p>
              <p className="text-white text-2xl font-bold">{stats.total}</p>
            </div>
            <div className="bg-gray-800 p-2 rounded-full">
              <Music className="h-6 w-6 text-white" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/80 border-gray-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Analyzed</p>
              <p className="text-green-400 text-2xl font-bold">{stats.analyzed}</p>
            </div>
            <div className="bg-green-500/20 p-2 rounded-full">
              <CheckCircle className="h-6 w-6 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/80 border-gray-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">In Progress</p>
              <p className="text-blue-400 text-2xl font-bold">{stats.pending}</p>
            </div>
            <div className="bg-blue-500/20 p-2 rounded-full">
              <Clock className="h-6 w-6 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/80 border-gray-800">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Not Analyzed</p>
              <p className="text-white text-2xl font-bold">{stats.notAnalyzed + stats.failed}</p>
            </div>
            <div className="bg-gray-800 p-2 rounded-full">
              <AlertCircle className="h-6 w-6 text-gray-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table Card */}
      <Card className="bg-gray-900/80 border-gray-800 flex-1">
        <CardHeader className="pb-2 border-b border-gray-800">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <CardTitle className="text-lg flex items-center gap-2 text-white">
              <div className="bg-blue-500/20 p-1.5 rounded-md">
                <Music className="h-5 w-5 text-blue-400" />
              </div>
              <span className="font-bold">Liked Songs</span>

              {Object.keys(rowSelection).length > 0 && (
                <Badge className="ml-2 bg-blue-500/20 text-blue-400 border border-blue-500">
                  {Object.keys(rowSelection).length} selected
                </Badge>
              )}
            </CardTitle>

            <div className="flex items-center gap-2">
              {/* Column visibility */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="border-gray-700 text-white flex gap-1">
                    <Columns className="h-4 w-4" />
                    <span className="hidden md:inline">Columns</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-gray-800 border-gray-700 text-white">
                  <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-gray-700" />
                  {table.getAllLeafColumns().filter(column => column.id !== 'select').map((column) => (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) => column.toggleVisibility(!!value)}
                    >
                      {column.id.replace(/([A-Z])/g, ' $1').trim()}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Analyze selected tracks button */}
              <Button
                className="bg-white text-gray-900 hover:bg-white/90 border-0"
                disabled={Object.keys(rowSelection).length === 0}
                onClick={() => console.log('Analyzing tracks:', Object.keys(rowSelection))}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Analyze Selected
              </Button>
            </div>
          </div>
        </CardHeader>

        <div className="p-4 border-b border-gray-800">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              value={globalFilter || ''}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder="Search all columns..."
              className="pl-9 bg-gray-800 border-gray-700 text-white w-full"
            />
            {globalFilter && (
              <button
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                onClick={() => setGlobalFilter('')}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <CardContent className="p-0">
          <div className="relative overflow-auto">
            <table className="w-full">
              <thead className="border-b border-gray-800">
                {table.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map(header => (
                      <th
                        key={header.id}
                        className="text-left px-4 py-3 text-sm font-medium text-gray-400"
                      >
                        {header.isPlaceholder ? null : (
                          <div
                            {...{
                              className: header.column.getCanSort()
                                ? 'cursor-pointer select-none'
                                : '',
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
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map(row => (
                  <tr
                    key={row.id}
                    className="border-b border-gray-800/50 hover:bg-gray-800/30"
                  >
                    {row.getVisibleCells().map(cell => (
                      <td
                        key={cell.id}
                        className="px-4 py-3 text-white"
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
        </CardContent>

        <CardFooter className="border-t border-gray-800 p-4">
          <div className="flex justify-between w-full">
            <div className="text-sm text-gray-400">
              {table.getFilteredRowModel().rows.length} results
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="border-gray-700 text-white hover:bg-gray-800"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                Previous
              </Button>
              <span className="text-white">
                Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="border-gray-700 text-white hover:bg-gray-800"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                Next
              </Button>
            </div>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default LikedSongsAnalysis;