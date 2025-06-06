import { Table } from '@tanstack/react-table';
import { Button } from '~/shared/components/ui/button';


interface TablePaginationProps {
  table: Table<any>;
}

// Table Pagination component
export const TablePagination = ({ table }: TablePaginationProps) => {
  const state = table.getState();
  const pageCount = table.getPageCount();
  const currentPage = state.pagination.pageIndex + 1;
  const totalRows = table.getFilteredRowModel().rows.length;
  const pageSize = state.pagination.pageSize;
  const startRow = state.pagination.pageIndex * pageSize + 1;
  const endRow = Math.min(startRow + pageSize - 1, totalRows);

  return (
    <div className="flex items-center justify-between">
      <div className="text-sm text-muted-foreground">
        Showing {startRow} to {endRow} of {totalRows} tracks
      </div>
      
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.setPageIndex(0)}
          disabled={!table.getCanPreviousPage()}
        >
          First
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Previous
        </Button>
        
        <span className="text-sm text-foreground px-2">
          Page {currentPage} of {pageCount}
        </span>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Next
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.setPageIndex(pageCount - 1)}
          disabled={!table.getCanNextPage()}
        >
          Last
        </Button>
      </div>
    </div>
  );
};
