import { ReactNode, useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '~/shared/components/ui/Card';
import { X } from 'lucide-react';
import { AnalysisJobStatus } from './AnalysisJobStatus';
import { AnalysisJob, isTrackBatchJob } from '~/lib/types/analysis.types';

// Re-export for backwards compatibility
export type { AnalysisJob } from '~/lib/types/analysis.types';

interface StatusCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  iconBg: string;
  valueColor: string;
}

interface StatusCardWithJobStatusProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  iconBg: string;
  valueColor: string;
  currentJob: AnalysisJob | null;
  showJobStatus?: boolean;
  itemsProcessed?: number;
  itemsSucceeded?: number;
  itemsFailed?: number;
}

// Status Card component with job status tooltip
export const StatusCardWithJobStatus = ({
  title,
  value,
  subtitle,
  icon,
  iconBg,
  valueColor,
  currentJob,
  showJobStatus = false,
  itemsProcessed = 0,
  itemsSucceeded = 0,
  itemsFailed = 0
}: StatusCardWithJobStatusProps) => {
  // State to control tooltip open/close
  const [open, setOpen] = useState(false);
  const [manuallyClosedByUser, setManuallyClosedByUser] = useState(false);
  const lastJobIdRef = useRef<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Simple completion delay for popup behavior only
  const [isInCompletionDelay, setIsInCompletionDelay] = useState(false);
  const completionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Show tooltip if we have a current job OR if we're in completion delay
  const shouldShowTooltip = showJobStatus && currentJob;

  // Use current job (parent now handles completion delay data)
  const activeJob = showJobStatus ? currentJob : null;
  
  // Use props from parent (now includes real completion data)
  const stableValues = {
    processed: itemsProcessed,
    succeeded: itemsSucceeded,
    failed: itemsFailed
  };

  // Simple popup lifecycle management
  useEffect(() => {
    if (currentJob) {
      // New job - open popup
      const isNewJob = currentJob.id !== lastJobIdRef.current;
      if (isNewJob) {
        lastJobIdRef.current = currentJob.id;
        setManuallyClosedByUser(false);
        setOpen(true);
        
        // Clear any existing completion delay
        if (completionTimeoutRef.current) {
          clearTimeout(completionTimeoutRef.current);
          completionTimeoutRef.current = null;
        }
        setIsInCompletionDelay(false);
      }
    } else {
      // No job - start completion delay if popup is open
      if (open && !manuallyClosedByUser && !isInCompletionDelay) {
        setIsInCompletionDelay(true);
        
        completionTimeoutRef.current = setTimeout(() => {
          setOpen(false);
          setIsInCompletionDelay(false);
          setManuallyClosedByUser(false);
          lastJobIdRef.current = null;
        }, 5000);
      } else if (!open && !isInCompletionDelay) {
        // Reset state
        setManuallyClosedByUser(false);
        lastJobIdRef.current = null;
      }
    }
  }, [currentJob?.id, open, manuallyClosedByUser, isInCompletionDelay]);


  // Manual close handler
  const handleManualClose = () => {
    // Clear completion delay timeout if active
    if (completionTimeoutRef.current) {
      clearTimeout(completionTimeoutRef.current);
      completionTimeoutRef.current = null;
    }
    
    setOpen(false);
    setManuallyClosedByUser(true);
    setIsInCompletionDelay(false);
  };

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (completionTimeoutRef.current) {
        clearTimeout(completionTimeoutRef.current);
      }
    };
  }, []);

  // Show job progress when active, otherwise show normal value
  // For playlist jobs, show simpler progress
  const displayValue = activeJob
    ? (activeJob.jobType === 'playlist'
        ? (activeJob.status === 'completed' ? '1/1' : '0/1')
        : `${stableValues.processed}/${activeJob.itemCount}`)
    : value;

  return (
    <Card className="bg-card border-border relative">
      <CardContent className="p-4 flex items-center justify-between">
        <div>
          <p className="text-muted-foreground text-sm">{title}</p>
          <p className={`${valueColor} text-2xl font-bold`}>{displayValue}</p>
          {subtitle && <p className="text-muted-foreground text-xs mt-1">{subtitle}</p>}
        </div>
        
        {/* Illuminated clickable icon with wave effect */}
        <div 
          className={`${iconBg || 'bg-card'} p-2 rounded-full relative ${shouldShowTooltip ? 'cursor-pointer hover:scale-105 transition-all duration-300' : ''}`}
          onClick={shouldShowTooltip ? () => setOpen(!open) : undefined}
        >
          {/* Icon with glow effect */}
          <div className={`relative z-10 ${shouldShowTooltip ? 'drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]' : ''}`}>
            {icon}
          </div>
          
          {/* Clean pulsation effect for active analysis */}
          {shouldShowTooltip && (
            <div 
              className="absolute inset-0 rounded-full bg-blue-400/25"
              style={{
                animation: 'pulse-circle 1.1s ease-in-out infinite'
              }}
            ></div>
          )}

          <style>{`
            @keyframes pulse-circle {
              0%, 100% {
                transform: scale(1);
                opacity: 1;
              }
              50% {
                transform: scale(1.2);
                opacity: 0.3;
              }
            }
          `}</style>
        </div>

        {/* Job Status Dropdown - positioned like macOS menu */}
        {open && activeJob && (
          <div 
            ref={dropdownRef}
            className="absolute top-full right-0 mt-2 z-50 transform animate-in slide-in-from-top-2 duration-200"
            role="menu"
          >
            {/* Dropdown arrow */}
            <div className="absolute -top-1 right-3 w-2 h-2 bg-background border-l border-t border-border transform rotate-45"></div>
            
            <div className="relative">
              <button 
                onClick={handleManualClose}
                className="absolute -top-2 -right-2 p-1 bg-background border border-border rounded-full hover:bg-muted transition-colors z-10 shadow-lg"
                aria-label="Close"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
              
              <AnalysisJobStatus
                jobType={activeJob.jobType}
                status={activeJob.status}
                itemCount={activeJob.itemCount}
                itemsProcessed={stableValues.processed}
                itemsSucceeded={stableValues.succeeded}
                itemsFailed={stableValues.failed}
                startedAt={activeJob.startedAt}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Regular Status Card for backwards compatibility
export const StatusCard = ({ title, value, subtitle, icon, iconBg, valueColor }: StatusCardProps) => (
  <Card className="bg-card border-border">
    <CardContent className="p-4 flex items-center justify-between">
      <div>
        <p className="text-muted-foreground text-sm">{title}</p>
        <p className={`${valueColor} text-2xl font-bold`}>{value}</p>
        {subtitle && <p className="text-muted-foreground text-xs mt-1">{subtitle}</p>}
      </div>
      <div className={`${iconBg || 'bg-card'} p-2 rounded-full`}>{icon}</div>
    </CardContent>
  </Card>
);