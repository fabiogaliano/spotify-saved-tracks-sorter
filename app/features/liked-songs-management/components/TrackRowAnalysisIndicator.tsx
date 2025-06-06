import { Badge } from '~/shared/components/ui/badge';
import type { UIAnalysisStatus } from '~/lib/models/Track';
import { AlertCircle, CheckCircle, Clock, Eye, Music, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';

interface TrackRowAnalysisIndicatorProps {
  trackId: number;
  initialStatus: UIAnalysisStatus;
  onView?: () => void;
  onAnalyze?: () => void;
}

const badgeStyle: Record<UIAnalysisStatus, string> = {
  analyzed: "bg-green-500/20 border-green-500 text-green-400 hover:bg-green-500/30 cursor-pointer",
  pending: "bg-blue-500/20 border-blue-500 text-blue-400",
  not_analyzed: "bg-secondary/20 border-border text-muted-foreground hover:bg-secondary/30 cursor-pointer",
  failed: "bg-red-500/20 border-red-500 text-red-400 hover:bg-red-500/30 cursor-pointer",
  unknown: "bg-secondary/20 border-border text-muted-foreground"
};

const statusText: Record<UIAnalysisStatus, string> = {
  analyzed: "Analyzed",
  pending: "In Progress",
  not_analyzed: "Not Analyzed",
  failed: "Failed",
  unknown: "Unknown"
};

export const TrackRowAnalysisIndicator: React.FC<TrackRowAnalysisIndicatorProps> = ({
  trackId,
  initialStatus,
  onView,
  onAnalyze
}) => {
  const [status, setStatus] = useState<UIAnalysisStatus>(initialStatus);

  // Update local status when initialStatus changes from parent
  useEffect(() => {
    setStatus(initialStatus);
  }, [initialStatus]);

  const handleClick = () => {
    if (status === 'analyzed') {
      if (onView) onView();
    } else if ((status === 'not_analyzed' || status === 'failed') && onAnalyze) {
      onAnalyze();
      // Don't set to pending here - let the mutation handle it optimistically
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
