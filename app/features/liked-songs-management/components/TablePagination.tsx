import { Table } from '@tanstack/react-table';
import { Button } from '~/shared/components/ui/button';

interface StylesType {
  button: {
    outline: string;
  };
}

const styles: StylesType = {
  button: {
    outline: "border-gray-700 text-white hover:bg-gray-800 bg-gray-800/50"
  }
};

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
        className={styles.button.outline}
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
        className={styles.button.outline}
        onClick={() => table.nextPage()}
        disabled={!table.getCanNextPage()}
      >
        Next
      </Button>
    </div>
  );
};
