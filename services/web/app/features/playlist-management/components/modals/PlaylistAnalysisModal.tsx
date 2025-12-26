import React from 'react';
import { X, Brain, Sparkles, Music, Target, RefreshCw } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '~/shared/components/ui/dialog';
import { Button } from '~/shared/components/ui/button';
import { Progress } from '~/shared/components/ui/progress';
import { Badge } from '~/shared/components/ui/badge';
import { Card } from '~/shared/components/ui/Card';
import { Skeleton } from '~/shared/components/ui/skeleton';

interface PlaylistAnalysisModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  playlistName: string;
  analysis: any | null;
  isLoading: boolean;
  jobStatus?: {
    status: string;
    progress?: number;
  } | null;
  onReanalyze?: () => void;
}

const PlaylistAnalysisModal: React.FC<PlaylistAnalysisModalProps> = ({
  open,
  onOpenChange,
  playlistName,
  analysis,
  isLoading,
  jobStatus,
  onReanalyze
}) => {
  const formatScore = (score: number) => Math.round(score * 100);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              AI Analysis: {playlistName}
            </DialogTitle>
            {onReanalyze && !isLoading && (
              <Button
                variant="outline"
                size="sm"
                onClick={onReanalyze}
                className="ml-4"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Re-analyze
              </Button>
            )}
          </div>
        </DialogHeader>

        {isLoading && !analysis ? (
          // Initial loading state (no previous analysis)
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="relative">
              <Sparkles className="h-12 w-12 text-primary animate-pulse" />
              <div className="absolute inset-0 animate-ping">
                <Sparkles className="h-12 w-12 text-primary opacity-30" />
              </div>
            </div>
            <p className="text-muted-foreground">
              {jobStatus?.status === 'pending' && 'Analysis queued...'}
              {jobStatus?.status === 'processing' && 'Analyzing playlist characteristics...'}
              {jobStatus?.status === 'completed' && 'Finalizing results...'}
              {!jobStatus && 'Starting analysis...'}
            </p>
            {jobStatus?.progress !== undefined && (
              <div className="w-full max-w-xs">
                <Progress value={jobStatus.progress} className="h-2" />
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Themes Section */}
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Music className="h-4 w-4" />
                Themes & Meaning
              </h3>
              <Card className="p-4 space-y-3">
                {isLoading && analysis ? (
                  // Skeleton state for re-analysis
                  <>
                    {[1, 2].map((i) => (
                      <div key={i} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Skeleton className="h-5 w-32" />
                          <Skeleton className="h-5 w-24" />
                        </div>
                        <Skeleton className="h-4 w-full" />
                      </div>
                    ))}
                    <div className="pt-2 mt-4 border-t">
                      <Skeleton className="h-4 w-24 mb-2" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                  </>
                ) : (
                  <>
                    {analysis?.meaning?.core_themes?.map((theme: any, index: number) => (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">{theme.name}</h4>
                          <Badge variant="secondary">
                            {formatScore(theme.confidence)}% confident
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{theme.description}</p>
                      </div>
                    ))}
                    <div className="pt-2 mt-4 border-t">
                      <p className="text-sm font-medium">Overall Vibe</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {analysis?.meaning?.main_message}
                      </p>
                    </div>
                  </>
                )}
              </Card>
            </div>

            {/* Emotional Analysis */}
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Target className="h-4 w-4" />
                Emotional Profile
              </h3>
              <Card className="p-4 space-y-3">
                {isLoading && analysis ? (
                  // Skeleton state for re-analysis
                  <>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-5 w-20" />
                      </div>
                      <Skeleton className="h-4 w-full" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-12" />
                      </div>
                      <Skeleton className="h-2 w-full rounded-full" />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Dominant Mood</span>
                        <Badge>{analysis?.emotional?.dominant_mood?.mood}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {analysis?.emotional?.dominant_mood?.description}
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm">Emotional Intensity</span>
                        <span className="text-sm font-medium">
                          {formatScore(analysis?.emotional?.intensity_score || 0)}%
                        </span>
                      </div>
                      <Progress value={formatScore(analysis?.emotional?.intensity_score || 0)} />
                    </div>
                  </>
                )}
              </Card>
            </div>

            {/* Context & Situations */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Best Listening Contexts</h3>
              <Card className="p-4 space-y-3">
                {isLoading && analysis ? (
                  // Skeleton state for re-analysis
                  <>
                    <div>
                      <Skeleton className="h-4 w-24 mb-2" />
                      <Skeleton className="h-6 w-32" />
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      {['Solo Listening', 'Intimate', 'Passive'].map((label) => (
                        <div key={label} className="text-center space-y-1">
                          <p className="text-xs text-muted-foreground">{label}</p>
                          <Skeleton className="h-6 w-12 mx-auto" />
                        </div>
                      ))}
                    </div>

                    <div className="pt-3 mt-3 border-t">
                      <Skeleton className="h-4 w-20 mb-2" />
                      <div className="flex flex-wrap gap-1">
                        {[1, 2, 3].map((i) => (
                          <Skeleton key={i} className="h-5 w-20" />
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <p className="text-sm font-medium mb-2">Primary Setting</p>
                      <Badge variant="outline" className="mb-3">
                        {analysis?.context?.primary_setting}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center space-y-1">
                        <p className="text-xs text-muted-foreground">Solo Listening</p>
                        <div className="text-lg font-semibold">
                          {formatScore(1 - (analysis?.context?.social_context?.alone_vs_group || 0.5))}%
                        </div>
                      </div>
                      <div className="text-center space-y-1">
                        <p className="text-xs text-muted-foreground">Intimate</p>
                        <div className="text-lg font-semibold">
                          {formatScore(1 - (analysis?.context?.social_context?.intimate_vs_public || 0.5))}%
                        </div>
                      </div>
                      <div className="text-center space-y-1">
                        <p className="text-xs text-muted-foreground">Passive</p>
                        <div className="text-lg font-semibold">
                          {formatScore(1 - (analysis?.context?.social_context?.active_vs_passive || 0.5))}%
                        </div>
                      </div>
                    </div>

                    {analysis?.context?.situations?.perfect_for && (
                      <div className="pt-3 mt-3 border-t">
                        <p className="text-sm font-medium mb-1">Perfect for:</p>
                        <div className="flex flex-wrap gap-1">
                          {analysis.context.situations.perfect_for.map((situation: string, i: number) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {situation}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </Card>
            </div>

            {/* Matchability Scores */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Playlist Characteristics</h3>
              <Card className="p-4">
                {isLoading && analysis ? (
                  // Skeleton state for re-analysis
                  <div className="grid grid-cols-4 gap-4">
                    {['Genre Flex', 'Mood Focus', 'Cultural', 'Era Range'].map((label) => (
                      <div key={label} className="text-center">
                        <Skeleton className="h-8 w-16 mx-auto mb-1" />
                        <p className="text-xs text-muted-foreground mt-1">{label}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">
                        {formatScore(analysis?.curation?.target_matching?.genre_flexibility || 0)}%
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Genre Flex</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">
                        {formatScore(analysis?.curation?.target_matching?.mood_rigidity || 0)}%
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Mood Focus</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">
                        {formatScore(analysis?.curation?.target_matching?.cultural_specificity || 0)}%
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Cultural</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">
                        {formatScore(1 - (analysis?.curation?.target_matching?.era_constraints || 0))}%
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Era Range</p>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PlaylistAnalysisModal;