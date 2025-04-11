import { AlertCircle, CheckCircle, Clock, Eye, Music, RefreshCw } from 'lucide-react';
import { Badge } from '~/shared/components/ui/badge';

export type AnalysisStatus = 'analyzed' | 'pending' | 'not_analyzed' | 'failed';

interface AnalysisBadgeProps {
  status: AnalysisStatus;
  onAnalyze: () => void;
  onView: () => void;
}

// Analysis badge component
export const AnalysisBadge = ({ status, onAnalyze, onView }: AnalysisBadgeProps) => {
  const badgeStyle: Record<AnalysisStatus, string> = {
    analyzed: "bg-green-500/20 border-green-500 text-green-400 hover:bg-green-500/30 cursor-pointer",
    pending: "bg-blue-500/20 border-blue-500 text-blue-400",
    not_analyzed: "bg-gray-500/20 border-gray-600 text-gray-400 hover:bg-gray-500/30 cursor-pointer",
    failed: "bg-red-500/20 border-red-500 text-red-400 hover:bg-red-500/30 cursor-pointer"
  };

  const statusText: Record<AnalysisStatus, string> = {
    analyzed: "Analyzed",
    pending: "In Progress",
    not_analyzed: "Not Analyzed",
    failed: "Failed"
  };

  const handleClick = () => {
    if (status === 'analyzed') {
      onView();
    } else if (status === 'not_analyzed' || status === 'failed') {
      onAnalyze();
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
