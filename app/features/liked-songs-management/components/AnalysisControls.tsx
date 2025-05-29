import { Columns, RefreshCw } from 'lucide-react';
import { useEffect } from 'react';
import { Button } from '~/shared/components/ui/button';
import { Checkbox } from '~/shared/components/ui/checkbox';
import { VisibilityState } from '@tanstack/react-table';

interface AnalysisControlsProps {
  rowSelection: Record<string, boolean>;
  onAnalyzeSelected: () => void;
  columnVisibility: VisibilityState;
  onColumnVisibilityChange: (visibility: VisibilityState) => void;
  columns: { id: string; getIsVisible?: () => boolean; toggleVisibility?: (value?: boolean) => void }[];
}

export const AnalysisControls = ({
  onColumnVisibilityChange,
  onAnalyzeSelected,
  rowSelection,
  columnVisibility,
  columns
}: AnalysisControlsProps) => {

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-2">
        {/* Column visibility dropdown */}
        <div className="relative">
          <Button
            id="column-visibility-button"
            variant="outline"
            className="border-border text-foreground hover:bg-card bg-card/50 flex gap-1"
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
            className="absolute right-0 top-full mt-1 bg-card/95 border border-border text-foreground w-52 p-2 rounded-md shadow-lg z-50"
            style={{ display: 'none' }}
          >
            <div className="text-muted-foreground font-semibold px-2 mb-2">Toggle columns</div>
            <div className="h-px bg-secondary mb-2" />

            {columns.map((column) => (
              <div
                key={column.id}
                className="flex items-center gap-2 px-2 py-2 hover:bg-secondary/70 rounded cursor-pointer"
                onClick={() => {
                  if (column.toggleVisibility) {
                    // Toggle visibility directly if it's a table column
                    const newValue = !(column.getIsVisible ? column.getIsVisible() : columnVisibility[column.id]);
                    column.toggleVisibility(newValue);

                    // Update state explicitly
                    onColumnVisibilityChange({
                      ...columnVisibility,
                      [column.id]: newValue
                    });
                  }
                }}
              >
                <Checkbox
                  checked={column.getIsVisible ? column.getIsVisible() : columnVisibility[column.id]}
                  className="data-[state=checked]:bg-blue-500 border-border"
                />
                <span className="capitalize">
                  {column.id.replace(/([A-Z])/g, ' $1').trim()}
                </span>
              </div>
            ))}
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
        Analyze Selected
      </Button>
    </div>
  );
};
