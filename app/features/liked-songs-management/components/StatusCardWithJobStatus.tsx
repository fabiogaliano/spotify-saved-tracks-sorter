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

  // Remove persistent state - causes state contamination
  // const [persistentJob, setPersistentJob] = useState<AnalysisJob | null>(null);
  // const [persistentStats, setPersistentStats] = useState({ processed: 0, succeeded: 0, failed: 0 });

  // Show tooltip only if we have showJobStatus enabled and a current job
  const shouldShowTooltip = showJobStatus && currentJob;

  // Use current job and stats directly from props - no persistent state
  const activeJob = currentJob;
  const stableValues = { processed: tracksProcessed, succeeded: tracksSucceeded, failed: tracksFailed };

  // Handle job state changes using only current job from props
  useEffect(() => {
    console.log('StatusCardWithJobStatus: Job state change handler', {
      hasActiveJob: !!activeJob,
      activeJobId: activeJob?.id,
      activeJobStatus: activeJob?.status,
      lastJobId: lastJobIdRef.current,
      open,
      manuallyClosedByUser
    });
    
    if (!activeJob) {
      // Job cleared - close tooltip and reset state
      console.log('StatusCardWithJobStatus: No active job, closing tooltip');
      setOpen(false);
      setManuallyClosedByUser(false);
      lastJobIdRef.current = null;
      
      // Clear any existing timer
      if (autoCloseTimerRef.current) {
        clearTimeout(autoCloseTimerRef.current);
        autoCloseTimerRef.current = null;
      }
      return;
    }

    // Don't reopen tooltip if user manually closed it
    if (manuallyClosedByUser) {
      console.log('StatusCardWithJobStatus: User manually closed tooltip, not reopening');
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
      // Job finished - KEEP tooltip open permanently until manually closed
      console.log('StatusCardWithJobStatus: Job completed/failed, keeping tooltip open until manually closed');
      if (autoCloseTimerRef.current) {
        clearTimeout(autoCloseTimerRef.current);
        autoCloseTimerRef.current = null;
      }
      
      // Keep tooltip open to show final status - no auto-close timer
      setOpen(true);
    }
  }, [activeJob?.id, activeJob?.status, manuallyClosedByUser]);

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
    lastJobIdRef.current = null;
  };

  // Calculate remaining tracks from stable values
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
