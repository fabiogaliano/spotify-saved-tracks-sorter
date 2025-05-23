import React, { useState, useEffect } from 'react';
import { Badge } from '~/shared/components/ui/badge';
import { useLikedSongs } from '../context';
import type { UIAnalysisStatus } from '~/lib/models/Track';
import { AlertCircle, CheckCircle, Clock, Eye, Music, RefreshCw } from 'lucide-react';
import type { AnalysisStatusResponse, ErrorStatusResponse } from '~/routes/api.analysis.status';

interface TrackRowAnalysisIndicatorProps {
  trackId: number;
  initialStatus: UIAnalysisStatus;
  onView?: () => void;
  onAnalyze?: () => void;
}

const badgeStyle: Record<UIAnalysisStatus, string> = {
  analyzed: "bg-green-500/20 border-green-500 text-green-400 hover:bg-green-500/30 cursor-pointer",
  pending: "bg-blue-500/20 border-blue-500 text-blue-400",
  not_analyzed: "bg-gray-500/20 border-gray-600 text-gray-400 hover:bg-gray-500/30 cursor-pointer",
  failed: "bg-red-500/20 border-red-500 text-red-400 hover:bg-red-500/30 cursor-pointer",
  unknown: "bg-gray-500/20 border-gray-600 text-gray-400"
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
  const { updateSongAnalysisDetails } = useLikedSongs();
  
  // Update local status when initialStatus changes from parent
  useEffect(() => {
    setStatus(initialStatus);
  }, [initialStatus]);

  useEffect(() => {
    let pollingInterval: NodeJS.Timeout | null = null;

    if (status === 'pending') {
      const checkStatus = async () => {
        try {
          const response = await fetch(`/api/analysis/status?trackId=${trackId}`);
          if (response.ok) {
            const data = await response.json() as AnalysisStatusResponse | ErrorStatusResponse;

            // Handle error response
            if ('error' in data && data.status === 'unknown') {
              console.error('Error from API:', data.error);
              return false;
            }

            if (data.status === 'analyzed' || data.status === 'failed') {
              console.log(`[Polling] Track ${trackId} analysis ${data.status}`);
              setStatus(data.status);

              // Just update the status without fetching the full analysis data
              // The analysis data will be fetched on-demand when the user clicks the badge
              if (data.status === 'failed' && 'error' in data) {
                console.warn(`Analysis failed: ${data.error} (${data.errorType})`);
              }

              // Just update the status for now
              updateSongAnalysisDetails(trackId, null, data.status);

              return true;
            }
          }
          return false;
        } catch (error) {
          console.error('Error polling for analysis status:', error);
          return false;
        }
      };

      checkStatus();

      pollingInterval = setInterval(async () => {
        const statusChanged = await checkStatus();
        if (statusChanged && pollingInterval) {
          clearInterval(pollingInterval);
          pollingInterval = null;
        }
      }, 3000);
    }

    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [trackId, status, updateSongAnalysisDetails]);

  const handleClick = () => {
    if (status === 'analyzed') {
      // Simply call the view handler - data fetching will happen in LikedSongsTable
      if (onView) onView();
    } else if ((status === 'not_analyzed' || status === 'failed') && onAnalyze) {
      onAnalyze();
      setStatus('pending');
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
