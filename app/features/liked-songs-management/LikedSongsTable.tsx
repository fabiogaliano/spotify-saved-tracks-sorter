import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  VisibilityState
} from '@tanstack/react-table';
import { AlertCircle, CheckCircle, Clock, Columns, Music, RefreshCw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { TrackWithAnalysis } from '~/lib/models/Track';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle
} from '~/shared/components/ui/Card';
import { Checkbox } from '~/shared/components/ui/checkbox';

import { AnalysisBadge, AnalysisStatus } from './components/AnalysisStatusBadge';
import { SearchInput } from './components/SearchInput';
import { StatusCard } from './components/StatusCard';
import { TablePagination } from './components/TablePagination';

import TrackAnalysisModal from '~/components/TrackAnalysisModal';
import { Badge } from '~/shared/components/ui/badge';
import { Button } from '~/shared/components/ui/button';

// Styles for the component
interface StylesType {
  card: string;
  iconContainer: string;
  tableHeader: string;
  tableCell: string;
  tableRow: string;
  button: {
    outline: string;
  };
}

const styles: StylesType = {
  card: "bg-gray-900/80 border-gray-800",
  iconContainer: "p-2 rounded-full",
  tableHeader: "text-left px-4 py-3 text-sm font-medium text-gray-400",
  tableCell: "px-4 py-3 text-white",
  tableRow: "border-b border-gray-800/50 hover:bg-gray-800/30",
  button: {
    outline: "border-gray-700 text-white hover:bg-gray-800 bg-gray-800/50"
  }
};

// Helper function to determine analysis status
const getAnalysisStatus = (track: TrackWithAnalysis): AnalysisStatus => {
  if (!track.analysis) return 'not_analyzed';
  // You might want to add more logic here based on your application's requirements
  // For example, checking if analysis.analysis contains certain fields or values
  return 'analyzed';
};

interface LikedSongsTableProps {
  likedSongs: TrackWithAnalysis[];
}

// Main LikedSongsTable component
export const LikedSongsTable = ({ likedSongs }: LikedSongsTableProps) => {
  // State for tracking visible columns
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    select: true,
    title: true,
    artist: true,
    album: true,
    status: true
  });

  // State for search functionality
  const [globalFilter, setGlobalFilter] = useState('');

  // State for row selection
  const [rowSelection, setRowSelection] = useState({});

  // State for track analysis modal
  const [selectedTrack, setSelectedTrack] = useState<TrackWithAnalysis | null>(null);
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);

  // Create column helper for TypeScript support
  const columnHelper = createColumnHelper<TrackWithAnalysis>();

  // Calculate stats for display
  const stats = useMemo(() => {
    const analyzed = likedSongs.filter(track => getAnalysisStatus(track) === 'analyzed').length;
    const notAnalyzed = likedSongs.filter(track => getAnalysisStatus(track) === 'not_analyzed').length;

    return {
      analyzed,
      pending: 0, // You might want to add logic to detect pending analyses
      notAnalyzed,
      failed: 0, // You might want to add logic to detect failed analyses
      total: likedSongs.length
    };
  }, [likedSongs]);

  // Define table columns
  const columns = useMemo(() => [
    columnHelper.accessor(row => row.track.name, {
      id: 'title',
      header: 'Title',
      cell: info => <div className="font-medium text-white">{info.getValue()}</div>
    }),
    columnHelper.accessor(row => row.track.artist, {
      id: 'artist',
      header: 'Artist',
      cell: info => info.getValue()
    }),
    columnHelper.accessor(row => row.track.album, {
      id: 'album',
      header: 'Album',
      cell: info => info.getValue() || 'N/A'
    }),
    columnHelper.accessor(row => row.liked_at, {
      id: 'addedAt',
      header: 'Date Added',
      cell: info => new Date(info.getValue()).toLocaleDateString()
    }),
    columnHelper.accessor(row => getAnalysisStatus(row), {
      id: 'analysisStatus',
      header: 'Status',
      cell: info => (
        <div className="flex justify-start">
          <AnalysisBadge
            status={info.getValue()}
            onView={() => handleViewAnalysis(info.row.original)}
            onAnalyze={() => handleAnalyzeTrack(info.row.original)}
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
            className="data-[state=checked]:bg-blue-500 border-gray-600"
          />
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex justify-center">
          <Checkbox
            checked={row.getIsSelected()}
            disabled={getAnalysisStatus(row.original) === 'pending'}
            onCheckedChange={value => row.toggleSelected(!!value)}
            aria-label="Select row"
            className="data-[state=checked]:bg-blue-500 border-gray-600"
          />
        </div>
      )
    })
  ], []);

  const handleViewAnalysis = (track: TrackWithAnalysis) => {
    setSelectedTrack(track);
    setIsAnalysisModalOpen(true);
  };

  const handleAnalyzeTrack = (track: TrackWithAnalysis) => {
    console.log('Analyzing track:', track);
    // Here you would implement the actual track analysis logic
  };

  const handleAnalyzeSelected = () => {
    const selectedTracks = Object.keys(rowSelection).map(
      index => likedSongs[parseInt(index)]
    );
    console.log('Analyzing selected tracks:', selectedTracks);
    // Here you would implement the actual track analysis logic for multiple tracks
  };

  const table = useReactTable({
    data: likedSongs,
    columns,
    state: {
      columnVisibility,
      globalFilter,
      rowSelection,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  // Click outside handler to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Add your click outside logic here if needed
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="h-full flex flex-col space-y-6">
      {/* Track Analysis Modal */}
      {selectedTrack && (
        <TrackAnalysisModal
          trackName={selectedTrack.track.name}
          artistName={selectedTrack.track.artist}
          analysis={selectedTrack.analysis?.analysis}
          isOpen={isAnalysisModalOpen}
          onOpenChange={setIsAnalysisModalOpen}
        />
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Liked Songs Analysis</h1>
        <p className="text-white">Manage and analyze your liked songs from Spotify</p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatusCard
          title="Total Tracks"
          value={stats.total}
          icon={<Music className="h-6 w-6 text-white" />}
        />

        <StatusCard
          title="Analyzed"
          value={stats.analyzed}
          valueColor="text-green-400"
          iconBg="bg-green-500/20"
          icon={<CheckCircle className="h-6 w-6 text-green-400" />}
        />

        <StatusCard
          title="In Progress"
          value={stats.pending}
          valueColor="text-blue-400"
          iconBg="bg-blue-500/20"
          icon={<Clock className="h-6 w-6 text-blue-400" />}
        />

        <StatusCard
          title="Not Analyzed"
          value={stats.notAnalyzed + stats.failed}
          icon={<AlertCircle className="h-6 w-6 text-gray-400" />}
        />
      </div>

      {/* Table Card */}
      <Card className={`${styles.card} flex-1`}>
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
              {/* Column visibility with direct imperative state control */}
              <div className="relative">
                <Button
                  id="column-visibility-button"
                  variant="outline"
                  className={`${styles.button.outline} flex gap-1`}
                  type="button"
                  onClick={() => {
                    // Directly toggle a visible state for the dropdown
                    const menuElement = document.getElementById('column-visibility-menu');
                    if (menuElement) {
                      const isVisible = menuElement.style.display === 'block';
                      menuElement.style.display = isVisible ? 'none' : 'block';
                    }
                  }}
                >
                  <Columns className="h-4 w-4" />
                  <span className="hidden md:inline">Columns</span>
                </Button>

                {/* Custom dropdown implementation */}
                <div
                  id="column-visibility-menu"
                  className="absolute right-0 top-full mt-1 bg-gray-800/95 border border-gray-700 text-white w-52 p-2 rounded-md shadow-lg z-50"
                  style={{ display: 'none' }}
                >
                  <div className="text-gray-300 font-semibold px-2 mb-2">Toggle columns</div>
                  <div className="h-px bg-gray-700 mb-2" />

                  {table.getAllLeafColumns().filter(column => column.id !== 'select').map((column) => (
                    <div
                      key={column.id}
                      className="flex items-center gap-2 px-2 py-2 hover:bg-gray-700/70 rounded cursor-pointer"
                      onClick={() => {
                        // Toggle visibility directly
                        const newValue = !column.getIsVisible();
                        column.toggleVisibility(newValue);

                        // Update state explicitly
                        setColumnVisibility(prev => {
                          const updatedState: VisibilityState = {
                            ...prev,
                            [column.id]: newValue
                          };
                          return updatedState;
                        });
                      }}
                    >
                      <Checkbox
                        checked={column.getIsVisible()}
                        className="data-[state=checked]:bg-blue-500 border-gray-600"
                      />
                      <span className="capitalize">
                        {column.id.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Analyze selected tracks button */}
              <Button
                className="bg-white text-gray-900 hover:bg-white/90 border-0"
                disabled={Object.keys(rowSelection).length === 0}
                onClick={handleAnalyzeSelected}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Analyze Selected
              </Button>
            </div>
          </div>
        </CardHeader>

        <div className="p-4 border-b border-gray-800">
          <SearchInput
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Search all columns..."
          />
        </div>

        <CardContent className="p-0">
          <div className="relative overflow-auto">
            <table className="w-full">
              <thead className="border-b border-gray-800">
                {table.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map(header => {
                      // Only render headers for visible columns
                      if (!header.column.getIsVisible()) {
                        return null;
                      }
                      return (
                        <th
                          key={header.id}
                          className={styles.tableHeader}
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
                      );
                    })}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map(row => (
                  <tr
                    key={row.id}
                    className={styles.tableRow}
                  >
                    {row.getVisibleCells().map(cell => (
                      <td
                        key={cell.id}
                        className={styles.tableCell}
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
            <TablePagination table={table} />
          </div>
        </CardFooter>
      </Card>

      {/* Track Analysis Modal */}
      {selectedTrack && (
        <TrackAnalysisModal
          trackName={selectedTrack.track.name}
          artistName={selectedTrack.track.artist}
          analysis={selectedTrack.analysis?.analysis}
          isOpen={isAnalysisModalOpen}
          onOpenChange={setIsAnalysisModalOpen}
        />
      )}
    </div>
  );
};
