import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '~/shared/components/ui/Card';
import { Button } from '~/shared/components/ui/button';
import { Progress } from '~/shared/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/shared/components/ui/tabs';
import {
  Music,
  RefreshCw,
  ListMusic,
  ArrowRight,
  Play,
  Settings,
  Activity,
  ChevronRight,
  Clock,
  CheckCircle2
} from 'lucide-react';
import Matching2 from '~/components/MatchingInterface';
import PlaylistManagement from '~/components/PlaylistManagementInterface';
import SettingsTab from '~/components/Settings';
import LikedSongsAnalysis from '~/components/LikedSongsAnalysis';

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-950 to-black text-white p-4 md:p-6">
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Your Music Dashboard</h1>
            <p className="text-gray-300">Organize your Spotify library intelligently</p>
          </div>
          <Button
            variant="default"
            size="sm"
            className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700 hover:border-gray-600 transition-colors gap-2"
          >
            <RefreshCw className="h-4 w-4" /> Sync Library
          </Button>
        </header>

        {/* Tabs Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mb-6">
          <TabsList className="bg-gray-900/50 border-b border-gray-800 w-full justify-start rounded-none px-0 h-auto">
            <TabsTrigger
              value="overview"
              className="data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-green-500 rounded-none px-4 py-2 text-gray-400 hover:text-white"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="likedsongs"
              className="data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-green-500 rounded-none px-4 py-2 text-gray-400 hover:text-white"
            >
              Liked Songs Analysis
            </TabsTrigger>

            <TabsTrigger
              value="matching"
              className="data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-green-500 rounded-none px-4 py-2 text-gray-400 hover:text-white"
            >
              Match Songs to Playlists
            </TabsTrigger>
            <TabsTrigger
              value="playlists"
              className="data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-green-500 rounded-none px-4 py-2 text-gray-400 hover:text-white"
            >
              Playlists
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-green-500 rounded-none px-4 py-2 text-gray-400 hover:text-white"
            >
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab Content */}
          <TabsContent value="overview" className="mt-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Library Status */}
              <div className="md:col-span-4">
                <Card className="bg-gray-900/80 border-gray-800 overflow-hidden">
                  <CardHeader className="pb-2 border-b border-gray-800">
                    <CardTitle className="text-lg flex items-center gap-2 text-white">
                      <div className="bg-green-500/20 p-1.5 rounded-md">
                        <Music className="h-5 w-5 text-green-400" />
                      </div>
                      <span className="font-bold">Library Status</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-300">Songs in library</span>
                        <span className="font-medium text-white">873</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Songs analyzed</span>
                        <span className="font-medium text-white">142</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">AI-flagged playlists</span>
                        <span className="font-medium text-white">7</span>
                      </div>
                    </div>

                    <div className="w-full">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-300">Analysis Progress</span>
                        <span className="text-green-400 font-medium">16%</span>
                      </div>
                      <Progress value={16} className="h-3 bg-gray-800 border border-gray-700" indicatorClassName="bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Quick Actions */}
              <div className="md:col-span-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="bg-gradient-to-br from-green-900/40 to-blue-900/40 border border-green-800/50 hover:border-green-500/50 transition-all cursor-pointer overflow-hidden">
                    <CardContent className="p-5 flex flex-col h-full">
                      <div className="bg-green-500/20 rounded-full p-2 w-fit mb-3">
                        <Play className="h-5 w-5 text-green-400" />
                      </div>
                      <h3 className="font-medium text-white mb-1">Match Songs to Playlists</h3>
                      <p className="text-sm text-gray-300 mb-3">Find the perfect playlists for your songs</p>
                      <Button
                        className="mt-auto w-full bg-white/10 hover:bg-white/20 text-white border-0"
                      >
                        Start Matching <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-blue-900/40 to-indigo-900/40 border border-blue-800/50 hover:border-blue-500/50 transition-all cursor-pointer overflow-hidden">
                    <CardContent className="p-5 flex flex-col h-full">
                      <div className="bg-blue-500/20 rounded-full p-2 w-fit mb-3">
                        <Music className="h-5 w-5 text-blue-400" />
                      </div>
                      <h3 className="font-medium text-white mb-1">Analyze Songs</h3>
                      <p className="text-sm text-gray-300 mb-3">Process lyrics and metadata (Batch: 15)</p>
                      <Button
                        className="mt-auto w-full bg-white/10 hover:bg-white/20 text-white border-0"
                      >
                        Analyze Batch <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-purple-900/40 to-indigo-900/40 border border-purple-800/50 hover:border-purple-500/50 transition-all cursor-pointer overflow-hidden">
                    <CardContent className="p-5 flex flex-col h-full">
                      <div className="bg-purple-500/20 rounded-full p-2 w-fit mb-3">
                        <ListMusic className="h-5 w-5 text-purple-400" />
                      </div>
                      <h3 className="font-medium text-white mb-1">Manage Playlists</h3>
                      <p className="text-sm text-gray-300 mb-3">Configure AI flags and descriptions</p>
                      <Button
                        className="mt-auto w-full bg-white/10 hover:bg-white/20 text-white border-0"
                      >
                        View Playlists <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="md:col-span-8">
                <Card className="bg-gray-900/80 border-gray-800 overflow-hidden h-full">
                  <CardHeader className="pb-2 border-b border-gray-800">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-lg flex items-center gap-2 text-white">
                        <div className="bg-blue-500/20 p-1.5 rounded-md">
                          <Activity className="h-5 w-5 text-blue-400" />
                        </div>
                        <span className="font-bold">Recent Activity</span>
                      </CardTitle>
                      <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white hover:bg-transparent p-0 h-auto">
                        View All <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1">
                      <div className="flex items-start gap-3 p-3 rounded-md hover:bg-black/20 transition-colors">
                        <div className="bg-green-500/20 rounded-full p-1.5 mt-0.5">
                          <CheckCircle2 className="h-4 w-4 text-green-400" />
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <p className="text-white font-medium">12 songs matched to "Workout Mix"</p>
                            <span className="text-xs text-gray-400 whitespace-nowrap ml-2">Just now</span>
                          </div>
                          <p className="text-sm text-gray-400">Songs automatically sorted based on analysis</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 p-3 rounded-md hover:bg-black/20 transition-colors">
                        <div className="bg-blue-500/20 rounded-full p-1.5 mt-0.5">
                          <Music className="h-4 w-4 text-blue-400" />
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <p className="text-white font-medium">15 songs analyzed</p>
                            <span className="text-xs text-gray-400 whitespace-nowrap ml-2">5 min ago</span>
                          </div>
                          <p className="text-sm text-gray-400">Batch analysis completed in 45 seconds</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 p-3 rounded-md hover:bg-black/20 transition-colors">
                        <div className="bg-purple-500/20 rounded-full p-1.5 mt-0.5">
                          <ListMusic className="h-4 w-4 text-purple-400" />
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <p className="text-white font-medium">"Chill Vibes" playlist updated</p>
                            <span className="text-xs text-gray-400 whitespace-nowrap ml-2">2 hours ago</span>
                          </div>
                          <p className="text-sm text-gray-400">AI flag added: "relaxing acoustic songs with nature themes"</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Analysis Stats */}
              <div className="md:col-span-4">
                <Card className="bg-gray-900/80 border-gray-800 overflow-hidden h-full">
                  <CardHeader className="pb-2 border-b border-gray-800">
                    <CardTitle className="text-lg flex items-center gap-2 text-white">
                      <div className="bg-purple-500/20 p-1.5 rounded-md">
                        <Clock className="h-5 w-5 text-purple-400" />
                      </div>
                      <span className="font-bold">Processing Status</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-300">API credits used</span>
                        <span className="font-medium text-white">127</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">API credits remaining</span>
                        <span className="font-medium text-white">873</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Estimated completion</span>
                        <span className="font-medium text-white">~35 minutes</span>
                      </div>
                    </div>

                    <Card className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 border-gray-800">
                      <CardContent className="p-4">
                        <h4 className="text-sm font-medium text-white mb-1">Need faster analysis?</h4>
                        <p className="text-xs text-gray-300">Increase your batch size in settings to process more songs at once.</p>
                        <Button
                          size="sm"
                          className="mt-2 text-xs text-white bg-white/10 hover:bg-white/20 px-3 py-1 h-auto transition-colors"
                        >
                          Adjust Settings
                        </Button>
                      </CardContent>
                    </Card>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Other Tab Contents (Placeholder) */}
          <TabsContent value="likedsongs" className="mt-6">
            <Card className="bg-gray-900/80 border-gray-800">
              <CardContent className="p-6">
                <LikedSongsAnalysis />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="playlists" className="mt-6">
            <Card className="bg-gray-900/80 border-gray-800">
              <CardContent className="p-6">
                <PlaylistManagement />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="matching" className="mt-6">
            <Card className="bg-gray-900/80 border-gray-800">
              <CardContent className="p-6">
                <Matching2 />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="mt-6">
            <Card className="bg-gray-900/80 border-gray-800">
              <CardContent className="p-6">
                <SettingsTab />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div >
  );
};

export default Dashboard;