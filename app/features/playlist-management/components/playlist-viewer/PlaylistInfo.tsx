import React, { useState } from 'react';
import { Pencil, RefreshCw, Save, Sparkles } from 'lucide-react';
import { Badge, ColoredBox, IconContainer } from '../ui/controls';
import { Card, CardContent } from '~/shared/components/ui/Card';
import { Button } from '~/shared/components/ui/button';
import { Switch } from '~/shared/components/ui/switch';
import { Textarea } from '~/shared/components/ui/textarea';
import { PlaylistUIFormat } from './types';

interface PlaylistInfoProps {
  currentPlaylist: PlaylistUIFormat;
  onEditDescription: () => void;
  onEnableAI: (enabled: boolean) => void;
  onRescanPlaylist: () => void;
}

const PlaylistInfo: React.FC<PlaylistInfoProps> = ({
  currentPlaylist,
  onEditDescription,
  onEnableAI,
  onRescanPlaylist,
}) => {
  const [editDescriptionMode, setEditDescriptionMode] = useState(false);
  const [aiFlag, setAiFlag] = useState('');

  return (
    <Card className="bg-gray-900/80 border-gray-800">
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Playlist Image */}
          <div className="shrink-0 mx-auto md:mx-0">
            <ColoredBox color={currentPlaylist.imageColor} size="lg" />
          </div>

          {/* Playlist Info */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-2xl font-bold text-white">{currentPlaylist.name}</h2>
              {currentPlaylist.aiEnabled && (
                <IconContainer icon={Sparkles} color={currentPlaylist.imageColor} />
              )}
            </div>
            <p className="text-gray-300">{currentPlaylist.songCount} songs</p>

            <div className="mt-4 flex flex-col gap-4">
              <div className="flex flex-col">
                <div className="flex justify-between mb-1">
                  {!editDescriptionMode && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 py-0 text-xs text-gray-400 hover:text-white hover:bg-transparent"
                      onClick={() => {
                        setAiFlag(currentPlaylist.description.replace('AI: ', ''));
                        setEditDescriptionMode(true);
                      }}
                    >
                      <Pencil className="h-3 w-3 mr-1" /> Edit
                    </Button>
                  )}
                </div>

                {editDescriptionMode ? (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <div className="bg-gray-800 text-green-400 font-medium px-2 py-1 text-sm rounded-md border border-gray-700">
                        AI:
                      </div>
                      <Textarea
                        value={aiFlag}
                        onChange={(e) => setAiFlag(e.target.value)}
                        className="flex-1 bg-gray-800 border-gray-700 text-white min-h-[80px]"
                        placeholder="Describe the type of music you want in this playlist..."
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-gray-400 border-gray-700 hover:bg-gray-800 hover:text-white"
                        onClick={() => setEditDescriptionMode(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        className="bg-white/10 hover:bg-white/20 text-white border-0"
                        onClick={() => {
                          onEditDescription();
                          setEditDescriptionMode(false);
                        }}
                      >
                        <Save className="h-3.5 w-3.5 mr-1" /> Save Flag
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-800 rounded-md p-3 border border-gray-700">
                    {currentPlaylist.aiEnabled ? (
                      <div className="text-gray-300">
                        <span className="text-green-400 font-medium">AI: </span>
                        {currentPlaylist.description.replace('AI: ', '')}
                      </div>
                    ) : (
                      <div className="text-gray-400">
                        {currentPlaylist.description}
                        <div className="mt-2 text-xs">
                          <span className="text-yellow-400">⚠️ </span>
                          This playlist doesn't have an AI flag. Add one to enable AI sorting.
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between border-t border-gray-800 pt-4">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-300">AI Sorting</span>
                    <Switch
                      checked={currentPlaylist.aiEnabled}
                      onCheckedChange={onEnableAI}
                    />
                  </div>

                  <Badge color="gray">
                    {currentPlaylist.aiEnabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>

                <Button
                  size="sm"
                  className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700 hover:border-gray-600 transition-colors gap-1"
                  onClick={onRescanPlaylist}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Rescan Playlist
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PlaylistInfo;
