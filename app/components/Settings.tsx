import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '~/shared/components/ui/Card';
import { Button } from '~/shared/components/ui/button';
import { Label } from '~/shared/components/ui/label';
import { Slider } from '~/shared/components/ui/slider';
import { Switch } from '~/shared/components/ui/switch';
import {
  Settings,
  Key,
  Sliders,
  Save,
  Trash2,
  AlertTriangle,
  HelpCircle,
  RefreshCw
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/shared/components/ui/tabs';
import { ApiKeyManager } from '~/components/ApiKeys/ApiKeyManager';
import { LibrarySyncMode } from '~/lib/models/User';

const SettingsTab = () => {
  // State for settings
  const [batchSize, setBatchSize] = useState(10);
  const [syncMode, setSyncMode] = useState<LibrarySyncMode>('automatic');
  const [darkMode, setDarkMode] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState('general');
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null);

  // Handle settings save
  const handleSaveSettings = () => {
    setNotification({
      type: 'success',
      message: 'Settings saved successfully'
    });

    setTimeout(() => setNotification(null), 3000);
  };

  // Handle account deletion
  const handleDeleteAccount = () => {
    setNotification({
      type: 'info',
      message: 'Account scheduled for deletion. You will receive a confirmation email.'
    });

    setShowDeleteConfirm(false);
    setTimeout(() => setNotification(null), 3000);
  };

  return (
    <div className="h-full flex flex-col space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-1">Settings</h1>
        <p className="text-foreground">Customize your app preferences and manage your account</p>
      </div>

      {/* Notification */}
      {notification && (
        <div className={`p-4 rounded-md border ${notification.type === 'success'
          ? 'bg-green-900/20 border-green-800 text-green-400'
          : notification.type === 'error'
            ? 'bg-red-900/20 border-red-800 text-red-400'
            : 'bg-blue-900/20 border-blue-800 text-blue-400'
          }`}>
          <div className="flex items-center gap-2">
            {notification.message}
          </div>
        </div>
      )}

      {/* Settings Tabs */}
      <div className="flex flex-col">
        <Tabs defaultValue="general" value={activeSettingsTab} onValueChange={setActiveSettingsTab} className="w-full">
          <TabsList className="bg-card/50 border-b border-border w-full justify-start rounded-none px-0 h-auto">
            <TabsTrigger
              value="general"
              className="data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:border-b-2 data-[state=active]:border-green-500 rounded-none px-4 py-2 text-muted-foreground hover:text-foreground"
            >
              General
            </TabsTrigger>
            <TabsTrigger
              value="api"
              className="data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:border-b-2 data-[state=active]:border-green-500 rounded-none px-4 py-2 text-muted-foreground hover:text-foreground"
            >
              API Keys
            </TabsTrigger>
            <TabsTrigger
              value="account"
              className="data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:border-b-2 data-[state=active]:border-green-500 rounded-none px-4 py-2 text-muted-foreground hover:text-foreground"
            >
              Account
            </TabsTrigger>
          </TabsList>

          {/* General Settings */}
          <TabsContent value="general" className="mt-6 space-y-6">
            <Card className="bg-card border-border">
              <CardHeader className="pb-2 border-b border-border">
                <CardTitle className="text-lg flex items-center gap-2 text-foreground">
                  <div className="bg-green-500/20 p-1.5 rounded-md">
                    <Sliders className="h-5 w-5 text-green-400" />
                  </div>
                  <span className="font-bold">App Preferences</span>
                </CardTitle>
              </CardHeader>

              <CardContent className="p-6 space-y-6">
                {/* Batch Size Setting */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label htmlFor="batchSize" className="text-foreground text-lg font-normal">Batch Size: {batchSize} songs</Label>
                    <span className="text-foreground">
                      {batchSize <= 5 ? 'Low' : batchSize >= 15 ? 'High' : 'Recommended'}
                    </span>
                  </div>
                  <div className="py-2">
                    <Slider
                      id="batchSize"
                      min={1}
                      max={20}
                      step={5}
                      value={[batchSize]}
                      onValueChange={(value) => {
                        const newValue = value[0] === 1 ? 1 : Math.round(value[0] / 5) * 5;
                        setBatchSize(newValue);
                      }}
                      className="h-2"
                    />
                  </div>
                  <p className="text-foreground mt-1">
                    Controls how many songs are analyzed in a single batch.
                    Larger batches are faster but use more API credits.
                  </p>
                </div>

                {/* Library Sync Setting */}
                <div className="space-y-2 pt-6 border-t border-border">
                  <Label htmlFor="syncMode" className="text-foreground text-lg font-normal mb-2 block">Library Sync</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={() => setSyncMode('manual')}
                      className={syncMode === 'manual'
                        ? 'bg-primary text-primary-foreground border-none rounded-md text-center font-normal'
                        : 'bg-secondary text-secondary-foreground border border-border rounded-md text-center font-normal hover:bg-primary hover:text-primary-foreground'
                      }
                    >
                      Manual
                    </Button>
                    <Button
                      onClick={() => setSyncMode('automatic')}
                      className={syncMode === 'automatic'
                        ? 'bg-primary text-primary-foreground border-none rounded-md text-center font-normal'
                        : 'bg-secondary text-secondary-foreground border border-border rounded-md text-center font-normal hover:bg-primary hover:text-primary-foreground'
                      }
                    >
                      Automatic
                    </Button>
                  </div>
                  <p className="text-foreground mt-2">
                    Choose whether to sync your Spotify library automatically when you login.
                  </p>
                </div>

                {/* Theme Setting */}
                <div className="flex items-center justify-between pt-6 border-t border-border">
                  <div className="space-y-0.5">
                    <h3 className="text-foreground text-lg font-normal">Dark Mode</h3>
                    <p className="text-foreground">Switch between light and dark themes</p>
                  </div>
                  <Switch
                    checked={darkMode}
                    onCheckedChange={setDarkMode}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>

                {/* Notification Setting */}
                <div className="flex items-center justify-between pt-6 border-t border-border">
                  <div className="space-y-0.5">
                    <h3 className="text-foreground text-lg font-normal">Email Notifications</h3>
                    <p className="text-foreground">Receive updates about your library and new features</p>
                  </div>
                  <Switch
                    checked={emailNotifications}
                    onCheckedChange={setEmailNotifications}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>
              </CardContent>

              <CardFooter className="border-t border-border px-6 py-4">
                <Button
                  className="bg-primary hover:bg-primary/90 text-primary-foreground border-0 ml-auto"
                  onClick={handleSaveSettings}
                >
                  Save Settings
                </Button>
              </CardFooter>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader className="pb-2 border-b border-border">
                <CardTitle className="text-lg flex items-center gap-2 text-foreground">
                  <div className="bg-purple-500/20 p-1.5 rounded-md">
                    <RefreshCw className="h-5 w-5 text-purple-400" />
                  </div>
                  <span className="font-bold">Library Management</span>
                </CardTitle>
              </CardHeader>

              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-foreground text-lg font-normal mb-1">Library Cache</h3>
                    <p className="text-foreground">Clear local song analysis data and resync with Spotify</p>
                  </div>
                  <Button
                    className="bg-primary hover:bg-primary/90 text-primary-foreground border-0"
                  >
                    Clear & Refresh
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* API Keys Settings */}
          <TabsContent value="api" className="mt-6">
            <Card className="bg-card border-border">
              <CardHeader className="pb-2 border-b border-border">
                <CardTitle className="text-lg flex items-center gap-2 text-foreground">
                  <div className="bg-blue-500/20 p-1.5 rounded-md">
                    <Key className="h-5 w-5 text-blue-400" />
                  </div>
                  <span className="font-bold">AI Provider Settings</span>
                </CardTitle>
              </CardHeader>

              <CardContent className="p-6">
                <div className="space-y-6">
                  <div className="text-foreground space-y-1">
                    <p>
                      sort. uses AI services to analyze your music's lyrics, mood, and themes.
                      Provide an API key from one of our supported providers.
                    </p>
                    <p>
                      Your API key is stored securely and only used for analyzing your music.
                    </p>
                  </div>

                  <ApiKeyManager
                    autoSetActive={true}
                    initialLoad={true}
                  />

                  <div className="rounded-lg bg-blue-900/20 border border-blue-800 p-4 text-foreground">
                    <div className="flex items-start gap-2">
                      <HelpCircle className="h-5 w-5 shrink-0 mt-0.5 text-blue-400" />
                      <div>
                        <p className="font-medium mb-1">Need a free API key?</p>
                        <p>
                          Google AI Studio offers free keys with generous limits.
                          <a
                            href="https://aistudio.google.com/welcome"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-1 text-blue-400 hover:underline"
                          >
                            Sign up here
                          </a>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Account Settings */}
          <TabsContent value="account" className="mt-6 space-y-6">
            <Card className="bg-card border-border">
              <CardHeader className="pb-2 border-b border-border">
                <CardTitle className="text-lg flex items-center gap-2 text-foreground">
                  <div className="bg-purple-500/20 p-1.5 rounded-md">
                    <Settings className="h-5 w-5 text-purple-400" />
                  </div>
                  <span className="font-bold">Account Management</span>
                </CardTitle>
              </CardHeader>

              <CardContent className="p-6 space-y-6">
                <div className="rounded-lg bg-card p-5 border border-border">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-green-500/30 flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-green-500 text-foreground flex items-center justify-center font-bold text-lg">
                        JD
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">John Doe</h3>
                      <p className="text-foreground">Connected with Spotify Premium</p>
                    </div>
                  </div>
                </div>

                {/* Delete Account */}
                <div className="border-t border-border pt-5">
                  <h3 className="text-foreground text-lg font-normal mb-3">Danger Zone</h3>

                  {showDeleteConfirm ? (
                    <div className="p-4 rounded-lg bg-red-900/30 border border-red-800 space-y-3">
                      <div className="flex items-center gap-2 text-foreground">
                        <AlertTriangle className="h-5 w-5 text-red-400" />
                        <span className="font-medium">Are you sure you want to delete your account?</span>
                      </div>
                      <p className="text-foreground">
                        This action cannot be undone. All your data will be permanently removed.
                      </p>
                      <div className="flex justify-end gap-3 pt-2">
                        <Button
                          className="bg-secondary hover:bg-secondary/80 text-secondary-foreground border-0"
                          onClick={() => setShowDeleteConfirm(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          className="bg-destructive hover:bg-destructive/90 text-destructive-foreground border-0"
                          onClick={handleDeleteAccount}
                        >
                          Confirm Delete
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      className="border border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive w-full justify-between bg-transparent"
                      onClick={() => setShowDeleteConfirm(true)}
                    >
                      <span className="flex items-center gap-2">
                        <Trash2 className="h-4 w-4" />
                        Delete Account
                      </span>
                      <span>→</span>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default SettingsTab;