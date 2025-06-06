import { RefreshCw, Sparkles, Play } from 'lucide-react';
import { Button } from '~/shared/components/ui/button';

interface AnalysisControlsProps {
  selectedCount: number;
  totalCount: number;
  analyzedCount: number;
  onAnalyzeSelected: () => void;
  onAnalyzeAll: () => void;
  isAnalyzing: boolean;
  disabled: boolean;
}

export const AnalysisControls = ({
  selectedCount,
  totalCount,
  analyzedCount,
  onAnalyzeSelected,
  onAnalyzeAll,
  isAnalyzing,
  disabled
}: AnalysisControlsProps) => {
  const unanalyzedCount = totalCount - analyzedCount;

  return (
    <div className="flex items-center justify-between gap-4 p-4 bg-card/50 border border-border rounded-lg">
      <div className="flex items-center gap-4">
        <div className="text-sm text-muted-foreground">
          <span className="font-medium">{selectedCount}</span> selected • 
          <span className="font-medium ml-1">{unanalyzedCount}</span> unanalyzed
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
          variant="default"
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