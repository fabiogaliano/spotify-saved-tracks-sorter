import { Table } from '@tanstack/react-table';
import { Button } from '~/shared/components/ui/button';


interface TablePaginationProps {
  table: Table<any>;
}

// Table Pagination component
export const TablePagination = ({ table }: TablePaginationProps) => {
  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => table.previousPage()}
        disabled={!table.getCanPreviousPage()}
      >
        Previous
      </Button>
      <span className="text-foreground">
        Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={() => table.nextPage()}
        disabled={!table.getCanNextPage()}
      >
        Next
      </Button>
    </div>
  );
};
