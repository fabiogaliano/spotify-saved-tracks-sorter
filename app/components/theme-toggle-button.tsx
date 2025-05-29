import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Button } from '~/shared/components/ui/button';
import { Moon, Sun } from 'lucide-react';

export function ThemeToggleButton() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // useEffect only runs on the client, so we can safely show the UI
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // return a placeholder or null to avoid hydration mismatch
    return <Button variant="outline" size="icon" disabled className="w-9 h-9">&nbsp;</Button>;
  }

  const currentTheme = theme === 'system' ? resolvedTheme : theme;

  const toggleTheme = () => {
    setTheme(currentTheme === 'dark' ? 'light' : 'dark');
  };

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={toggleTheme}
      aria-label={currentTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      className="w-9 h-9 bg-background border-border hover:bg-muted transition-colors"
    >
      {currentTheme === 'dark' ? (
        <Sun className="h-[1.2rem] w-[1.2rem] text-foreground" />
      ) : (
        <Moon className="h-[1.2rem] w-[1.2rem] text-foreground" />
      )}
    </Button>
  );
}
