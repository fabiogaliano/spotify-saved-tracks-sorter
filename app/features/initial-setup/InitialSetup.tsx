import { useState, useRef } from 'react';
import { useFetcher } from '@remix-run/react';
// shared ui
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '~/shared/components/ui/Card';
import { Button } from '~/shared/components/ui/button';
import { Label } from '~/shared/components/ui/label';
import { Slider } from '~/shared/components/ui/slider';
import { Music, PlayCircle, Sliders } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/shared/components/ui/tabs';
// components
import { ApiKeyManager, type ApiKeyManagerHandle } from '~/components/ApiKeys/ApiKeyManager';
import { SpotifySignOut } from '~/components/SpotifySignOut';
// store + model
import { LibrarySyncMode } from '~/lib/models/User';

// Define tab steps for better maintainability
type SetupStep = 'welcome' | 'api' | 'preferences';
const SETUP_STEPS: SetupStep[] = ['welcome', 'api', 'preferences'];

// Type definition for our form data
type SetupFormData = {
  userId?: number;
  batchSize: number;
  syncMode: LibrarySyncMode;
};

interface InitialSetupProps {
  userId?: number;
}

const InitialSetup = ({ userId }: InitialSetupProps) => {
  // Setup state
  const [activeStep, setActiveStep] = useState<SetupStep>('welcome');
  const [formData, setFormData] = useState<SetupFormData>({
    userId,
    batchSize: 10,
    syncMode: 'automatic'
  });

  const fetcher = useFetcher();
  const apiKeyManagerRef = useRef<ApiKeyManagerHandle>(null);

  // Navigation helpers
  const goToNextStep = () => {
    const currentIndex = SETUP_STEPS.indexOf(activeStep);
    const nextStep = SETUP_STEPS[currentIndex + 1];
    if (nextStep) setActiveStep(nextStep);
  };

  const goToPrevStep = () => {
    const currentIndex = SETUP_STEPS.indexOf(activeStep);
    const prevStep = SETUP_STEPS[currentIndex - 1];
    if (prevStep) setActiveStep(prevStep);
  };

  // Form data handlers
  const updateFormData = (updates: Partial<SetupFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  // Action handlers
  const handleContinue = async () => {
    switch (activeStep) {
      case 'welcome':
        goToNextStep();
        break;

      case 'api':
        if (apiKeyManagerRef.current?.hasApiKey()) {
          const success = await apiKeyManagerRef.current.handleSaveApiKey();
          if (success) {
            setTimeout(() => {
              goToNextStep();
            }, 1500);
          }
        } else {
          goToNextStep();
        }
        break;

      case 'preferences':
        if (!userId) return;

        fetcher.submit(
          {
            ...formData,
            userId
          },
          { method: 'post', action: '/initial-setup' }
        );
        break;
    }
  };

  // Show if we're in a loading state
  const isSubmitting = fetcher.state === 'submitting';

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-blue-900 to-black p-4">
      <SpotifySignOut className="absolute top-4 right-4" />
      <div className="w-full max-w-md">
        <Tabs value={activeStep} className="w-full">
          {/* Progress indicators */}
          <TabsList className="grid w-full grid-cols-3 mb-6">
            {SETUP_STEPS.map(step => (
              <TabsTrigger key={step} value={step} disabled>
                {step === 'welcome' ? 'Welcome' :
                  step === 'api' ? 'API Setup' : 'Preferences'}
              </TabsTrigger>
            ))}
          </TabsList>

          <Card className="w-full border-none shadow-lg">
            {/* Welcome Tab */}
            <TabsContent value="welcome" className="mt-0">
              <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                  <Music size={40} className="text-green-500" />
                </div>
                <CardTitle className="text-2xl">Welcome to sort.</CardTitle>
                <CardDescription>
                  Intelligent organization for your Spotify music library
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="rounded-lg bg-black/5 p-4">
                  <h3 className="font-medium mb-2 flex items-center gap-2">
                    <PlayCircle size={18} className="text-green-500" />
                    How it works
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    sort. analyzes your liked tracks and intelligently sorts them into the
                    playlists where they belong using advanced AI technology.
                  </p>
                </div>

                <div className="rounded-lg bg-black/5 p-4">
                  <h3 className="font-medium mb-2">Key Features</h3>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-green-500 mt-0.5">•</span>
                      <span>Deep song analysis including lyrics and annotations</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-500 mt-0.5">•</span>
                      <span>Intelligent matching based on playlist descriptions</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-500 mt-0.5">•</span>
                      <span>Full control over where your songs are sorted</span>
                    </li>
                  </ul>
                </div>
              </CardContent>
            </TabsContent>

            {/* API Key Tab */}
            <TabsContent value="api" className="mt-0">
              <CardHeader>
                <CardTitle className="text-xl">Connect an AI Provider</CardTitle>
              </CardHeader>

              <CardContent className="space-y-4 mt-4">
                <ApiKeyManager
                  ref={apiKeyManagerRef}
                  onSaveSuccess={() => {
                    setTimeout(() => {
                      goToNextStep();
                    }, 1500);
                  }}
                  autoSetActive={true}
                />

                <div className="rounded-lg bg-blue-50 dark:bg-blue-950 p-4">
                  <h3 className="font-medium mb-2 text-sm">Why do I need an API key?</h3>
                  <p className="text-xs text-muted-foreground">
                    sort. uses AI to analyze your music's lyrics, mood, and themes.
                  </p>

                  <ul className="list-disc pl-4 text-xs text-muted-foreground mt-2">
                    <li>
                      google offers it as a free tier — use the app without paying! register at <a href="https://aistudio.google.com/welcome" target="_blank" rel="noopener noreferrer">Google AI Studio</a>
                    </li>
                    <li>
                      song analyses are collaborative — if someone already analyzed your track the app won't use your credits
                    </li>
                    <li>
                      no mark up on the cost - you only pay for what you use
                    </li>
                  </ul>
                </div>
              </CardContent>
            </TabsContent>

            {/* Preferences Tab */}
            <TabsContent value="preferences" className="mt-0">
              <CardHeader>
                <div className="flex justify-center mb-4">
                  <Sliders size={40} className="text-purple-500" />
                </div>
                <CardTitle className="text-xl">Set Your Preferences</CardTitle>
              </CardHeader>

              <CardContent className="space-y-6 mt-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label htmlFor="batchSize">Batch Size: {formData.batchSize} songs</Label>
                    <span className="text-xs text-muted-foreground">
                      {formData.batchSize <= 5 ? 'Low' : formData.batchSize >= 15 ? 'High' : 'Recommended'}
                    </span>
                  </div>
                  <Slider
                    id="batchSize"
                    min={1}
                    max={20}
                    step={5}
                    value={[formData.batchSize]}
                    onValueChange={(value) => {
                      const newValue = value[0] === 1 ? 1 : Math.round(value[0] / 5) * 5;
                      updateFormData({ batchSize: newValue });
                    }}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Controls how many songs are analyzed at once.
                    Larger batches are faster but use more AI credits.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="autoSync">Library Sync</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant={formData.syncMode === 'manual' ? 'default' : 'outline'}
                      className="justify-start"
                      onClick={() => updateFormData({ syncMode: 'manual' })}
                    >
                      Manual
                    </Button>
                    <Button
                      variant={formData.syncMode === 'automatic' ? 'default' : 'outline'}
                      className="justify-start"
                      onClick={() => updateFormData({ syncMode: 'automatic' })}
                    >
                      Automatic
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Choose whether to sync your Spotify library automatically when you login.
                  </p>
                </div>

                <div className="rounded-lg bg-purple-50 dark:bg-purple-950 p-4">
                  <h3 className="font-medium mb-2 text-sm">You're almost ready!</h3>
                  <p className="text-xs text-muted-foreground">
                    After this step, we'll sync your Spotify library and you can start organizing
                    your music. You can always change these preferences later.
                  </p>
                </div>
              </CardContent>
            </TabsContent>

            <CardFooter className="flex justify-between pt-6">
              {activeStep !== 'welcome' && (
                <Button
                  variant="outline"
                  onClick={goToPrevStep}
                  disabled={isSubmitting}
                >
                  Back
                </Button>
              )}
              <div className={activeStep === 'welcome' ? 'w-full' : ''}>
                <Button
                  className={activeStep === 'welcome' ? 'w-full' : ''}
                  onClick={handleContinue}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Processing...' :
                    activeStep === 'preferences' ? 'Finish Setup' : 'Continue'}
                </Button>
              </div>
            </CardFooter>
          </Card>
        </Tabs>
      </div>
    </div>
  );
};

export default InitialSetup;