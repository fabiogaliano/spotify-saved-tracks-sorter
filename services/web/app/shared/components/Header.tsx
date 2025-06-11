import { Avatar, AvatarFallback, AvatarImage } from '~/shared/components/ui/avatar';
import { SpotifySignOut } from '~/components/SpotifySignOut';
import { Link } from 'react-router';
import { Button } from './ui/button';
import { Beaker } from 'lucide-react';
import { ThemeToggleButton } from '~/components/theme-toggle-button';

interface HeaderProps {
  userName: string;
  image: string;
}

export const Header = ({ userName, image }: HeaderProps) => {
  return (
    <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 md:gap-6">
      {/* Nav */}
      <div className="text-2xl md:text-3xl font-bold bg-gradient-brand">
        Sorted.
      </div>
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Your Music Dashboard</h1>
        <p className="text-muted-foreground">Organize your Spotify library intelligently</p>
      </div>

      <div className="flex items-center gap-3 md:gap-4 flex-wrap">
        <span className="text-sm md:text-base">{userName}</span>
        <Avatar>
          <AvatarImage src={image} />
          <AvatarFallback className="text-muted-foreground/50">{userName[0] + userName[1]}</AvatarFallback>
        </Avatar>
        
        <ThemeToggleButton />
        <SpotifySignOut />
        {process.env.NODE_ENV !== 'production' && (
          <Link to="/test-services">
            <Button
              variant="default"
              size="sm"
              className="bg-green-700 border-green-600 text-foreground hover:bg-green-600 hover:border-green-500 transition-colors gap-2"
            >
              <Beaker className="h-4 w-4" /> Test Services
            </Button>
          </Link>
        )}
      </div>
    </header>
  );
};
