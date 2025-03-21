import { Avatar, AvatarFallback, AvatarImage } from '~/shared/components/ui/avatar';
import { SpotifySignOut } from '~/components/SpotifySignOut';

interface HeaderProps {
  userName: string;
  image: string;
}

export const Header = ({ userName, image }: HeaderProps) => {
  return (
    <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
      {/* Nav */}
      <div className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-blue-500">
        Sorted.
      </div>
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Your Music Dashboard</h1>
        <p className="text-gray-300">Organize your Spotify library intelligently</p>
      </div>

      <div className="flex items-center gap-2">
        {userName}
        <Avatar>
          <AvatarImage src={image} />
          <AvatarFallback className="text-gray-700">{userName[0] + userName[1]}</AvatarFallback>
        </Avatar>

        <SpotifySignOut />
      </div>
    </header>
  );
};
