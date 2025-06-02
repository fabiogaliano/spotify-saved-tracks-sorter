import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '~/shared/components/ui/Card';
import { Button } from '~/shared/components/ui/button';
import { Input } from '~/shared/components/ui/input';
import { Progress } from '~/shared/components/ui/progress';
import {
  Music,
  Search,
  RefreshCw,
  ListMusic,
  ArrowRight,
  CheckCircle2,
  Info,
  Play
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/shared/components/ui/tabs';
import { ScrollArea } from '~/shared/components/ui/scroll-area';
import { NotificationMessage } from '~/features/playlist-management/components/ui/controls';

const MatchingInterface = () => {
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeView, setActiveView] = useState('all');
  const [notification, setNotification] = useState(null);

  // Demo data
  const playlists = [
    { id: '1', name: 'Chill Vibes', songCount: 42, description: 'AI: relaxing beats with mellow lyrics', aiEnabled: true },
    { id: '2', name: 'Morning Energy', songCount: 28, description: 'AI: upbeat tracks to start your day', aiEnabled: true },
    { id: '3', name: 'Late Night Feels', songCount: 35, description: 'AI: emotional and introspective tracks', aiEnabled: true },
    { id: '4', name: 'Workout Mix', songCount: 50, description: 'AI: high energy songs with driving beats', aiEnabled: true },
    { id: '5', name: 'Focus', songCount: 32, description: 'AI: ambient and minimal music for concentration', aiEnabled: true },
    { id: '6', name: 'Party Playlist', songCount: 64, description: 'Good vibes only', aiEnabled: false },
    { id: '7', name: 'Road Trip', songCount: 47, description: 'Music for the open road', aiEnabled: false },
  ];

  const likedSongs = [
    {
      id: '101',
      title: 'Redbone',
      artist: 'Childish Gambino',
      album: 'Awaken, My Love!',
      colorClass: 'blue',
      addedAt: '2 days ago',
      analyzed: true,
      match: 98,
      matchingPlaylists: ['1', '3']
    },
    {
      id: '102',
      title: 'Blinding Lights',
      artist: 'The Weeknd',
      album: 'After Hours',
      colorClass: 'pink',
      addedAt: '1 week ago',
      analyzed: true,
      match: 95,
      matchingPlaylists: ['2', '4']
    },
    {
      id: '103',
      title: 'Heat Waves',
      artist: 'Glass Animals',
      colorClass: 'purple',
      album: 'Dreamland',
      addedAt: '3 days ago',
      analyzed: true,
      match: 89,
      matchingPlaylists: ['3']
    },
    {
      id: '104',
      title: 'As It Was',
      artist: 'Harry Styles',
      album: 'Harry\'s House',
      colorClass: 'green',
      addedAt: '5 days ago',
      analyzed: true,
      match: 92,
      matchingPlaylists: ['1', '2']
    },
    {
      id: '105',
      title: 'Bad Habit',
      artist: 'Steve Lacy',
      album: 'Gemini Rights',
      colorClass: 'yellow',
      addedAt: '1 day ago',
      analyzed: true,
      match: 87,
      matchingPlaylists: ['3', '4']
    },
    {
      id: '106',
      title: 'Glimpse of Us',
      artist: 'Joji',
      album: 'Smithereens',
      colorClass: 'blue',
      addedAt: '2 weeks ago',
      analyzed: true,
      match: 94,
      matchingPlaylists: ['1', '3']
    },
    {
      id: '107',
      title: 'Running Up That Hill',
      artist: 'Kate Bush',
      album: 'Hounds of Love',
      colorClass: 'purple',
      addedAt: '1 month ago',
      analyzed: false,
      match: null,
      matchingPlaylists: []
    },
    {
      id: '108',
      title: 'Flowers',
      artist: 'Miley Cyrus',
      album: 'Endless Summer Vacation',
      colorClass: 'pink',
      addedAt: '3 days ago',
      analyzed: false,
      match: null,
      matchingPlaylists: []
    }
  ];

  // Filter songs based on selectedPlaylist and searchQuery
  const filteredSongs = likedSongs
    .filter(song => {
      // First, filter by playlist if one is selected
      if (selectedPlaylist && song.analyzed) {
        return song.matchingPlaylists.includes(selectedPlaylist);
      }
      return true;
    })
    .filter(song => {
      // Then, filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          song.title.toLowerCase().includes(query) ||
          song.artist.toLowerCase().includes(query) ||
          song.album.toLowerCase().includes(query)
        );
      }
      return true;
    })
    .filter(song => {
      // Filter by active view
      if (activeView === 'analyzed') {
        return song.analyzed;
      } else if (activeView === 'unanalyzed') {
        return !song.analyzed;
      }
      return true;
    });

  // Get playlist name by ID
  const getPlaylistName = (playlistId) => {
    const playlist = playlists.find(p => p.id === playlistId);
    return playlist ? playlist.name : '';
  };

  // Get only AI-enabled playlists
  const aiPlaylists = playlists.filter(p => p.aiEnabled);

  // Count of analyzable songs
  const unanalyzedCount = likedSongs.filter(song => !song.analyzed).length;
  const analysisDone = likedSongs.filter(song => song.analyzed).length;
  const totalSongs = likedSongs.length;
  const analysisProgress = Math.round((analysisDone / totalSongs) * 100);

  // Handle sorting a song into playlists
  const handleSortSong = (songId, playlistIds) => {
    const song = likedSongs.find(s => s.id === songId);
    const playlistNames = playlistIds.map(id => getPlaylistName(id));

    setNotification({
      type: 'success',
      message: `"${song.title}" sorted into: ${playlistNames.join(', ')}`
    });

    setTimeout(() => setNotification(null), 3000);
  };

  // Handle analyzing a song
  const handleAnalyzeSong = (songId) => {
    setNotification({
      type: 'info',
      message: `Analyzing "${likedSongs.find(s => s.id === songId).title}"...`
    });

    setTimeout(() => setNotification(null), 3000);
  };

  // Handle batch analysis
  const handleBatchAnalysis = () => {
    setNotification({
      type: 'info',
      message: `Analyzing ${unanalyzedCount} songs in batch...`
    });

    setTimeout(() => setNotification(null), 3000);
  };

  // Color mapping helper function
  const getColorClasses = (colorName) => {
    const colorMap = {
      blue: {
        bg: 'bg-blue-500/30',
        inner: 'bg-blue-500',
        icon: 'bg-blue-500/20',
        text: 'text-blue-400'
      },
      green: {
        bg: 'bg-green-500/30',
        inner: 'bg-green-500',
        icon: 'bg-green-500/20',
        text: 'text-green-400'
      },
      purple: {
        bg: 'bg-purple-500/30',
        inner: 'bg-purple-500',
        icon: 'bg-purple-500/20',
        text: 'text-purple-400'
      },
      pink: {
        bg: 'bg-pink-500/30',
        inner: 'bg-pink-500',
        icon: 'bg-pink-500/20',
        text: 'text-pink-400'
      },
      yellow: {
        bg: 'bg-yellow-500/30',
        inner: 'bg-yellow-500',
        icon: 'bg-yellow-500/20',
        text: 'text-yellow-400'
      }
    };

    return colorMap[colorName] || colorMap.blue;
  };

  return (
    <div className="h-full flex flex-col space-y-6">
      {/* Header with actions */}
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground mb-1">Match Songs to Playlists</h1>
          <p className="text-muted-foreground">Find the perfect playlists for your liked songs</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            onClick={handleBatchAnalysis}
            variant="secondary"
            className="transition-all duration-200 gap-2 hover:scale-105 active:scale-95 hover:shadow-sm"
          >
            <RefreshCw className="h-4 w-4" /> Analyze More Songs
          </Button>

          <Tabs defaultValue="all" value={activeView} onValueChange={setActiveView} className="w-auto">
            <TabsList className="bg-card/50 border border-border">
              <TabsTrigger value="all" className="data-[state=active]:bg-card text-muted-foreground data-[state=active]:text-foreground">All</TabsTrigger>
              <TabsTrigger value="analyzed" className="data-[state=active]:bg-card text-muted-foreground data-[state=active]:text-foreground">Analyzed</TabsTrigger>
              <TabsTrigger value="unanalyzed" className="data-[state=active]:bg-card text-muted-foreground data-[state=active]:text-foreground">Unanalyzed</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <NotificationMessage type={notification.type} message={notification.message} />
      )}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 h-full">
        {/* Playlists Column */}
        <div className="md:col-span-4 lg:col-span-3">
          <Card className="bg-card border-border h-full shadow-sm">
            <CardHeader className="pb-2 border-b border-border">
              <CardTitle className="text-lg flex items-center gap-3 text-foreground">
                <div className="bg-green-500/20 p-1.5 rounded-md">
                  <ListMusic className="h-5 w-5 text-green-400" />
                </div>
                <span className="font-bold">AI-Enabled Playlists</span>
              </CardTitle>
            </CardHeader>

            <CardContent className="p-4 space-y-2">
              <ScrollArea className="h-[calc(100vh-300px)] pr-4">
                <button
                  onClick={() => setSelectedPlaylist(null)}
                  className={`w-full p-3 text-left rounded-md flex justify-between items-center transition-colors ${!selectedPlaylist
                    ? 'bg-card-primary border border-primary/30 text-foreground'
                    : 'bg-card/50 border border-border text-foreground hover:bg-card hover:border-border'
                    }`}
                >
                  <div className="flex items-center gap-2">
                    <Music className="h-4 w-4 text-muted-foreground" />
                    <span>All Playlists</span>
                  </div>
                  <div className="bg-secondary px-2 py-0.5 rounded-md text-xs text-foreground">
                    {likedSongs.filter(s => s.analyzed).length}
                  </div>
                </button>

                {aiPlaylists.map((playlist) => (
                  <button
                    key={playlist.id}
                    onClick={() => setSelectedPlaylist(playlist.id)}
                    className={`w-full p-3 text-left rounded-md flex justify-between items-center transition-colors ${selectedPlaylist === playlist.id
                      ? 'bg-card-primary border border-primary/30 text-foreground'
                      : 'bg-card/50 border border-border text-foreground hover:bg-card hover:border-border'
                      }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <Music className="h-4 w-4 text-muted-foreground" />
                        <span>{playlist.name}</span>
                      </div>
                      {selectedPlaylist === playlist.id && (
                        <p className="text-xs text-muted-foreground mt-1 ml-6">{playlist.description}</p>
                      )}
                    </div>
                    <div className="bg-secondary px-2 py-0.5 rounded-md text-xs text-foreground">
                      {likedSongs.filter(s => s.analyzed && s.matchingPlaylists.includes(playlist.id)).length}
                    </div>
                  </button>
                ))}

                <div className="pt-3 border-t border-border mt-3">
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Other Playlists</h3>
                  {playlists.filter(p => !p.aiEnabled).map((playlist) => (
                    <div
                      key={playlist.id}
                      className="w-full p-3 text-left rounded-md flex justify-between items-center bg-card/30 border border-border text-muted-foreground mb-2"
                    >
                      <div className="flex items-center gap-2">
                        <Music className="h-4 w-4 opacity-50" />
                        <span>{playlist.name}</span>
                      </div>
                      <div className="text-xs bg-card px-2 py-1 rounded text-muted-foreground">
                        No AI flag
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Songs Column */}
        <div className="md:col-span-8 lg:col-span-9 flex flex-col space-y-6">
          {/* Analysis Status Card */}
          <Card className="bg-card border-border shadow-sm">
            <CardContent className="p-4 flex flex-col md:flex-row gap-6">
              <div className="md:w-1/2 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Songs analyzed</span>
                  <span className="font-medium text-foreground">{analysisDone} / {totalSongs}</span>
                </div>
                <div className="w-full">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Analysis Progress</span>
                    <span className="text-green-400 font-medium">{analysisProgress}%</span>
                  </div>
                  <Progress
                    value={analysisProgress}
                    className="h-3 bg-card border border-border"
                    indicatorClassName="bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]"

                  />
                </div>
              </div>

              <div className="md:w-1/2 flex items-center gap-4">
                <div className="bg-blue-500/20 rounded-full p-2">
                  <Info className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-foreground font-medium">
                    {unanalyzedCount > 0
                      ? `${unanalyzedCount} songs need analysis`
                      : "All songs have been analyzed!"
                    }
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {unanalyzedCount > 0
                      ? "Analyze songs to get playlist matches"
                      : "You can now sort all your songs"
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Song List */}
          <Card className="bg-card border-border h-full shadow-sm">
            <CardHeader className="pb-2 border-b border-border flex-row flex justify-between items-center">
              <CardTitle className="text-lg flex items-center gap-2 text-foreground">
                <div className="bg-blue-500/20 p-1.5 rounded-md">
                  <Music className="h-5 w-5 text-blue-400" />
                </div>
                <span className="font-bold">
                  {selectedPlaylist
                    ? `Matches for "${getPlaylistName(selectedPlaylist)}"`
                    : 'Your Liked Songs'}
                </span>
              </CardTitle>

              <div className="relative w-64">
                <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search songs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-card border-border text-foreground"
                />
              </div>
            </CardHeader>

            <CardContent className="p-4">
              <ScrollArea className="h-[calc(100vh-420px)]">
                {filteredSongs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <div className="bg-card rounded-full p-4 mb-3">
                      <Music className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-medium text-foreground mb-1">No songs found</h3>
                    <p className="text-muted-foreground text-center">
                      {searchQuery
                        ? "Try adjusting your search terms"
                        : selectedPlaylist
                          ? "No songs match this playlist's criteria"
                          : "Your liked songs will appear here"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredSongs.map((song) => {
                      const colorClasses = getColorClasses(song.colorClass);
                      return (
                        <div
                          key={song.id}
                          className={`p-4 rounded-md border ${song.analyzed
                            ? 'bg-card/70 border-border hover:border-border'
                            : 'bg-card/40 border-border'
                            } transition-colors`}
                        >
                          <div className="flex justify-between items-center mb-3">
                            <div className="flex items-center gap-3">
                              <div className={`w-12 h-12 ${colorClasses.bg} rounded-md flex items-center justify-center`}>
                                <div className={`w-8 h-8 ${colorClasses.inner} rounded-sm`}></div>
                              </div>
                              <div>
                                <h3 className="font-medium text-foreground">{song.title}</h3>
                                <p className="text-muted-foreground text-sm">{song.artist} • {song.album}</p>
                                <p className="text-muted-foreground text-xs">Added {song.addedAt}</p>
                              </div>
                            </div>

                            {song.analyzed ? (
                              <div className="px-3 py-1.5 text-green-400 text-sm font-medium bg-green-500/10 border border-green-500/20 rounded-full">
                                {song.match}% match
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="transition-all duration-200 hover:scale-105 active:scale-95"
                                onClick={() => handleAnalyzeSong(song.id)}
                              >
                                Analyze
                              </Button>
                            )}
                          </div>

                          {song.analyzed && (
                            <div className="flex flex-wrap items-center justify-between text-sm bg-card rounded-md p-3 border border-border">
                              <div className="flex flex-wrap gap-1 items-center text-muted-foreground">
                                <span className="text-muted-foreground mr-1">Best matches:</span>
                                {song.matchingPlaylists.map((id) => (
                                  <span key={id} className="px-2 py-1 bg-secondary text-foreground rounded-md">
                                    {getPlaylistName(id)}
                                  </span>
                                ))}
                              </div>

                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-sm gap-1 mt-2 sm:mt-0 transition-all duration-200 hover:scale-105 active:scale-95"
                                onClick={() => handleSortSong(song.id, song.matchingPlaylists)}
                              >
                                <ArrowRight className="h-3.5 w-3.5" />
                                Sort
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>

              {filteredSongs.some(song => !song.analyzed) && (
                <div className="mt-4 p-4 border border-blue-800 bg-blue-900/20 rounded-md flex items-start gap-3">
                  <Info className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-foreground font-medium mb-1">Some songs need analysis</h4>
                    <p className="text-muted-foreground text-sm">
                      {filteredSongs.filter(s => !s.analyzed).length} songs haven't been analyzed yet.
                      Analyze them to get playlist matches.
                    </p>
                    <Button
                      size="sm"
                      className="mt-2"
                      variant="ghost"
                      onClick={handleBatchAnalysis}
                    >
                      Analyze All Unanalyzed
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default MatchingInterface;