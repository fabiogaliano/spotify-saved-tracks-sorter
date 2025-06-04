import { ComponentProps, Suspense, useState } from 'react';
import { Await, useLoaderData, useNavigation } from 'react-router';
import { LikedSongsTable } from '~/features/liked-songs-management/LikedSongsTable'
import { LikedSongsProvider } from '~/features/liked-songs-management/context';
import MatchingInterface from '~/components/MatchingInterface';
import SettingsTab from '~/components/Settings';
import { AnalysisStats, LibraryStatus, QuickActions, RecentActivity } from '~/features/dashboard';
import { DashboardLoaderData, loader } from '~/features/dashboard/dashboard.loader.server';
import PlaylistManagement from '~/features/playlist-management/components/PlaylistManagement';
import { Header } from '~/shared/components/Header';
import { Card, CardContent } from '~/shared/components/ui/Card';
import { LoadingSpinner } from '~/shared/components/ui/LoadingSpinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/shared/components/ui/tabs';

export { loader };
type LoadedTabs = {
  [key: string]: boolean;
};

const DashboardTab = ({ value, ...props }: ComponentProps<typeof TabsTrigger>) => {
  const formatDisplayText = (val: string) => {
    if (val === 'likedsongs') return 'Liked Songs Analysis';
    if (val === 'matching') return 'Match Songs to Playlists';
    return val.charAt(0).toUpperCase() + val.slice(1);
  };

  return (
    <TabsTrigger
      value={value}
      className="data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:border-b-2 data-[state=active]:border-green-500 rounded-none px-4 py-2 text-muted-foreground hover:text-foreground"
      {...props}
    >
      {formatDisplayText(value)}
    </TabsTrigger>
  );
};

const LoadingFallback = () => (
  <div className="flex items-center justify-center h-64">
    <LoadingSpinner className="w-8 h-8 text-green-500" />
    <span className="ml-2 text-muted-foreground">Loading data...</span>
  </div>
);

const Dashboard = () => {
  const { user, likedSongs, playlists } = useLoaderData<DashboardLoaderData>()
  const navigation = useNavigation();
  const isLoading = navigation.state === 'loading';
  const [activeTab, setActiveTab] = useState('overview');
  const [loadedTabs, setLoadedTabs] = useState<LoadedTabs>({
    overview: true, // only the default tab is loaded initially
  });

  const handleTabChange = (value: string) => {
    setActiveTab(value);

    if (!loadedTabs[value]) {
      setLoadedTabs(prev => ({
        ...prev,
        [value]: true
      }));
    }
  };

  return (
    <>
      {isLoading && (
        <div className="fixed inset-0 bg-background/70 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-card p-8 rounded-lg shadow-xl flex flex-col items-center max-w-md">
            <LoadingSpinner className="w-12 h-12 text-green-500 mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2">Loading your library</h2>
            <p className="text-muted-foreground text-center">Please wait while we prepare your dashboard...</p>
          </div>
        </div>
      )}
      <div className="min-h-screen bg-theme-gradient text-foreground p-4 md:p-6">
        <div className="container mx-auto max-w-7xl">
          {/* Header */}
          <Header userName={user.spotify.name} image={user.spotify.image} />

          {/* Tabs Navigation */}
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full mb-6">
            <TabsList className="bg-card/50 border-b border-border w-full justify-start rounded-none px-0 h-auto">
              <DashboardTab value="overview" />
              <DashboardTab value="likedsongs" />
              <DashboardTab value="matching" />
              <DashboardTab value="playlists" />
              <DashboardTab value="settings" />
            </TabsList>

            {/* Overview Tab Content */}
            <TabsContent value="overview" className="mt-6 space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-4">
                  <Suspense fallback={<LoadingFallback />}>
                    <Await resolve={likedSongs}>
                      {(resolvedLikedSongs) => <LibraryStatus likedSongs={resolvedLikedSongs} playlists={playlists} />}
                    </Await>
                  </Suspense>
                </div>
                <div className="lg:col-span-8">
                  <QuickActions />
                </div>
                <div className="lg:col-span-8 lg:order-3">
                  <RecentActivity />
                </div>
                <div className="lg:col-span-4 lg:order-4">
                  <AnalysisStats />
                </div>
              </div>
            </TabsContent>

            {/* Other Tab Contents - Only render if they've been loaded */}
            <TabsContent value="likedsongs" className="mt-6">
              {loadedTabs.likedsongs && (
                <Card className="bg-card border-border">
                  <CardContent className="p-6">
                    <Suspense fallback={<LoadingFallback />}>
                      <Await resolve={likedSongs}>
                        {(resolvedLikedSongs) => (
                          <LikedSongsProvider initialSongs={resolvedLikedSongs} userId={user.id}>
                            <LikedSongsTable />
                          </LikedSongsProvider>
                        )}
                      </Await>
                    </Suspense>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="playlists" className="mt-6">
              {loadedTabs.playlists && (
                <Card className="bg-card border-border">
                  <CardContent className="p-6">
                    <Suspense fallback={<LoadingFallback />}>
                      <Await resolve={playlists}>
                        {(resolvedPlaylists) => <PlaylistManagement playlists={resolvedPlaylists} />}
                      </Await>
                    </Suspense>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="matching" className="mt-6">
              {loadedTabs.matching && (
                <Card className="bg-card border-border">
                  <CardContent className="p-6">
                    <MatchingInterface />
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="settings" className="mt-6">
              {loadedTabs.settings && (
                <Card className="bg-card border-border">
                  <CardContent className="p-6">
                    <SettingsTab />
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
};

const DashboardWithProviders = () => {
  return <Dashboard />;
};

export default DashboardWithProviders;