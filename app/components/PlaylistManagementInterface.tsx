import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '~/shared/components/ui/Card';
import { Button } from '~/shared/components/ui/button';
import { Input } from '~/shared/components/ui/input';
import { Textarea } from '~/shared/components/ui/textarea';
import { Switch } from '~/shared/components/ui/switch';
import { Progress } from '~/shared/components/ui/progress';
import {
  Music,
  Search,
  ListMusic,
  Edit,
  Settings,
  Sparkles,
  Plus,
  CheckCircle2,
  X,
  Info,
  Pencil,
  Save,
  ArrowRight,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/shared/components/ui/tabs';
import { ScrollArea } from '~/shared/components/ui/scroll-area';

const PlaylistManagement = () => {
  // State for active playlist and edit mode
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notification, setNotification] = useState(null);
  const [aiFlag, setAiFlag] = useState('');

  // Demo data
  const playlists = [
    {
      id: '1',
      name: 'Chill Vibes',
      songCount: 42,
      imageColor: 'green',
      description: 'AI: relaxing beats with mellow lyrics and acoustic instruments, perfect for unwinding after a long day',
      aiEnabled: true,
      songs: 42,
      recentlyAdded: 5
    },
    {
      id: '2',
      name: 'Morning Energy',
      songCount: 28,
      imageColor: 'blue',
      description: 'AI: upbeat tracks to start your day, positive lyrics and energetic tempos',
      aiEnabled: true,
      songs: 28,
      recentlyAdded: 0
    },
    {
      id: '3',
      name: 'Late Night Feels',
      songCount: 35,
      imageColor: 'purple',
      description: 'AI: emotional and introspective tracks with atmospheric production and deep lyrics',
      aiEnabled: true,
      songs: 35,
      recentlyAdded: 2
    },
    {
      id: '4',
      name: 'Workout Mix',
      songCount: 50,
      imageColor: 'pink',
      description: 'AI: high energy songs with driving beats and 120+ BPM, motivational lyrics',
      aiEnabled: true,
      songs: 50,
      recentlyAdded: 8
    },
    {
      id: '5',
      name: 'Focus',
      songCount: 32,
      imageColor: 'yellow',
      description: 'AI: ambient and minimal music for concentration, mostly instrumental or with minimal lyrics',
      aiEnabled: true,
      songs: 32,
      recentlyAdded: 0
    },
    {
      id: '6',
      name: 'Party Playlist',
      songCount: 64,
      imageColor: 'blue',
      description: 'Good vibes only',
      aiEnabled: false,
      songs: 64,
      recentlyAdded: 12
    },
    {
      id: '7',
      name: 'Road Trip',
      songCount: 47,
      imageColor: 'green',
      description: 'Music for the open road',
      aiEnabled: false,
      songs: 47,
      recentlyAdded: 3
    },
  ];

  // Sample playlist tracks for the selected playlist
  const playlistTracks = [
    { id: 't1', title: 'Dreams', artist: 'Fleetwood Mac', album: 'Rumours', dateAdded: '2 days ago' },
    { id: 't2', title: 'Landslide', artist: 'Fleetwood Mac', album: 'Fleetwood Mac', dateAdded: '2 days ago' },
    { id: 't3', title: 'Vienna', artist: 'Billy Joel', album: 'The Stranger', dateAdded: '1 week ago' },
    { id: 't4', title: 'Rocket Man', artist: 'Elton John', album: 'Honky Château', dateAdded: '3 days ago' },
    { id: 't5', title: 'Tiny Dancer', artist: 'Elton John', album: 'Madman Across The Water', dateAdded: '3 days ago' },
    { id: 't6', title: 'Africa', artist: 'Toto', album: 'Toto IV', dateAdded: '5 days ago' },
    { id: 't7', title: 'Hotel California', artist: 'Eagles', album: 'Hotel California', dateAdded: '1 week ago' },
    { id: 't8', title: 'Bohemian Rhapsody', artist: 'Queen', album: 'A Night at the Opera', dateAdded: '2 weeks ago' },
    { id: 't9', title: 'Under Pressure', artist: 'Queen & David Bowie', album: 'Hot Space', dateAdded: '2 weeks ago' },
    { id: 't10', title: 'Space Oddity', artist: 'David Bowie', album: 'David Bowie', dateAdded: '3 weeks ago' },
  ];

  // Filter playlists based on search query
  const filteredPlaylists = playlists.filter(playlist => {
    if (!searchQuery) return true;

    const query = searchQuery.toLowerCase();
    return (
      playlist.name.toLowerCase().includes(query) ||
      playlist.description.toLowerCase().includes(query)
    );
  });

  // Get the currently selected playlist
  const currentPlaylist = selectedPlaylist
    ? playlists.find(p => p.id === selectedPlaylist)
    : null;

  // Handlers
  const handleSaveAiFlag = () => {
    setEditMode(false);
    setNotification({
      type: 'success',
      message: 'AI flag saved successfully!'
    });

    setTimeout(() => setNotification(null), 3000);
  };

  const handleEnableAI = (enabled) => {
    setNotification({
      type: enabled ? 'success' : 'info',
      message: enabled
        ? 'AI sorting enabled for this playlist'
        : 'AI sorting disabled for this playlist'
    });

    setTimeout(() => setNotification(null), 3000);
  };

  const handleRescanPlaylist = () => {
    setNotification({
      type: 'info',
      message: 'Rescanning playlist tracks...'
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
          <h1 className="text-2xl font-bold text-white mb-1">Playlist Management</h1>
          <p className="text-gray-300">Configure AI flags and manage your playlists</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700 hover:border-gray-600 transition-colors gap-2"
          >
            <RefreshCw className="h-4 w-4" /> Sync Playlists
          </Button>

          <Button
            className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700 hover:border-gray-600 transition-colors gap-2"
          >
            <Plus className="h-4 w-4" /> Create AI Playlist
          </Button>
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <div className={`p-4 rounded-md border ${notification.type === 'success'
          ? 'bg-green-900/20 border-green-800 text-green-400'
          : 'bg-blue-900/20 border-blue-800 text-blue-400'
          }`}>
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <Info className="h-4 w-4" />
            )}
            {notification.message}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 h-full">
        {/* Playlists Column */}
        <div className="md:col-span-4 lg:col-span-3">
          <Card className="bg-gray-900/80 border-gray-800 h-full">
            <CardHeader className="pb-2 border-b border-gray-800">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg flex items-center gap-2 text-white">
                  <div className="bg-purple-500/20 p-1.5 rounded-md">
                    <ListMusic className="h-5 w-5 text-purple-400" />
                  </div>
                  <span className="font-bold">Your Playlists</span>
                </CardTitle>

                <div className="text-xs bg-blue-500/20 px-2 py-1 rounded-md text-blue-400 font-medium">
                  {playlists.length} total
                </div>
              </div>
            </CardHeader>

            <div className="p-4 border-b border-gray-800">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search playlists..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-gray-800 border-gray-700 text-white"
                />
              </div>
            </div>

            <CardContent className="p-4 space-y-2">
              <ScrollArea className="h-[calc(100vh-350px)] pr-4">
                <Tabs defaultValue="all" className="mb-4">
                  <TabsList className="bg-gray-900/50 border border-gray-800 w-full grid grid-cols-2">
                    <TabsTrigger value="all" className="data-[state=active]:bg-gray-800 text-gray-400 data-[state=active]:text-white">All Playlists</TabsTrigger>
                    <TabsTrigger value="ai" className="data-[state=active]:bg-gray-800 text-gray-400 data-[state=active]:text-white">AI-Enabled</TabsTrigger>
                  </TabsList>
                </Tabs>

                <div className="space-y-2">
                  {filteredPlaylists
                    .filter(playlist => TabsList.value !== 'ai' || playlist.aiEnabled)
                    .map((playlist) => {
                      const colors = getColorClasses(playlist.imageColor);
                      return (
                        <button
                          key={playlist.id}
                          onClick={() => setSelectedPlaylist(playlist.id)}
                          className={`w-full p-3 text-left rounded-md transition-colors ${selectedPlaylist === playlist.id
                            ? 'bg-gradient-to-r from-green-900/40 to-blue-900/40 border border-green-800/80 text-white'
                            : 'bg-gray-800/50 border border-gray-700 text-white hover:bg-gray-800 hover:border-gray-600'
                            }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 ${colors.bg} rounded-md flex items-center justify-center`}>
                              <div className={`w-7 h-7 ${colors.inner} rounded-sm`}></div>
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span>{playlist.name}</span>
                                {playlist.aiEnabled && (
                                  <div className={`${colors.icon} p-0.5 rounded`}>
                                    <Sparkles className={`h-3 w-3 ${colors.text}`} />
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center text-xs text-gray-400">
                                <span>{playlist.songs} songs</span>
                                {playlist.recentlyAdded > 0 && (
                                  <span className="ml-2 text-green-400">+{playlist.recentlyAdded} new</span>
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

        {/* Playlist Detail Column */}
        <div className="md:col-span-8 lg:col-span-9 flex flex-col space-y-6">
          {currentPlaylist ? (
            <>
              {/* Playlist Header Card */}
              <Card className="bg-gray-900/80 border-gray-800">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row gap-6">
                    {/* Playlist Image */}
                    <div className={`w-32 h-32 ${getColorClasses(currentPlaylist.imageColor).bg} rounded-md flex items-center justify-center shrink-0 mx-auto md:mx-0`}>
                      <div className={`w-24 h-24 ${getColorClasses(currentPlaylist.imageColor).inner} rounded-sm`}></div>
                    </div>

                    {/* Playlist Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-2xl font-bold text-white">{currentPlaylist.name}</h2>
                        {currentPlaylist.aiEnabled && (
                          <div className={`${getColorClasses(currentPlaylist.imageColor).icon} p-1 rounded-md`}>
                            <Sparkles className={`h-4 w-4 ${getColorClasses(currentPlaylist.imageColor).text}`} />
                          </div>
                        )}
                      </div>
                      <p className="text-gray-300">{currentPlaylist.songs} songs</p>

                      <div className="mt-4 flex flex-col gap-4">
                        <div className="flex flex-col">
                          <div className="flex justify-between mb-1">
                            <label className="text-sm text-gray-300 font-medium">AI Flag</label>
                            {!editMode && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 px-2 py-0 text-xs text-gray-400 hover:text-white hover:bg-transparent"
                                onClick={() => {
                                  setAiFlag(currentPlaylist.description.replace('AI: ', ''));
                                  setEditMode(true);
                                }}
                              >
                                <Pencil className="h-3 w-3 mr-1" /> Edit
                              </Button>
                            )}
                          </div>

                          {editMode ? (
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
                                  onClick={() => setEditMode(false)}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  size="sm"
                                  className="bg-white/10 hover:bg-white/20 text-white border-0"
                                  onClick={handleSaveAiFlag}
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
                                onCheckedChange={handleEnableAI}
                              />
                            </div>

                            <div className="text-xs bg-gray-800 px-2 py-1 rounded-md text-gray-400 ml-2">
                              {currentPlaylist.aiEnabled ? 'Enabled' : 'Disabled'}
                            </div>
                          </div>

                          <Button
                            size="sm"
                            className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700 hover:border-gray-600 transition-colors gap-1"
                            onClick={handleRescanPlaylist}
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
                  <CardTitle className="text-lg flex items-center gap-2 text-white">
                    <div className="bg-green-500/20 p-1.5 rounded-md">
                      <Music className="h-5 w-5 text-green-400" />
                    </div>
                    <span className="font-bold">Playlist Tracks</span>
                  </CardTitle>
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
          ) : (
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
          )}
        </div>
      </div>
    </div>
  );
};

export default PlaylistManagement;