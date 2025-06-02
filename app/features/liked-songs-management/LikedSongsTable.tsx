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

import { TrackRowAnalysisIndicator } from './components/TrackRowAnalysisIndicator';
import { SearchInput } from './components/SearchInput';
import { StatusCard } from './components/StatusCard';
import { StatusCardWithJobStatus } from './components/StatusCardWithJobStatus';
import { TablePagination } from './components/TablePagination';
import { AnalysisJobStatus } from './components/AnalysisJobStatus';
import { AnalysisControls } from './components/AnalysisControls';

import TrackAnalysisModal from '~/components/TrackAnalysisModal';
import { Badge } from '~/shared/components/ui/badge';
import { useLikedSongs } from './context';

// Define UIAnalysisStatus (can be moved to a shared types file later)
export type UIAnalysisStatus = 'analyzed' | 'pending' | 'not_analyzed' | 'failed' | 'unknown';

// Assume TrackWithAnalysis from context will now include:
// uiAnalysisStatus: UIAnalysisStatus;

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
  card: "bg-card border-border",
  iconContainer: "p-2 rounded-full",
  tableHeader: "text-left px-4 py-3 text-sm font-medium text-muted-foreground",
  tableCell: "px-4 py-3 text-foreground",
  tableRow: "border-b border-border/50 hover:bg-card/30",
  button: {
    outline: "border-border text-foreground hover:bg-card bg-card/50"
  }
};

// Helper function getAnalysisStatus is less relevant now as we rely on track.uiAnalysisStatus
// const getAnalysisStatus = (track: TrackWithAnalysis): AnalysisStatus => {
//   if (!track.analysis) return 'not_analyzed';
//   return 'analyzed';
// };

// Main LikedSongsTable component
export const LikedSongsTable = () => {
  // Get data from context
  const {
    likedSongs,
    rowSelection,
    setRowSelection,
    currentJob,
    updateSongAnalysisDetails,
    tracksProcessed,
    tracksSucceeded,
    tracksFailed,
    analyzeTracks,
  } = useLikedSongs();

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

  // State for pagination to prevent resetting when analysis is triggered
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 20,
  });

  // State for track analysis modal
  const [selectedTrack, setSelectedTrack] = useState<TrackWithAnalysis | null>(null);
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);

  // Create column helper for TypeScript support
  const columnHelper = createColumnHelper<TrackWithAnalysis>();

  // Calculate stats for display
  const stats = useMemo(() => {
    // Updated to use uiAnalysisStatus
    const analyzed = likedSongs.filter(track => track.uiAnalysisStatus === 'analyzed').length;
    const pending = likedSongs.filter(track => track.uiAnalysisStatus === 'pending').length;
    const notAnalyzed = likedSongs.filter(track => track.uiAnalysisStatus === 'not_analyzed').length;
    const failed = likedSongs.filter(track => track.uiAnalysisStatus === 'failed').length;

    return {
      analyzed,
      pending,
      notAnalyzed,
      failed,
      total: likedSongs.length
    };
  }, [likedSongs]);

  // Define table columns
  const columns = useMemo(() => [
    columnHelper.accessor(row => row.track.name, {
      id: 'title',
      header: 'Title',
      cell: info => <div className="font-medium text-foreground">{info.getValue()}</div>
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
    columnHelper.accessor('uiAnalysisStatus', { // Accesses the new field directly
      id: 'analysisStatus',
      header: 'Status',
      cell: ({ row }) => {
        const track = row.original;
        return (
          <div className="flex justify-start">
            <TrackRowAnalysisIndicator
              trackId={track.track.id}
              initialStatus={track.uiAnalysisStatus}
              onView={() => handleViewAnalysis(track)}
              onAnalyze={() => analyzeTrack(track.track.id)}
            />
          </div>
        );
      }
    }),
    columnHelper.display({
      id: 'select',
      header: ({ table }) => (
        <div className="flex justify-center">
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            onCheckedChange={value => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
            className="data-[state=checked]:bg-blue-500 border-border"
          />
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex justify-center">
          <Checkbox
            checked={row.getIsSelected()}
            disabled={row.original.uiAnalysisStatus === 'pending' || row.original.uiAnalysisStatus === 'analyzed'} // Disable for both pending and analyzed tracks
            onCheckedChange={value => row.toggleSelected(!!value)}
            aria-label="Select row"
            className="data-[state=checked]:bg-blue-500 border-border"
          />
        </div>
      )
    })
  ], [likedSongs, updateSongAnalysisDetails]); // Added updateSongAnalysisDetails and likedSongs as dependency for columns that use it.

  const handleViewAnalysis = (track: TrackWithAnalysis) => {
    setSelectedTrack(track);
    setIsAnalysisModalOpen(true);
  };

  // Inline analysis functions (replacing useTrackAnalysis hook)
  const analyzeTrack = async (trackId: number) => {
    try {
      await analyzeTracks({ trackId });
    } catch (error) {
      console.error('Error analyzing track:', error);
    }
  };

  const analyzeSelectedTracks = () => {
    analyzeTracks({ useSelected: true });
  };

  const analyzeAllTracks = () => {
    analyzeTracks({ useAll: true });
  };

  // Use a stable key for the table data to prevent full remounts
  const tableData = useMemo(() => likedSongs, [likedSongs]);

  const table = useReactTable({
    data: tableData,
    columns,
    state: {
      columnVisibility,
      globalFilter,
      rowSelection,
      pagination,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    // Add autoResetPageIndex: false to prevent page reset when data changes
    autoResetPageIndex: false,
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
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-1">Liked Songs Analysis</h1>
        <p className="text-foreground">Manage and analyze your liked songs from Spotify</p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatusCard
          title="Total Tracks"
          value={stats.total}
          icon={<Music className="h-6 w-6 text-foreground" />}
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
          currentJob={currentJob}
          showJobStatus={!!currentJob}
          tracksProcessed={tracksProcessed}
          tracksSucceeded={tracksSucceeded}
          tracksFailed={tracksFailed}
        />

        <StatusCard
          title="Not Analyzed"
          value={stats.notAnalyzed + stats.failed}
          icon={<AlertCircle className="h-6 w-6 text-muted-foreground" />}
        />
      </div>

      {/* Table Card */}
      <Card className={`${styles.card} flex-1`}>
        <CardHeader className="pb-2 border-b border-border">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <CardTitle className="text-lg flex items-center gap-2 text-foreground">
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

            <div className="space-y-4">
              {/* Analysis controls with integrated column visibility */}
              <AnalysisControls
                rowSelection={rowSelection}
                onAnalyzeSelected={() => analyzeSelectedTracks()}
                columnVisibility={columnVisibility}
                onColumnVisibilityChange={setColumnVisibility}
                columns={table.getAllColumns().filter(column => column.id !== 'select')}
              />
            </div>
          </div>

          <div className="mt-4">
            <SearchInput
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder="Search all columns..."
            />
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="relative overflow-auto">
            <table className="w-full">
              <thead className="border-b border-border">
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

        <CardFooter className="border-t border-border p-4">
          <div className="flex justify-between w-full">
            <div className="text-sm text-muted-foreground">
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
