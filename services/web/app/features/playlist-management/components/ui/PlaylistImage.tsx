import React from 'react'

import { Music } from 'lucide-react'

import { Skeleton } from '~/shared/components/ui/skeleton'

import { usePlaylistImage } from '../../queries/playlist-image-queries'
import { getColorClasses } from '../../utils/colors'

interface PlaylistImageProps {
	spotifyPlaylistId: string
	playlistName: string
	color: string
	size?: 'sm' | 'md' | 'lg'
}

export const PlaylistImage: React.FC<PlaylistImageProps> = ({
	spotifyPlaylistId,
	playlistName,
	color,
	size = 'md',
}) => {
	const { data: imageUrl, isLoading } = usePlaylistImage(spotifyPlaylistId)

	const sizes = {
		sm: { outer: 'w-6 h-6', inner: 'w-4 h-4', icon: 'w-3 h-3' },
		md: { outer: 'w-10 h-10', inner: 'w-7 h-7', icon: 'w-5 h-5' },
		lg: { outer: 'w-32 h-32', inner: 'w-24 h-24', icon: 'w-12 h-12' },
	}

	const { outer, inner, icon } = sizes[size]
	const colors = getColorClasses(color)

	// Show skeleton while loading (only on first load, React Query handles caching)
	if (isLoading) {
		return <Skeleton className={`${outer} rounded-md`} />
	}

	// Show image if available
	if (imageUrl) {
		return (
			<div
				className={`${outer} overflow-hidden rounded-md transition-all duration-200 hover:scale-105 hover:shadow-lg`}
			>
				<img
					src={imageUrl}
					alt={playlistName}
					className="h-full w-full object-cover"
					loading="lazy"
				/>
			</div>
		)
	}

	// Fallback to colored placeholder
	return (
		<div
			className={`${outer} ${colors.bg} flex items-center justify-center overflow-hidden rounded-md transition-all duration-200 hover:scale-105 hover:shadow-sm`}
		>
			{size === 'lg' ?
				<Music className={`${icon} ${colors.text} opacity-50`} />
			:	<div
					className={`${inner} ${colors.inner} rounded-sm transition-all duration-200`}
				></div>
			}
		</div>
	)
}
