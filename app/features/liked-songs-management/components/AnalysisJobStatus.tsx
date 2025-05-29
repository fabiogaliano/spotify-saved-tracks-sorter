import { AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { Card, CardContent } from '~/shared/components/ui/Card';

interface AnalysisJobStatusProps {
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  tracksProcessed: number;
  trackCount: number;
  tracksSucceeded: number;
  tracksFailed: number;
  startedAt?: Date;
}

export const AnalysisJobStatus = ({
  status,
  tracksProcessed,
  trackCount,
  tracksSucceeded,
  tracksFailed
}: AnalysisJobStatusProps) => {
  const completionPercentage = (tracksProcessed / trackCount) * 100 || 0;
  
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-foreground font-medium">Analysis Job Status</h3>
          <div className="flex items-center">
            {status === 'completed' && <CheckCircle className="h-4 w-4 text-green-500 mr-1" />}
            {status === 'in_progress' && <Clock className="h-4 w-4 text-blue-500 mr-1 animate-spin" />}
            {status === 'pending' && <Clock className="h-4 w-4 text-yellow-500 mr-1" />}
            {status === 'failed' && <AlertCircle className="h-4 w-4 text-red-500 mr-1" />}
            <span className="capitalize text-sm">
              {status === 'in_progress' ? 'processing' : status}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-card h-2 rounded-full mb-2">
          <div 
            className={`h-full rounded-full ${
              status === 'completed' ? 'bg-green-500' : 
              status === 'failed' ? 'bg-red-500' : 'bg-blue-500'}`}
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
        
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{tracksProcessed} of {trackCount} tracks processed</span>
          <span>{completionPercentage.toFixed(0)}%</span>
        </div>
        
        <div className="grid grid-cols-2 gap-2 mt-2">
          <div className="bg-card/50 p-2 rounded">
            <span className="text-xs text-muted-foreground">Succeeded</span>
            <p className="text-green-400 font-medium">{tracksSucceeded}</p>
          </div>
          <div className="bg-card/50 p-2 rounded">
            <span className="text-xs text-muted-foreground">Failed</span>
            <p className="text-red-400 font-medium">{tracksFailed}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
