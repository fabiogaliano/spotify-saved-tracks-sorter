import { RefreshCw, Sparkles, Play, Columns } from 'lucide-react';
import { Button } from '~/shared/components/ui/button';
import { Checkbox } from '~/shared/components/ui/checkbox';
import { useEffect, useRef } from 'react';

interface AnalysisControlsProps {
  selectedCount: number;
  totalCount: number;
  analyzedCount: number;
  unanalyzedCount: number;
  onAnalyzeSelected: () => void;
  onAnalyzeAll: () => void;
  isAnalyzing: boolean;
  disabled: boolean;
  columnVisibility: Record<string, boolean>;
  onColumnVisibilityChange: (visibility: Record<string, boolean>) => void;
}

export const AnalysisControls = ({
  selectedCount,
  totalCount,
  analyzedCount,
  unanalyzedCount,
  onAnalyzeSelected,
  onAnalyzeAll,
  isAnalyzing,
  disabled,
  columnVisibility,
  onColumnVisibilityChange
}: AnalysisControlsProps) => {
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const dropdown = document.getElementById('column-visibility-menu');
      const button = document.getElementById('column-visibility-button');
      
      if (dropdown && button && 
          !dropdown.contains(event.target as Node) && 
          !button.contains(event.target as Node)) {
        dropdown.style.display = 'none';
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const columns = [
    { id: 'title', label: 'Title' },
    { id: 'artist', label: 'Artist' },
    { id: 'album', label: 'Album' },
    { id: 'addedAt', label: 'Date Added' },
    { id: 'analysisStatus', label: 'Status' }
  ];

  return (
    <div className="flex items-center gap-6">
      {/* Column visibility dropdown */}
      <div className="relative">
        <Button
          id="column-visibility-button"
          variant="outline"
          size="sm"
          className="h-10"
          onClick={() => {
            const menu = document.getElementById('column-visibility-menu');
            if (menu) {
              const isVisible = menu.style.display === 'block';
              menu.style.display = isVisible ? 'none' : 'block';
            }
          }}
        >
          <Columns className="h-4 w-4 mr-2" />
          Columns
        </Button>

        {/* Custom dropdown */}
        <div
          id="column-visibility-menu"
          className="absolute right-0 top-full mt-1 bg-card border border-border w-48 p-2 rounded-md shadow-lg z-50"
          style={{ display: 'none' }}
        >
          <div className="text-sm font-medium text-muted-foreground px-2 py-1">Toggle columns</div>
          <div className="h-px bg-border my-1" />
          
          {columns.map((column) => (
            <div
              key={column.id}
              className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted/50 rounded cursor-pointer"
              onClick={() => {
                onColumnVisibilityChange({
                  ...columnVisibility,
                  [column.id]: !columnVisibility[column.id]
                });
              }}
            >
              <Checkbox
                checked={columnVisibility[column.id] !== false}
                className="h-4 w-4"
              />
              <span className="text-sm">{column.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          disabled={selectedCount === 0 || disabled}
          onClick={onAnalyzeSelected}
          className="flex items-center gap-2"
        >
          <Sparkles className={`h-4 w-4 ${isAnalyzing ? 'animate-pulse' : ''}`} />
          Analyze Selected ({selectedCount})
        </Button>

        <Button
          variant="outline"
          disabled={unanalyzedCount === 0 || disabled}
          onClick={onAnalyzeAll}
          className="flex items-center gap-2"
        >
          <Play className={`h-4 w-4 ${isAnalyzing ? 'animate-pulse' : ''}`} />
          Analyze All ({unanalyzedCount})
        </Button>
      </div>
    </div>
  );
};