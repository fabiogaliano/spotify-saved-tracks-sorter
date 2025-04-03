import {
  CheckCircle2,
  Info,
  ListMusic,
  Music,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  Sparkles
} from 'lucide-react';
import React, { ReactNode, useEffect, useState } from 'react';
import { PlaylistWithTracks } from '~/lib/models/Playlist';
import { Card, CardContent, CardHeader, CardTitle } from '~/shared/components/ui/Card';
import { Button } from '~/shared/components/ui/button';
import { Input } from '~/shared/components/ui/input';
import { ScrollArea } from '~/shared/components/ui/scroll-area';
import { Switch } from '~/shared/components/ui/switch';
import { Tabs, TabsList, TabsTrigger } from '~/shared/components/ui/tabs';
import { Textarea } from '~/shared/components/ui/textarea';

// Color mapping helper function
const getColorClasses = (colorName: string) => {
  const colorMap: Record<string, { bg: string; inner: string; icon: string; text: string }> = {
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

// Reusable UI components
const IconContainer = ({ icon: Icon, color, size = 'md' }: { icon: React.ElementType, color: string, size?: 'sm' | 'md' | 'lg' }) => {
  const sizeClasses = {
    sm: 'p-0.5',
    md: 'p-1.5',
    lg: 'p-2'
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  return (
    <div className={`bg-${color}-500/20 ${sizeClasses[size]} rounded-md`}>
      <Icon className={`${iconSizes[size]} text-${color}-400`} />
    </div>
  );
};

const SectionTitle = ({ icon, title, count }: { icon: React.ReactNode, title: string, count?: number }) => {
  return (
    <div className="flex justify-between items-center">
      <CardTitle className="text-lg flex items-center gap-2 text-white">
        {icon}
        <span className="font-bold">{title}</span>
      </CardTitle>
      {count !== undefined && (
        <div className="text-xs bg-blue-500/20 px-2 py-1 rounded-md text-blue-400 font-medium">
          {count} total
        </div>
      )}
    </div>
  );
};

const Badge = ({ children, color = 'blue' }: { children: ReactNode, color?: string }) => {
  return (
    <div className={`text-xs bg-${color}-500/20 px-2 py-1 rounded-md text-${color}-400 font-medium`}>
      {children}
    </div>
  );
};

const NotificationMessage = ({ type, message }: { type: 'success' | 'info', message: string }) => {
  return (
    <div className={`p-4 rounded-md border ${type === 'success'
      ? 'bg-green-900/20 border-green-800 text-green-400'
      : 'bg-blue-900/20 border-blue-800 text-blue-400'}`}>
      <div className="flex items-center gap-2">
        {type === 'success' ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : (
          <Info className="h-4 w-4" />
        )}
        {message}
      </div>
    </div>
  );
};

const ColoredBox = ({ color, size = 'md' }: { color: string, size?: 'sm' | 'md' | 'lg' }) => {
  const sizes = {
    sm: { outer: 'w-6 h-6', inner: 'w-4 h-4' },
    md: { outer: 'w-10 h-10', inner: 'w-7 h-7' },
    lg: { outer: 'w-32 h-32', inner: 'w-24 h-24' }
  };

  const { outer, inner } = sizes[size];
  const colors = getColorClasses(color);

  return (
    <div className={`${outer} ${colors.bg} rounded-md flex items-center justify-center`}>
      <div className={`${inner} ${colors.inner} rounded-sm`}></div>
    </div>
  );
};

const PlaylistManagement = ({ playlistsWithTracks }: { playlistsWithTracks: PlaylistWithTracks[] }) => {
  // State for active playlist and edit mode
  const [selectedPlaylist, setSelectedPlaylist] = useState<string | null>(() => {
    // Try to get the previously selected playlist from localStorage
    const savedPlaylist = typeof window !== 'undefined' ? localStorage.getItem('selectedPlaylistId') : null;
    return savedPlaylist;
  });
  const [selectedTab, setSelectedTab] = useState<string>('ai'); // Add state for selected tab
  const [editMode, setEditMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notification, setNotification] = useState<{ type: 'success' | 'info', message: string } | null>(null);
  const [aiFlag, setAiFlag] = useState('');

  // Assign deterministic colors to playlists based on their ID
  const getColorForPlaylist = (playlistId: string) => {
    const colors = ['blue', 'green', 'purple', 'pink', 'yellow'];
    // Use the sum of character codes in the ID to determine the color
    // This ensures the same playlist always gets the same color
    const charSum = playlistId.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return colors[charSum % colors.length];
  };

  // Set the first playlist as active when component mounts
  useEffect(() => {
    if (playlistsWithTracks.length > 0) {
      // If there's no selected playlist or the selected playlist doesn't exist in the current list
      const playlistExists = playlistsWithTracks.some(p => p.id.toString() === selectedPlaylist);

      if (!selectedPlaylist || !playlistExists) {
        setSelectedPlaylist(playlistsWithTracks[0].id.toString());
      }
    }
  }, [playlistsWithTracks, selectedPlaylist]);

  // Save selected playlist to localStorage whenever it changes
  useEffect(() => {
    if (selectedPlaylist) {
      localStorage.setItem('selectedPlaylistId', selectedPlaylist);
    }
  }, [selectedPlaylist]);

  // Map playlists to the format needed for the UI
  const playlistsData = playlistsWithTracks.map(playlist => ({
    id: playlist.id.toString(),
    name: playlist.name,
    songCount: playlist.track_count,
    imageColor: getColorForPlaylist(playlist.id.toString()),
    description: playlist.description || 'No description',
    aiEnabled: playlist.is_flagged || false,
    songs: playlist.tracks.length,
    recentlyAdded: 0 // We don't have this information readily available
  }));

  // Function to format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  // Filter playlists based on search query
  const filteredPlaylists = playlistsData.filter(playlist => {
    if (!searchQuery) return true;

    const query = searchQuery.toLowerCase();
    return (
      playlist.name.toLowerCase().includes(query) ||
      playlist.description.toLowerCase().includes(query)
    );
  });

  // Get the currently selected playlist
  const currentPlaylist = selectedPlaylist
    ? playlistsData.find(p => p.id === selectedPlaylist)
    : null;

  // Get the tracks for the currently selected playlist
  const currentPlaylistWithTracks = selectedPlaylist
    ? playlistsWithTracks.find(p => p.id.toString() === selectedPlaylist)
    : null;

  // Format tracks for display
  const playlistTracks = currentPlaylistWithTracks
    ? currentPlaylistWithTracks.tracks.map(track => ({
      id: track.spotify_track_id,
      title: track.name,
      artist: track.artist,
      album: track.album || 'Unknown Album',
      dateAdded: formatDate(track.added_at || '')
    }))
    : [];

  // Handlers
  const handleSaveAiFlag = () => {
    setEditMode(false);
    setNotification({
      type: 'success',
      message: 'AI flag saved successfully!'
    });

    setTimeout(() => setNotification(null), 3000);
  };

  const handleEnableAI = (enabled: boolean) => {
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

  // Using the globally defined getColorClasses function

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
        <NotificationMessage type={notification.type} message={notification.message} />
      )}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 h-full">
        {/* Playlists Column */}
        <div className="md:col-span-4 lg:col-span-3">
          <Card className="bg-gray-900/80 border-gray-800 h-full">
            <CardHeader className="pb-2 border-b border-gray-800">
              <div className="flex justify-between items-center">
                <SectionTitle
                  icon={<IconContainer icon={ListMusic} color="purple" />}
                  title="Your Playlists"
                  count={playlistsData.length}
                />
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
                <Tabs defaultValue="ai" onValueChange={setSelectedTab}>
                  <TabsList className="bg-gray-900/50 border border-gray-800 w-full grid grid-cols-2">
                    <TabsTrigger value="ai" className="data-[state=active]:bg-gray-800 text-gray-400 data-[state=active]:text-white">AI-Enabled</TabsTrigger>
                    <TabsTrigger value="all" className="data-[state=active]:bg-gray-800 text-gray-400 data-[state=active]:text-white">Others Playlists</TabsTrigger>
                  </TabsList>
                </Tabs>

                <div className="space-y-2">
                  {filteredPlaylists
                    .filter(playlist => selectedTab !== 'ai' || playlist.aiEnabled)
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
                            <ColoredBox color={playlist.imageColor} />
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span>{playlist.name}</span>
                                {playlist.aiEnabled && (
                                  <IconContainer icon={Sparkles} color={playlist.imageColor} size="sm" />
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

                            <Badge color="gray">
                              {currentPlaylist.aiEnabled ? 'Enabled' : 'Disabled'}
                            </Badge>
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