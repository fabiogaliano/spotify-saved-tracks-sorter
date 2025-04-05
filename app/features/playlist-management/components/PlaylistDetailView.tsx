import React, { useState } from 'react';
import { ListMusic, Music, Pencil, RefreshCw, Save, Sparkles } from 'lucide-react';
import { Badge, ColoredBox, IconContainer, SectionTitle } from './helpers';
import { Card, CardContent, CardHeader } from '~/shared/components/ui/Card';
import { Button } from '~/shared/components/ui/button';
import { Switch } from '~/shared/components/ui/switch';
import { Textarea } from '~/shared/components/ui/textarea';
import { ScrollArea } from '~/shared/components/ui/scroll-area';

interface PlaylistTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  dateAdded: string;
}

export interface PlaylistUIFormat {
  id: string;
  name: string;
  description: string;
  imageColor: string;
  songCount: number;
  aiEnabled: boolean;
}

interface PlaylistDetailViewProps {
  currentPlaylist: PlaylistUIFormat | null;
  playlistTracks: PlaylistTrack[];
  onEditDescription: () => void;
  onEnableAI: (enabled: boolean) => void;
  onRescanPlaylist: () => void;
}

const PlaylistDetailView: React.FC<PlaylistDetailViewProps> = ({
  currentPlaylist,
  playlistTracks,
  onEditDescription,
  onEnableAI,
  onRescanPlaylist
}) => {
  const [editDescriptionMode, setEditDescriptionMode] = useState(false);
  const [aiFlag, setAiFlag] = useState('');

  if (!currentPlaylist) {
    return (
      <Card className="bg-gray-900/80 border-gray-800 h-full">
        <CardContent className="flex flex-col items-center justify-center text-center p-12">
          <div className="bg-gray-800 rounded-full p-5 mb-4">
            <ListMusic className="h-10 w-10 text-gray-600" />
          </div>
          <h3 className="text-xl font-medium text-white mb-2">Select a playlist</h3>
          <p className="text-gray-400 max-w-md">
            Choose a playlist from the sidebar to view details and configure AI flags for smart sorting.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* Playlist Header Card */}
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

      {/* Playlist Tracks */}
      <Card className="bg-gray-900/80 border-gray-800 h-full">
        <CardHeader className="pb-2 border-b border-gray-800">
          <SectionTitle
            icon={<IconContainer icon={Music} color="green" />}
            title="Playlist Tracks"
          />
        </CardHeader>

        <CardContent className="p-0">
          <ScrollArea className="h-[calc(100vh-500px)]">
            <div className="p-4">
              <table className="w-full">
                <thead className="border-b border-gray-800">
                  <tr>
                    <th className="text-left text-xs font-medium text-gray-400 p-2">#</th>
                    <th className="text-left text-xs font-medium text-gray-400 p-2">Title</th>
                    <th className="text-left text-xs font-medium text-gray-400 p-2">Album</th>
                    <th className="text-left text-xs font-medium text-gray-400 p-2">Date Added</th>
                  </tr>
                </thead>
                <tbody>
                  {playlistTracks.map((track, index) => (
                    <tr key={track.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                      <td className="text-gray-400 p-2">{index + 1}</td>
                      <td className="p-2">
                        <div>
                          <div className="text-white">{track.title}</div>
                          <div className="text-gray-400 text-sm">{track.artist}</div>
                        </div>
                      </td>
                      <td className="text-gray-300 p-2">{track.album}</td>
                      <td className="text-gray-400 text-sm p-2">{track.dateAdded}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </>
  );
};

export default PlaylistDetailView;
