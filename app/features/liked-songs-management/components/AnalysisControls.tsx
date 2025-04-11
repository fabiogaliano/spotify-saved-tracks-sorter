import { Columns, RefreshCw } from 'lucide-react';
import { Button } from '~/shared/components/ui/button';
import { Checkbox } from '~/shared/components/ui/checkbox';

interface AnalysisControlsProps {
  rowSelection: Record<string, boolean>;
  onAnalyzeSelected: () => void;
  columnVisibility: Record<string, boolean>;
  onColumnVisibilityChange: (visibility: Record<string, boolean>) => void;
  columns: { id: string }[];
  onToggleColumnVisibility: (columnId: string) => void;
}

export const AnalysisControls = ({
  rowSelection,
  onAnalyzeSelected,
  columnVisibility,
  onColumnVisibilityChange,
  columns,
  onToggleColumnVisibility
}: AnalysisControlsProps) => {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-2">
        {/* Column visibility dropdown */}
        <div className="relative">
          <Button
            variant="outline"
            className="border-gray-700 text-white hover:bg-gray-800 bg-gray-800/50"
          >
            <Columns className="h-4 w-4 mr-2" />
            Columns
          </Button>
          <div className="absolute z-50 mt-2 w-48 rounded-md shadow-lg bg-gray-900 border border-gray-800 overflow-hidden">
            <div className="p-2 space-y-1">
              {columns.map(column => (
                <div
                  key={column.id}
                  className="flex items-center space-x-2 p-2 hover:bg-gray-800 rounded-md"
                  onClick={() => onToggleColumnVisibility(column.id)}
                >
                  <Checkbox
                    checked={columnVisibility[column.id]}
                    className="data-[state=checked]:bg-blue-500 border-gray-600"
                  />
                  <span className="capitalize">
                    {column.id.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Analyze selected tracks button */}
      <Button
        className="bg-white text-gray-900 hover:bg-white/90 border-0"
        disabled={Object.keys(rowSelection).length === 0}
        onClick={onAnalyzeSelected}
      >
        <RefreshCw className="h-4 w-4 mr-2" />
        Analyze SelectedX
      </Button>
    </div>
  );
};
