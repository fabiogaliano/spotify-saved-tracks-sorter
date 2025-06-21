import React from 'react';
import { Music } from 'lucide-react';
import { getColorClasses } from '../../utils/colors';
import { usePlaylistImage } from '../../queries/playlist-image-queries';
import { Skeleton } from '~/shared/components/ui/skeleton';

interface PlaylistImageProps {
  spotifyPlaylistId: string;
  playlistName: string;
  color: string;
  size?: 'sm' | 'md' | 'lg';
}

export const PlaylistImage: React.FC<PlaylistImageProps> = ({ 
  spotifyPlaylistId, 
  playlistName,
  color, 
  size = 'md' 
}) => {
  const { data: imageUrl, isLoading } = usePlaylistImage(spotifyPlaylistId);

  const sizes = {
    sm: { outer: 'w-6 h-6', inner: 'w-4 h-4', icon: 'w-3 h-3' },
    md: { outer: 'w-10 h-10', inner: 'w-7 h-7', icon: 'w-5 h-5' },
    lg: { outer: 'w-32 h-32', inner: 'w-24 h-24', icon: 'w-12 h-12' }
  };

  const { outer, inner, icon } = sizes[size];
  const colors = getColorClasses(color);

  // Show skeleton while loading (only on first load, React Query handles caching)
  if (isLoading) {
    return <Skeleton className={`${outer} rounded-md`} />;
  }

  // Show image if available
  if (imageUrl) {
    return (
      <div className={`${outer} rounded-md overflow-hidden transition-all duration-200 hover:scale-105 hover:shadow-lg`}>
        <img 
          src={imageUrl} 
          alt={playlistName}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>
    );
  }

  // Fallback to colored placeholder
  return (
    <div className={`${outer} ${colors.bg} rounded-md flex items-center justify-center transition-all duration-200 hover:scale-105 hover:shadow-sm overflow-hidden`}>
      {size === 'lg' ? (
        <Music className={`${icon} ${colors.text} opacity-50`} />
      ) : (
        <div className={`${inner} ${colors.inner} rounded-sm transition-all duration-200`}></div>
      )}
    </div>
  );
};