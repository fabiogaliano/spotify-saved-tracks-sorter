import { ReactNode, useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '~/shared/components/ui/Card';
import { InfoIcon, X } from 'lucide-react';
import { AnalysisJobStatus } from './AnalysisJobStatus';
import { AnalysisJob } from '../context';

interface StylesType {
  card: string;
  iconContainer: string;
}

// Common styles
const styles: StylesType = {
  card: "bg-gray-900/80 border-gray-800",
  iconContainer: "p-2 rounded-full"
};

interface StatusCardWithJobStatusProps {
  title: string;
  value: number;
  icon: ReactNode;
  iconBg?: string;
  valueColor?: string;
  currentJob?: AnalysisJob | null;
  showJobStatus?: boolean;
  tracksProcessed?: number;
  tracksSucceeded?: number;
  tracksFailed?: number;
}

// Status Card component with job status tooltip
export const StatusCardWithJobStatus = ({
  title,
  value,
  icon,
  iconBg,
  valueColor = 'text-white',
  currentJob,
  showJobStatus = false,
  tracksProcessed = 0,
  tracksSucceeded = 0,
  tracksFailed = 0
}: StatusCardWithJobStatusProps) => {
  // State to control tooltip open/close
  const [open, setOpen] = useState(false);
  const [manuallyClosedByUser, setManuallyClosedByUser] = useState(false);
  const autoCloseTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastJobIdRef = useRef<string | null>(null);

  // Persistent job state to survive context clearing
  const [persistentJob, setPersistentJob] = useState<AnalysisJob | null>(null);
  const [persistentStats, setPersistentStats] = useState({ processed: 0, succeeded: 0, failed: 0 });

  // Show tooltip if we have showJobStatus enabled and either a current job OR a recently completed persistent job
  const shouldShowTooltip = showJobStatus && (currentJob || persistentJob);

  // Track the job and update persistent state
  useEffect(() => {
    console.log('StatusCardWithJobStatus: Job state update', {
      hasCurrentJob: !!currentJob,
      currentJobId: currentJob?.id,
      currentJobStatus: currentJob?.status,
      tracksProcessed,
      tracksSucceeded,
      tracksFailed,
      hasPersistentJob: !!persistentJob,
      persistentJobId: persistentJob?.id
    });

    if (currentJob) {
      // We have an active job - always update persistent state
      console.log('StatusCardWithJobStatus: Updating persistent state with current job');
      setPersistentJob(currentJob);
      setPersistentStats({ 
        processed: tracksProcessed, 
        succeeded: tracksSucceeded, 
        failed: tracksFailed 
      });
    }
    // If currentJob is null, DO NOT update persistent stats - keep the last known values
  }, [currentJob]); // Only depend on currentJob, not the counters

  // Separate effect to update stats when counters change (only if we have a current job)
  useEffect(() => {
    if (currentJob) {
      console.log('StatusCardWithJobStatus: Updating counter stats');
      setPersistentStats({ 
        processed: tracksProcessed, 
        succeeded: tracksSucceeded, 
        failed: tracksFailed 
      });
    }
  }, [tracksProcessed, tracksSucceeded, tracksFailed, currentJob]);

  // Stable display values - use persistent stats when available
  const stableValues = persistentStats;

  // Handle job state changes using persistentJob
  useEffect(() => {
    const activeJob = currentJob || persistentJob;
    
    console.log('StatusCardWithJobStatus: Job state change handler', {
      hasActiveJob: !!activeJob,
      activeJobId: activeJob?.id,
      activeJobStatus: activeJob?.status,
      lastJobId: lastJobIdRef.current,
      open,
      manuallyClosedByUser
    });
    
    if (!activeJob) {
      // Only close immediately if we had no previous job (initial state)
      if (!lastJobIdRef.current) {
        console.log('StatusCardWithJobStatus: No job and no previous job, closing tooltip');
        setOpen(false);
        setManuallyClosedByUser(false);
      }
      return;
    }

    // Check if this is a new job
    const isNewJob = activeJob.id !== lastJobIdRef.current;

    if (isNewJob) {
      // New job started - reset state and open tooltip
      console.log('StatusCardWithJobStatus: New job started, opening tooltip');
      lastJobIdRef.current = activeJob.id;
      setManuallyClosedByUser(false);
      setOpen(true);
      
      // Reset persistent stats for new job
      setPersistentStats({ processed: 0, succeeded: 0, failed: 0 });

      // Clear any existing timer
      if (autoCloseTimerRef.current) {
        clearTimeout(autoCloseTimerRef.current);
        autoCloseTimerRef.current = null;
      }

      // Set auto-close timer for 30 seconds
      autoCloseTimerRef.current = setTimeout(() => {
        console.log('StatusCardWithJobStatus: Auto-close timer fired');
        setOpen(false);
      }, 30000);
    } else if (activeJob.status === 'completed' || activeJob.status === 'failed') {
      // Job finished - KEEP tooltip open and set 30s timer to close it
      console.log('StatusCardWithJobStatus: Job completed/failed, keeping tooltip open for 30s');
      if (autoCloseTimerRef.current) {
        clearTimeout(autoCloseTimerRef.current);
      }
      
      // Keep tooltip open to show final status
      setOpen(true);
      
      autoCloseTimerRef.current = setTimeout(() => {
        console.log('StatusCardWithJobStatus: Cleanup timer fired, clearing persistent state');
        setOpen(false);
        setManuallyClosedByUser(false);
        lastJobIdRef.current = null;
        setPersistentJob(null);
        setPersistentStats({ processed: 0, succeeded: 0, failed: 0 });
      }, 30000);
    }
  }, [currentJob?.id, currentJob?.status, persistentJob?.id, persistentJob?.status, manuallyClosedByUser]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (autoCloseTimerRef.current) {
        clearTimeout(autoCloseTimerRef.current);
      }
    };
  }, []);

  // Manual close handler
  const handleManualClose = () => {
    setOpen(false);
    setManuallyClosedByUser(true);
    if (autoCloseTimerRef.current) {
      clearTimeout(autoCloseTimerRef.current);
      autoCloseTimerRef.current = null;
    }
    // Clear persistent state when manually closed
    setPersistentJob(null);
    setPersistentStats({ processed: 0, succeeded: 0, failed: 0 });
    lastJobIdRef.current = null;
  };

  // Calculate remaining tracks from stable values
  const activeJob = currentJob || persistentJob;
  const displayValue = activeJob ? 
    Math.max(0, activeJob.trackCount - stableValues.processed) : value;
    
  console.log('StatusCardWithJobStatus: Display calculation', {
    hasActiveJob: !!activeJob,
    activeJobTrackCount: activeJob?.trackCount,
    stableValuesProcessed: stableValues.processed,
    displayValue,
    fallbackValue: value,
    shouldShowTooltip,
    open
  });

  const cardContent = (
    <CardContent className="p-4 flex items-center justify-between relative">
      <div>
        <p className="text-gray-400 text-sm">{title}</p>
        <p className={`${valueColor} text-2xl font-bold`}>{displayValue}</p>
      </div>
      <div className="flex items-center">
        {shouldShowTooltip && (
          <div className="mr-2 animate-pulse">
            <InfoIcon className="h-4 w-4 text-blue-400" />
          </div>
        )}
        <div className={`${iconBg || 'bg-gray-800'} ${styles.iconContainer}`}>
          {icon}
        </div>
      </div>
    </CardContent>
  );

  return (
    <div className="relative">
      <Card
        className={`${styles.card} ${shouldShowTooltip ? 'cursor-pointer hover:border-blue-500/50 transition-colors border-blue-500/70 shadow-md shadow-blue-500/20' : ''}`}
        onClick={() => shouldShowTooltip && setOpen(prev => !prev)}
      >
        {cardContent}
      </Card>

      {/* Simple popover positioned below the card */}
      {shouldShowTooltip && open && (
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 z-50">
          {/* Arrow pointing up */}
          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
            <div className="w-0 h-0 border-l-8 border-r-8 border-b-8 border-l-transparent border-r-transparent border-b-gray-800"></div>
          </div>

          {/* Popover content */}
          <div className="w-[300px] shadow-lg shadow-blue-900/20 relative">
            {activeJob && (
              <div className="relative">
                <AnalysisJobStatus
                  status={activeJob.status}
                  tracksProcessed={stableValues.processed}
                  trackCount={activeJob.trackCount}
                  tracksSucceeded={stableValues.succeeded}
                  tracksFailed={stableValues.failed}
                  startedAt={activeJob.startedAt}
                />
                {/* Close button */}
                <button
                  onClick={handleManualClose}
                  className="absolute top-2 right-2 p-1 rounded-full bg-gray-800/80 hover:bg-gray-700/80 text-gray-400 hover:text-white transition-colors z-10"
                  aria-label="Close progress indicator"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Backdrop to close popover when clicking outside */}
      {shouldShowTooltip && open && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setOpen(false)}
        />
      )}
    </div>
  );
};
