import { useState } from 'react';
import { useTheme } from 'next-themes';
import { Button } from '~/shared/components/ui/button';
import { Label } from '~/shared/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/shared/components/ui/tabs';
import { ThemedCard } from '~/shared/components/ui/themed-cards';

type ColorSample = {
  name: string;
  variable: string;
  description: string;
};

const colorSamples: ColorSample[] = [
  { name: 'Background', variable: '--background', description: 'Main background color' },
  { name: 'Foreground', variable: '--foreground', description: 'Main text color' },
  { name: 'Primary', variable: '--primary', description: 'Primary action color' },
  { name: 'Secondary', variable: '--secondary', description: 'Secondary UI elements' },
  { name: 'Accent', variable: '--accent', description: 'Accent elements' },
  { name: 'Muted', variable: '--muted', description: 'Muted backgrounds' },
  { name: 'Card', variable: '--card', description: 'Card backgrounds' },
];

const gradientSamples = [
  { name: 'Main Gradient', className: 'bg-theme-gradient' },
  { name: 'Brand Text', className: 'bg-gradient-brand' },
  { name: 'Card Primary', className: 'bg-card-primary' },
  { name: 'Card Secondary', className: 'bg-card-secondary' },
  { name: 'Card Accent', className: 'bg-card-accent' },
];

export function ThemeCustomizer() {
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('colors');

  return (
    <ThemedCard>
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-4">Theme Customization</h2>
        <p className="text-muted-foreground mb-6">
          Customize the appearance of your application by selecting a theme or viewing color samples.
        </p>

        <div className="flex flex-wrap gap-2 mb-6">
          <Button
            variant={theme === 'light' ? 'default' : 'outline'}
            onClick={() => setTheme('light')}
            className="flex-1"
          >
            Light
          </Button>
          <Button
            variant={theme === 'dark' ? 'default' : 'outline'}
            onClick={() => setTheme('dark')}
            className="flex-1"
          >
            Dark
          </Button>
          <Button
            variant={theme === 'system' ? 'default' : 'outline'}
            onClick={() => setTheme('system')}
            className="flex-1"
          >
            System
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="colors">Colors</TabsTrigger>
            <TabsTrigger value="gradients">Gradients</TabsTrigger>
          </TabsList>

          <TabsContent value="colors" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {colorSamples.map((sample) => (
                <div key={sample.variable} className="flex flex-col space-y-1.5">
                  <Label>{sample.name}</Label>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded-full border border-border"
                      style={{ backgroundColor: `var(${sample.variable})` }}
                    />
                    <span className="text-sm text-muted-foreground">{sample.description}</span>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="gradients" className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              {gradientSamples.map((sample) => (
                <div key={sample.name} className="flex flex-col space-y-1.5">
                  <Label>{sample.name}</Label>
                  <div className={`h-12 rounded-md ${sample.className}`} />
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </ThemedCard>
  );
}
