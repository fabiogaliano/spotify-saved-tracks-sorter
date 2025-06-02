import React from 'react';
import { ListMusic, Search, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader } from '~/shared/components/ui/Card';
import { Input } from '~/shared/components/ui/input';
import { ScrollArea } from '~/shared/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '~/shared/components/ui/tabs';
import { ColoredBox, IconContainer, SectionTitle } from '../ui/controls';
import { PlaylistUIFormat } from '../playlist-viewer/types';
import { PlaylistDetailViewTabs } from '../../hooks/usePlaylistManagement';

interface PlaylistSelectorProps {
  filteredPlaylists: PlaylistUIFormat[];
  searchQuery: string;
  selectedTab: PlaylistDetailViewTabs;
  selectedPlaylist: string | null;
  onSearchChange: (query: string) => void;
  onTabChange: (value: PlaylistDetailViewTabs) => void;
  onSelectPlaylist: (id: string) => void;
}

const PlaylistSelector: React.FC<PlaylistSelectorProps> = ({
  filteredPlaylists,
  selectedPlaylist,
  selectedTab,
  searchQuery,
  onSearchChange,
  onTabChange,
  onSelectPlaylist
}) => {
  return (
    <div className="md:col-span-4 lg:col-span-3">
      <Card className="bg-card border-border h-full flex flex-col">
        <CardHeader className="pb-2 border-b border-border">
          <div className="flex justify-between items-center">
            <SectionTitle
              icon={<IconContainer icon={ListMusic} color="purple" />}
              title="Your Playlists"
              count={filteredPlaylists.length}
            />
          </div>
        </CardHeader>

        <div className="p-4 border-b border-border flex-shrink-0">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search playlists..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 bg-card/50 border-border"
            />
          </div>
        </div>

        <CardContent className="p-4 space-y-2 flex-1 min-h-0">
          <ScrollArea className="h-[calc(100vh-320px)] pr-4">
            <Tabs value={selectedTab} onValueChange={(value) => onTabChange(value as PlaylistDetailViewTabs)}>
              <TabsList className="bg-card/50 border border-border w-full grid grid-cols-2">
                <TabsTrigger value="is_flagged" className="data-[state=active]:bg-card text-muted-foreground data-[state=active]:text-foreground">AI-Enabled</TabsTrigger>
                <TabsTrigger value="others" className="data-[state=active]:bg-card text-muted-foreground data-[state=active]:text-foreground">Others Playlists</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="space-y-2">
              {filteredPlaylists.map((playlist) => {
                return (
                  <button
                    key={playlist.id}
                    onClick={() => onSelectPlaylist(playlist.id)}
                    className={`w-full p-3 min-h-[44px] text-left rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background ${selectedPlaylist === playlist.id
                      ? 'bg-card-primary border border-primary/30 text-foreground'
                      : 'bg-card/50 border border-border text-foreground hover:bg-card hover:border-border active:bg-card'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <ColoredBox color={playlist.imageColor} />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span>{playlist.name}</span>
                          {playlist.aiEnabled && (
                            <IconContainer icon={Sparkles} color={playlist.imageColor} size="sm" />
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default PlaylistSelector;
