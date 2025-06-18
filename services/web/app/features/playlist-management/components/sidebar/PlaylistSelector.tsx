import React from 'react';
import { ListMusic, Search, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader } from '~/shared/components/ui/Card';
import { Input } from '~/shared/components/ui/input';
import { ScrollArea } from '~/shared/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '~/shared/components/ui/tabs';
import { PlaylistCard, IconContainer, SectionTitle } from '../ui';
import { PlaylistUIFormat, PlaylistDetailViewTabs } from '../../types';

interface PlaylistSelectorProps {
  filteredPlaylists: PlaylistUIFormat[];
  searchQuery: string;
  selectedTab: PlaylistDetailViewTabs;
  selectedPlaylist: string | null;
  isLoading?: boolean;
  onSearchChange: (query: string) => void;
  onTabChange: (value: PlaylistDetailViewTabs) => void;
  onSelectPlaylist: (id: string) => void;
}

const PlaylistSelector: React.FC<PlaylistSelectorProps> = ({
  filteredPlaylists,
  selectedPlaylist,
  selectedTab,
  searchQuery,
  isLoading = false,
  onSearchChange,
  onTabChange,
  onSelectPlaylist,
}) => {
  // Skeleton loading component
  const PlaylistSkeleton = () => (
    <div className="space-y-2">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="w-full p-3 min-h-[44px] rounded-md bg-card/30 border border-border animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-muted/50 rounded-md"></div>
            <div className="flex-1">
              <div className="h-4 bg-muted/50 rounded w-3/4 mb-1"></div>
              <div className="h-3 bg-muted/30 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="lg:col-span-3">
      <Card className="bg-card/50 backdrop-blur-sm border-border h-full flex flex-col shadow-sm">
        <CardHeader className="pb-3 border-b border-border/50">
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
              className="pl-10 bg-background/50 border-border/50 focus:bg-background transition-colors"
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

            {isLoading ? (
              <PlaylistSkeleton />
            ) : filteredPlaylists.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <div className="bg-muted/20 rounded-full p-4 mb-4">
                  <ListMusic className="h-8 w-8 text-muted-foreground/60" />
                </div>
                <h3 className="text-base font-medium text-foreground mb-2">No playlists found</h3>
                <p className="text-sm text-muted-foreground text-center max-w-sm">
                  {searchQuery
                    ? `No playlists match "${searchQuery}". Try adjusting your search terms.`
                    : 'No playlists available in this category. Create some playlists to get started.'
                  }
                </p>
              </div>
            ) : (
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
                        <PlaylistCard color={playlist.imageColor} />
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
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default PlaylistSelector;
