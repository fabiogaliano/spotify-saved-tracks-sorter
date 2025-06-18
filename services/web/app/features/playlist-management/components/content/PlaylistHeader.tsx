import React, { useState } from 'react';
import { Pencil, Sparkles, Check, X, Music, AlertCircle, Target } from 'lucide-react';
import { StatusBadge, PlaylistCard, IconContainer } from '../ui';
import { Card, CardContent, CardHeader } from '~/shared/components/ui/Card';
import { Button } from '~/shared/components/ui/button';
import { Switch } from '~/shared/components/ui/switch';
import { Textarea } from '~/shared/components/ui/textarea';
import { Separator } from '~/shared/components/ui/separator';
import { PlaylistUIFormat } from '../../types';

interface PlaylistInfoProps {
  currentPlaylist: PlaylistUIFormat;
  onEditDescription: () => void;
  onEnableAI: (enabled: boolean) => void;
  onAnalyzePlaylist: () => void;
  onViewAnalysis?: () => void;
  hasAnalysis?: boolean;
  isAnalyzing?: boolean;
}

const PlaylistInfo: React.FC<PlaylistInfoProps> = ({
  currentPlaylist,
  onEditDescription,
  onEnableAI,
  onAnalyzePlaylist,
  onViewAnalysis,
  hasAnalysis,
  isAnalyzing = false,
}) => {
  const [editDescriptionMode, setEditDescriptionMode] = useState(false);
  const [aiFlag, setAiFlag] = useState('');

  return (
    <div className="space-y-4">
      {/* Main Playlist Info Card */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50 shadow-lg">
        <CardContent className="p-0">
          <div className="flex flex-col lg:flex-row">
            {/* Left Section - Playlist Image & Basic Info */}
            <div className="bg-gradient-to-br from-primary/5 to-primary/10 p-6 lg:p-8 lg:pr-12">
              <div className="flex flex-col items-center lg:items-start gap-4">
                <PlaylistCard color={currentPlaylist.imageColor} size="lg" />
                <div className="text-center lg:text-left">
                  <div className="flex items-center gap-2 mb-2">
                    <h2 className="text-2xl font-bold text-foreground">{currentPlaylist.name}</h2>
                    {currentPlaylist.aiEnabled && (
                      <IconContainer icon={Sparkles} color={currentPlaylist.imageColor} />
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Music className="h-4 w-4" />
                    <span>{currentPlaylist.songCount} songs</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Section - AI Configuration */}
            <div className="flex-1 p-6 lg:p-8">
              <div className="space-y-6">
                {/* AI Instructions */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">AI Sorting Configuration</h3>

                  <div className="space-y-3">
                    <div className="relative group">
                      <Textarea
                        value={editDescriptionMode ? aiFlag : currentPlaylist.description.replace('AI: ', '')}
                        onChange={(e) => setAiFlag(e.target.value)}
                        className={`w-full min-h-[100px] resize-none bg-background/50 border text-foreground transition-all ${editDescriptionMode
                          ? 'ring-2 ring-primary border-primary'
                          : 'border-border/50 cursor-pointer hover:border-border hover:bg-background/70'
                          }`}
                        placeholder="Describe the vibe, mood, or type of music you want in this playlist..."
                        readOnly={!editDescriptionMode}
                        onClick={() => !editDescriptionMode && setEditDescriptionMode(true)}
                      />
                      {editDescriptionMode ? (
                        <div className="mt-2 flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditDescriptionMode(false);
                              setAiFlag(currentPlaylist.description.replace('AI: ', ''));
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => {
                              onEditDescription();
                              setEditDescriptionMode(false);
                            }}
                          >
                            <Check className="h-3.5 w-3.5 mr-1.5" />
                            Save Instructions
                          </Button>
                        </div>
                      ) : (
                        <button
                          className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity bg-background/80 backdrop-blur-sm rounded-md flex items-center justify-center"
                          onClick={() => {
                            setAiFlag(currentPlaylist.description.replace('AI: ', ''));
                            setEditDescriptionMode(true);
                          }}
                        >
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <Pencil className="h-4 w-4" />
                            Edit Instructions
                          </div>
                        </button>
                      )}
                    </div>

                    {!currentPlaylist.aiEnabled && !editDescriptionMode && (
                      <div className="flex items-center gap-2 text-sm text-amber-500 bg-amber-500/10 px-3 py-2 rounded-md">
                        <AlertCircle className="h-4 w-4 flex-shrink-0" />
                        <span>Add AI instructions above to enable smart sorting</span>
                      </div>
                    )}
                  </div>
                </div>

                <Separator className="bg-border/50" />

                {/* Smart Sorting Toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Enable as AI Destination</h4>
                    <p className="text-sm text-muted-foreground">Allow liked songs to be sorted into this playlist</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={currentPlaylist.aiEnabled}
                      onCheckedChange={onEnableAI}
                      className="data-[state=checked]:bg-primary"
                    />
                    <StatusBadge
                      color={currentPlaylist.aiEnabled ? "green" : "gray"}
                      className="min-w-[80px] justify-center"
                    >
                      {currentPlaylist.aiEnabled ? 'Active' : 'Inactive'}
                    </StatusBadge>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button
          variant="default"
          size="default"
          className="bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden"
          onClick={hasAnalysis && !isAnalyzing ? onViewAnalysis : onAnalyzePlaylist}
          disabled={isAnalyzing}
        >
          <Sparkles className={`h-4 w-4 mr-2 ${isAnalyzing ? 'animate-pulse' : ''}`} />
          {isAnalyzing ? 'Analyzing...' : hasAnalysis ? 'View Analysis' : 'Analyze Playlist'}
          {isAnalyzing && (
            <div className="absolute inset-0 bg-primary/20 animate-pulse" />
          )}
        </Button>
      </div>
    </div>
  );
};

export default PlaylistInfo;
