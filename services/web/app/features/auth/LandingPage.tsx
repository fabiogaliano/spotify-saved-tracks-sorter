import React from 'react'

import type { MetaFunction } from 'react-router'
import { Form, Link, useNavigation } from 'react-router'

import { ThemeToggleButton } from '~/components/theme-toggle-button'
import { LoadingSpinner } from '~/shared/components/ui/LoadingSpinner'

// Type definitions for improved type safety
type PlaylistItemProps = {
	name: string
	isActive?: boolean
}

type MatchedSongProps = {
	title: string
	artist: string
	matchPercentage: number
	imageUrl: string
	matchedPlaylists: string[]
}

type FeatureCardProps = {
	title: string
	description: string
	icon: React.ReactNode
	bgColorClass: string
	iconColorClass: string
}

type StepCardProps = {
	number: number
	title: string
	description: string
	colorClass: string
}

// Playlist card component for better composition
const PlaylistItem: React.FC<PlaylistItemProps> = ({ name, isActive = false }) => (
	<div
		className={`p-4 ${isActive ? 'border-indigo-500 bg-indigo-900/50' : 'bg-card/70 border-border'} cursor-pointer rounded-md border transition-all hover:bg-indigo-900/30`}
	>
		<div className="flex items-center">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				className={`mr-2 h-4 w-4 ${isActive ? 'text-indigo-400' : 'text-muted-foreground/70'}`}
				viewBox="0 0 20 20"
				fill="currentColor"
			>
				<path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
			</svg>
			<p
				className={`${isActive ? 'text-foreground' : 'text-muted-foreground'} text-base font-medium`}
			>
				{name}
			</p>
		</div>
	</div>
)

// Matched song component for better composition
const MatchedSong: React.FC<MatchedSongProps> = ({
	title,
	artist,
	matchPercentage,
	imageUrl,
	matchedPlaylists,
}) => (
	<div className="bg-card bg-opacity-70 hover:bg-opacity-80 border-border hover:border-border rounded-md border p-5 transition-all">
		<div className="mb-2 flex items-center justify-between">
			<div className="flex items-center gap-3">
				<div className="bg-secondary bg-opacity-30 h-10 w-10 overflow-hidden rounded-md">
					<img
						src={imageUrl}
						alt="Icon"
						className="h-full w-full object-cover"
						data-img-id=""
					/>
				</div>
				<div>
					<p className="text-foreground text-base font-medium">{title}</p>
					<p className="text-muted-foreground text-sm">{artist}</p>
				</div>
			</div>
			<div
				className={`text-foreground px-3 py-1.5 text-sm font-medium ${matchPercentage > 90 ? 'bg-green-500' : 'bg-blue-500'} bg-opacity-80 rounded-full`}
			>
				{matchPercentage}% match
			</div>
		</div>
		<div className="mt-4 flex items-center justify-between text-sm">
			<p className="text-muted-foreground flex items-center">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					className="mr-1 h-3 w-3 text-indigo-400"
					viewBox="0 0 20 20"
					fill="currentColor"
				>
					<path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
				</svg>
				Matches: {matchedPlaylists.join(', ')}
			</p>
			<button className="hover:text-foreground rounded-md px-4 py-1.5 text-sm font-medium text-indigo-300 transition-all hover:bg-indigo-500/30">
				Sort
			</button>
		</div>
	</div>
)

// App mockup component
const AppInterface: React.FC = () => {
	// Sample data - in a real app this would come from state
	const playlists = [
		{ name: 'Chill Vibes', isActive: true },
		{ name: 'Morning Energy' },
		{ name: 'Late Night Feels' },
		{ name: 'Workout Mix' },
		{ name: 'Focus' },
	]

	const matchedSongs = [
		{
			title: 'Redbone',
			artist: 'Childish Gambino',
			matchPercentage: 98,
			imageUrl:
				'https://upload.wikimedia.org/wikipedia/en/1/10/Childish_Gambino_-_Awaken%2C_My_Love%21.png',
			matchedPlaylists: ['Chill Vibes', 'Late Night Feels'],
		},
		{
			title: 'Blinding Lights',
			artist: 'The Weeknd',
			matchPercentage: 95,
			imageUrl:
				'https://upload.wikimedia.org/wikipedia/en/e/e6/The_Weeknd_-_Blinding_Lights.png',
			matchedPlaylists: ['Morning Energy', 'Workout Mix'],
		},
		{
			title: 'Heat Waves',
			artist: 'Glass Animals',
			matchPercentage: 89,
			imageUrl:
				'https://upload.wikimedia.org/wikipedia/en/b/b0/Glass_Animals_-_Heat_Waves.png',
			matchedPlaylists: ['Late Night Feels'],
		},
	]

	const mobilePlaylistIndexes = [0]
	const mobileSongIndexes = [0, 1]

	return (
		<div className="bg-card border-border hover:border-border mx-auto w-full max-w-4xl transform overflow-hidden rounded-xl border shadow-2xl transition-all duration-300 hover:shadow-indigo-500/20">
			{/* Window Controls - Only visible on desktop */}
			<div className="border-border bg-muted/50 hidden items-center space-x-2 border-b px-4 py-2 lg:flex">
				<div className="h-3 w-3 rounded-full bg-red-500"></div>
				<div className="h-3 w-3 rounded-full bg-yellow-500"></div>
				<div className="h-3 w-3 rounded-full bg-green-500"></div>
				<div className="text-muted-foreground/70 ml-auto font-mono text-xs">
					SpotifySort v1.0
				</div>
			</div>

			{/* App Content - Desktop Version */}
			<div className="hidden lg:flex lg:flex-row">
				{/* Playlists Column - Desktop */}
				<div className="border-border bg-muted/30 w-1/3 border-r p-5">
					<h2 className="text-muted-foreground mb-4 flex items-center font-medium">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className="mr-2 h-4 w-4 text-indigo-400"
							viewBox="0 0 20 20"
							fill="currentColor"
						>
							<path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
						</svg>
						Your Playlists
					</h2>
					<div className="space-y-3">
						{playlists.map((playlist, index) => (
							<PlaylistItem
								key={index}
								name={playlist.name}
								isActive={playlist.isActive}
							/>
						))}
						<div className="pt-2">
							<button className="text-muted-foreground border-border flex w-full items-center justify-center rounded-md border p-2 text-sm transition-all hover:border-indigo-500 hover:text-indigo-400">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									className="mr-1 h-4 w-4"
									viewBox="0 0 20 20"
									fill="currentColor"
								>
									<path
										fillRule="evenodd"
										d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
										clipRule="evenodd"
									/>
								</svg>
								Add Playlist
							</button>
						</div>
					</div>
				</div>

				{/* Analysis Column - Desktop */}
				<div className="bg-muted/20 w-2/3 p-5">
					<h2 className="text-muted-foreground mb-4 flex items-center font-medium">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className="mr-2 h-4 w-4 text-indigo-400"
							viewBox="0 0 20 20"
							fill="currentColor"
						>
							<path
								fillRule="evenodd"
								d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 0l-2 2a1 1 0 101.414 1.414L8 10.414l1.293 1.293a1 1 0 001.414 0l4-4z"
								clipRule="evenodd"
							/>
						</svg>
						Your Liked Songs Analysis
					</h2>
					<div className="space-y-3">
						{matchedSongs.map((song, index) => (
							<MatchedSong
								key={index}
								title={song.title}
								artist={song.artist}
								matchPercentage={song.matchPercentage}
								imageUrl={song.imageUrl}
								matchedPlaylists={song.matchedPlaylists}
							/>
						))}
						<div className="pt-2 text-right">
							<button className="text-foreground rounded-md bg-indigo-600 px-4 py-2 text-sm shadow-md transition-colors hover:bg-indigo-700 hover:shadow-indigo-500/50">
								Analyze More Songs
							</button>
						</div>
					</div>
				</div>
			</div>

			{/* App Content - Mobile Version */}
			<div className="flex flex-col lg:hidden">
				{/* Mobile App Header */}
				<div className="bg-muted/40 w-full px-6 py-5">
					<h2 className="text-foreground mb-2 text-2xl font-medium">SpotifySort</h2>
					<p className="text-muted-foreground text-base">
						Organize your music intelligently
					</p>
				</div>

				{/* Playlists Column - Mobile */}
				<div className="border-border w-full border-b px-6 py-6">
					<h2 className="text-foreground mb-4 flex items-center text-xl font-medium">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className="mr-3 h-6 w-6 text-indigo-400"
							viewBox="0 0 20 20"
							fill="currentColor"
						>
							<path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
						</svg>
						Your Playlists
					</h2>
					<div className="space-y-4">
						{mobilePlaylistIndexes.map(playlistIndex => {
							const playlist = playlists[playlistIndex]
							return (
								<div
									key={playlistIndex}
									className={`p-5 ${playlist.isActive ? 'border-indigo-500 bg-indigo-900/50' : 'bg-card/70 border-border'} rounded-lg border-2 transition-all`}
								>
									<div className="flex items-center">
										<svg
											xmlns="http://www.w3.org/2000/svg"
											className={`mr-3 h-7 w-7 ${playlist.isActive ? 'text-indigo-400' : 'text-muted-foreground/70'}`}
											viewBox="0 0 20 20"
											fill="currentColor"
										>
											<path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
										</svg>
										<p
											className={`${playlist.isActive ? 'text-foreground' : 'text-muted-foreground'} text-lg font-medium`}
										>
											{playlist.name}
										</p>
									</div>
								</div>
							)
						})}
						<div className="text-muted-foreground flex items-center py-3 text-base">
							<span className="mr-2">+4 more playlists</span>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								className="h-5 w-5"
								viewBox="0 0 20 20"
								fill="currentColor"
							>
								<path
									fillRule="evenodd"
									d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
									clipRule="evenodd"
								/>
							</svg>
						</div>
					</div>
				</div>

				{/* Analysis Column - Mobile */}
				<div className="bg-muted/20 w-full px-6 py-6">
					<h2 className="text-foreground mb-4 flex items-center text-xl font-medium">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className="mr-3 h-6 w-6 text-indigo-400"
							viewBox="0 0 20 20"
							fill="currentColor"
						>
							<path
								fillRule="evenodd"
								d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 0l-2 2a1 1 0 101.414 1.414L8 10.414l1.293 1.293a1 1 0 001.414 0l4-4z"
								clipRule="evenodd"
							/>
						</svg>
						Your Liked Songs Analysis
					</h2>
					<div className="space-y-5">
						{mobileSongIndexes.map(songIndex => {
							const song = matchedSongs[songIndex]
							return (
								<div
									key={songIndex}
									className="bg-card bg-opacity-70 border-border hover:border-border rounded-lg border-2 p-5"
								>
									<div className="mb-3 flex items-center justify-between">
										<div className="flex items-center gap-4">
											<div className="bg-secondary bg-opacity-30 h-16 w-16 overflow-hidden rounded-lg">
												<img
													src={song.imageUrl}
													alt="Icon"
													className="h-full w-full object-cover"
												/>
											</div>
											<div>
												<p className="text-foreground text-lg font-medium">
													{song.title}
												</p>
												<p className="text-muted-foreground text-base">{song.artist}</p>
											</div>
										</div>
										<div
											className={`text-foreground px-4 py-2 text-sm font-medium ${song.matchPercentage > 90 ? 'bg-green-500' : 'bg-blue-500'} bg-opacity-90 rounded-full`}
										>
											{song.matchPercentage}% match
										</div>
									</div>
									<div className="mt-4 flex items-center justify-between text-base">
										<p className="text-muted-foreground flex items-center">
											<svg
												xmlns="http://www.w3.org/2000/svg"
												className="mr-2 h-5 w-5 text-indigo-400"
												viewBox="0 0 20 20"
												fill="currentColor"
											>
												<path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
											</svg>
											Matches: {song.matchedPlaylists.join(', ')}
										</p>
										<button className="text-foreground rounded-md bg-indigo-600 px-5 py-2 text-base font-medium transition-all hover:bg-indigo-700">
											Sort
										</button>
									</div>
								</div>
							)
						})}
						<div className="text-muted-foreground flex items-center py-3 text-base">
							<span className="mr-2">+1 more song</span>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								className="h-5 w-5"
								viewBox="0 0 20 20"
								fill="currentColor"
							>
								<path
									fillRule="evenodd"
									d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
									clipRule="evenodd"
								/>
							</svg>
						</div>
						<div className="pt-3">
							<button className="text-foreground w-full rounded-lg bg-indigo-600 py-4 text-lg font-medium shadow-md transition-colors hover:bg-indigo-700 hover:shadow-indigo-500/50">
								Analyze More Songs
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}

// Feature card component
const FeatureCard: React.FC<FeatureCardProps> = ({
	title,
	description,
	icon,
	bgColorClass,
	iconColorClass,
}) => (
	<div className="bg-card border-border hover:border-border rounded-lg border p-8 shadow-sm transition-all">
		<div className="mb-5 flex items-center">
			<div
				className={`h-12 w-12 rounded-full ${bgColorClass} mr-4 flex items-center justify-center`}
			>
				<div className={iconColorClass}>{icon}</div>
			</div>
			<h3 className="text-foreground text-2xl font-medium">{title}</h3>
		</div>
		<p className="text-muted-foreground text-lg leading-relaxed">{description}</p>
	</div>
)

// Mobile Carousel component
const MobileCarousel: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const [activeIndex, setActiveIndex] = React.useState(0)
	const scrollContainerRef = React.useRef<HTMLDivElement>(null)
	const childrenArray = React.Children.toArray(children)

	// Handle scroll events to update active indicator
	React.useEffect(() => {
		const scrollContainer = scrollContainerRef.current
		if (!scrollContainer) return

		const handleScroll = () => {
			if (!scrollContainer) return

			const scrollPosition = scrollContainer.scrollLeft
			const containerWidth = scrollContainer.clientWidth
			const itemWidth = containerWidth * 0.75 + 16 // 75% width + 16px padding-right
			const newIndex = Math.round(scrollPosition / itemWidth)

			if (newIndex !== activeIndex && newIndex >= 0 && newIndex < childrenArray.length) {
				setActiveIndex(newIndex)
			}
		}

		scrollContainer.addEventListener('scroll', handleScroll)
		return () => scrollContainer.removeEventListener('scroll', handleScroll)
	}, [activeIndex, childrenArray.length])

	return (
		<div className="relative w-full overflow-hidden">
			{/* Carousel content */}
			<div
				ref={scrollContainerRef}
				className="flex touch-pan-x snap-x snap-mandatory overflow-x-auto scroll-smooth"
				style={{
					WebkitOverflowScrolling: 'touch',
					scrollbarWidth: 'none',
					msOverflowStyle: 'none',
				}}
			>
				<div className="flex h-[350px]">
					{childrenArray.map((child, index) => (
						<div
							key={index}
							className="h-full w-[75%] flex-shrink-0 snap-start pr-4"
							style={{ scrollSnapAlign: 'start' }}
						>
							<div
								className="h-full transition-opacity duration-300"
								style={{ opacity: activeIndex === index ? 1 : 0.4 }}
							>
								{child}
							</div>
						</div>
					))}
				</div>
			</div>

			{/* Indicators */}
			<div className="mt-6 flex justify-center space-x-2">
				{childrenArray.map((_, index) => (
					<button
						key={index}
						onClick={() => {
							const scrollContainer = scrollContainerRef.current
							if (scrollContainer) {
								const containerWidth = scrollContainer.clientWidth
								const itemWidth = containerWidth * 0.75 + 16 // 75% width + 16px padding-right
								scrollContainer.scrollTo({
									left: index * itemWidth,
									behavior: 'smooth',
								})
								setActiveIndex(index)
							}
						}}
						className={`h-2 w-2 rounded-full transition-colors ${
							index === activeIndex ? 'bg-white' : 'bg-secondary'
						}`}
						aria-label={`Go to slide ${index + 1}`}
					/>
				))}
			</div>
		</div>
	)
}

// Enhanced step card component with animations
const StepCard: React.FC<StepCardProps & { isActive?: boolean; delay?: number }> = ({
	number,
	title,
	description,
	colorClass,
	isActive = false,
	delay = 0,
}) => {
	const [isHovered, setIsHovered] = React.useState(false)
	const [isVisible, setIsVisible] = React.useState(false)
	const cardRef = React.useRef<HTMLDivElement>(null)

	// Intersection observer for scroll animations
	React.useEffect(() => {
		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting) {
					setTimeout(() => setIsVisible(true), delay)
				}
			},
			{ threshold: 0.1 }
		)

		if (cardRef.current) {
			observer.observe(cardRef.current)
		}

		return () => observer.disconnect()
	}, [delay])

	return (
		<div
			ref={cardRef}
			onMouseEnter={() => setIsHovered(true)}
			onMouseLeave={() => setIsHovered(false)}
			className={`bg-background/30 border-border relative flex h-full transform flex-col items-center rounded-lg border p-8 text-center backdrop-blur-sm transition-all duration-500 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'} ${isHovered ? 'border-primary/50 scale-105 shadow-xl' : 'scale-100'} ${isActive ? 'ring-primary ring-offset-background ring-2 ring-offset-2' : ''} `}
		>
			{/* Animated background gradient */}
			<div
				className={`absolute inset-0 rounded-lg ${colorClass} opacity-10 transition-opacity duration-300 ${isHovered ? 'opacity-20' : ''}`}
			/>

			{/* Number circle with pulse animation */}
			<div className="relative mb-5 flex-shrink-0">
				<div
					className={`h-20 w-20 rounded-full ${colorClass} relative z-10 flex items-center justify-center transition-transform duration-300 ${isHovered ? 'scale-110' : ''}`}
				>
					<div
						className={`text-${colorClass.replace('bg-', '').replace('/20', '')} text-3xl font-bold`}
					>
						{number}
					</div>
				</div>
				{/* Pulse effect */}
				<div
					className={`absolute inset-0 h-20 w-20 rounded-full ${colorClass} animate-ping opacity-30`}
				/>
			</div>

			{/* Title with underline animation */}
			<h3 className="relative mb-3 flex-shrink-0 text-2xl font-medium">
				{title}
				<div
					className={`via-primary absolute right-0 bottom-0 left-0 h-0.5 transform bg-gradient-to-r from-transparent to-transparent transition-transform duration-300 ${isHovered ? 'scale-x-100' : 'scale-x-0'}`}
				/>
			</h3>

			{/* Description with fade effect */}
			<p
				className={`text-muted-foreground flex-grow text-lg leading-relaxed transition-all duration-300 ${isHovered ? 'text-foreground' : ''}`}
			>
				{description}
			</p>
		</div>
	)
}

// Main landing page component
const LandingPage: React.FC = () => {
	const navigation = useNavigation()
	const isLoggingIn =
		navigation.state === 'submitting' && navigation.formAction?.includes('/auth/spotify')

	// Define feature cards data
	const featureCards = [
		{
			title: 'Deep Lyrics Analysis',
			description:
				"We read between the lines to understand themes, moods, and contexts in your music. Our AI doesn't just look at genres - it analyzes lyrics, annotations, and musical characteristics.",
			icon: (
				<svg
					xmlns="http://www.w3.org/2000/svg"
					className="h-5 w-5"
					viewBox="0 0 20 20"
					fill="currentColor"
				>
					<path
						fillRule="evenodd"
						d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
						clipRule="evenodd"
					/>
				</svg>
			),
			bgColorClass: 'bg-pink-500/20',
			iconColorClass: 'text-pink-400',
		},
		{
			title: 'You Stay in Control',
			description:
				'Review and approve all suggestions before any changes are made to your Spotify library. You always have the final say on where your tracks end up.',
			icon: (
				<svg
					xmlns="http://www.w3.org/2000/svg"
					className="h-5 w-5"
					viewBox="0 0 20 20"
					fill="currentColor"
				>
					<path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
				</svg>
			),
			bgColorClass: 'bg-blue-500/20',
			iconColorClass: 'text-blue-400',
		},
		{
			title: 'Intelligent Matching',
			description:
				'Our algorithm reads your playlist descriptions to understand what vibe you\'re going for. Add "AI:" tags to your playlist descriptions so we know which playlists to consider.',
			icon: (
				<svg
					xmlns="http://www.w3.org/2000/svg"
					className="h-5 w-5"
					viewBox="0 0 20 20"
					fill="currentColor"
				>
					<path
						fillRule="evenodd"
						d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z"
						clipRule="evenodd"
					/>
				</svg>
			),
			bgColorClass: 'bg-green-500/20',
			iconColorClass: 'text-green-400',
		},
		{
			title: 'Batch Processing',
			description:
				'Process your entire library at once or focus on recent additions. Save hours of manual sorting with our AI that processes your collection in seconds.',
			icon: (
				<svg
					xmlns="http://www.w3.org/2000/svg"
					className="h-5 w-5"
					viewBox="0 0 20 20"
					fill="currentColor"
				>
					<path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
					<path
						fillRule="evenodd"
						d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
						clipRule="evenodd"
					/>
				</svg>
			),
			bgColorClass: 'bg-yellow-500/20',
			iconColorClass: 'text-yellow-400',
		},
	]

	// Define steps data
	const steps = [
		{
			number: 1,
			title: 'Connect Your Account',
			description:
				'Sign in with Spotify and grant access to your liked songs and playlists.',
			colorClass: 'bg-blue-500/20',
		},
		{
			number: 2,
			title: 'AI Analysis',
			description:
				'Our AI analyzes your songs and playlists to find the perfect matches based on lyrics, mood, and more.',
			colorClass: 'bg-green-500/20',
		},
		{
			number: 3,
			title: 'Review & Sort',
			description:
				'Approve the suggestions and watch as your music gets sorted into the perfect playlists.',
			colorClass: 'bg-purple-500/20',
		},
	]

	return (
		<div className="bg-theme-gradient text-foreground min-h-screen">
			{/* Nav */}
			<nav className="bg-background/50 border-border/50 sticky top-0 z-10 flex items-center justify-between border-b px-6 py-5 backdrop-blur-sm md:px-12">
				<div className="flex items-center">
					<div className="bg-gradient-brand text-2xl font-bold md:text-3xl">Sorted.</div>
				</div>
				<div className="flex items-center gap-4">
					<ThemeToggleButton />
					<Form action="/auth/spotify" method="post">
						<button
							type="submit"
							disabled={isLoggingIn}
							className="text-foreground relative inline-block rounded-full bg-green-500 px-6 py-3 text-center text-base font-medium transition-all hover:bg-green-400"
						>
							{isLoggingIn ?
								<>
									<span className="opacity-0">Log in with Spotify</span>
									<span className="absolute inset-0 flex items-center justify-center">
										<LoadingSpinner className="h-5 w-5" />
										<span className="ml-2">Connecting...</span>
									</span>
								</>
							:	'Log in with Spotify'}
						</button>
					</Form>
				</div>
			</nav>

			{/* Hero - Side by Side Layout */}
			<div className="container mx-auto px-6 py-12 md:px-12 md:py-24">
				<div className="flex flex-col items-center gap-12 lg:flex-row">
					<div className="order-2 space-y-6 lg:order-1 lg:w-1/2">
						<h1 className="text-5xl leading-tight font-bold md:text-6xl">
							From <span className="text-green-400">Likes</span> to Perfect Playlists
						</h1>
						<p className="text-muted-foreground text-xl leading-relaxed md:text-2xl">
							Automatically organize your Spotify liked songs into the perfect playlists.
							Let AI analyze lyrics, mood, and vibe to sort your music where it belongs.
						</p>
						<div className="space-y-4 pt-4">
							<Form action="/auth/spotify" method="post">
								<button
									type="submit"
									disabled={isLoggingIn}
									className="text-foreground relative inline-block w-full rounded-full bg-green-500 px-8 py-4 text-center text-xl font-medium transition-all hover:bg-green-400 md:w-auto"
								>
									{isLoggingIn ?
										<>
											<span className="opacity-0">Connect Your Spotify</span>
											<span className="absolute inset-0 flex items-center justify-center">
												<LoadingSpinner className="h-5 w-5" />
												<span className="ml-2">Connecting...</span>
											</span>
										</>
									:	'Connect Your Spotify'}
								</button>
							</Form>
							<p className="text-muted-foreground text-base md:text-lg">Free to use</p>
						</div>
					</div>
					<div className="relative order-1 lg:order-2 lg:w-1/2">
						{/* App mockup with enhanced glow */}
						<div className="relative z-10">
							<AppInterface />
						</div>
					</div>
				</div>
			</div>

			{/* How It Works */}
			<div className="py-20">
				<div className="container mx-auto px-6 md:px-12">
					<h2 className="mb-16 text-center text-4xl font-bold md:text-5xl">
						How Sorted Works
					</h2>

					{/* Desktop view with flow animation */}
					<div className="relative hidden md:block">
						<div className="relative grid grid-cols-3 gap-8">
							{/* Connecting flow lines */}
							<svg
								className="pointer-events-none absolute inset-0 h-full w-full"
								style={{ zIndex: 0 }}
							>
								<defs>
									<linearGradient id="flowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
										<stop offset="0%" stopColor="rgb(59, 130, 246)" stopOpacity="0.3" />
										<stop offset="50%" stopColor="rgb(139, 92, 246)" stopOpacity="0.5" />
										<stop offset="100%" stopColor="rgb(168, 85, 247)" stopOpacity="0.3" />
									</linearGradient>
								</defs>
								{/* Animated flow path */}
								<path
									d="M 16.66% 50% Q 33.33% 30%, 50% 50% T 83.33% 50%"
									fill="none"
									stroke="url(#flowGradient)"
									strokeWidth="3"
									strokeDasharray="8 4"
									className="animate-pulse"
									style={{
										animation: 'var(--animate-flow)',
									}}
								/>
							</svg>

							{steps.map((step, index) => (
								<div key={index} className="relative z-10">
									<StepCard
										number={step.number}
										title={step.title}
										description={step.description}
										colorClass={step.colorClass}
										delay={index * 200}
									/>
								</div>
							))}
						</div>
					</div>

					{/* Mobile and Tablet carousel */}
					<div className="block md:hidden">
						<MobileCarousel>
							{steps.map((step, index) => (
								<StepCard
									key={index}
									number={step.number}
									title={step.title}
									description={step.description}
									colorClass={step.colorClass}
									delay={0}
									isActive={false}
								/>
							))}
						</MobileCarousel>
					</div>
				</div>
			</div>

			{/* Features */}
			<div className="container mx-auto px-6 py-20 md:px-12">
				<h2 className="mb-16 text-center text-4xl font-bold md:text-5xl">
					Smart Features for Music Lovers
				</h2>

				{/* Desktop view */}
				<div className="xs:grid xs:grid-cols-2 hidden gap-8">
					{featureCards.map((feature, index) => (
						<FeatureCard
							key={index}
							title={feature.title}
							description={feature.description}
							icon={feature.icon}
							bgColorClass={feature.bgColorClass}
							iconColorClass={feature.iconColorClass}
						/>
					))}
				</div>

				{/* Mobile vertical stack */}
				<div className="xs:hidden block space-y-6">
					{featureCards.map((feature, index) => (
						<FeatureCard
							key={index}
							title={feature.title}
							description={feature.description}
							icon={feature.icon}
							bgColorClass={feature.bgColorClass}
							iconColorClass={feature.iconColorClass}
						/>
					))}
				</div>
			</div>

			{/* CTA */}
			<div className="container mx-auto px-6 py-24 text-center md:px-12">
				<div className="bg-background/30 border-border mx-auto max-w-3xl rounded-2xl border p-10 backdrop-blur-sm">
					<h2 className="mb-8 text-4xl leading-tight font-bold md:text-5xl">
						Ready to organize your{' '}
						<span className="bg-gradient-brand">musical chaos?</span>
					</h2>
					<p className="text-muted-foreground mx-auto mb-10 max-w-2xl text-xl md:text-2xl">
						Stop scrolling endlessly through your liked songs. Let Sorted turn your
						musical mess into perfectly organized playlists.
					</p>
					<Form action="/auth/spotify" method="post">
						<button
							type="submit"
							disabled={isLoggingIn}
							className="text-foreground relative inline-block w-full rounded-full bg-green-500 px-10 py-4 text-center text-xl font-medium transition-all hover:bg-green-400 md:w-auto"
						>
							{isLoggingIn ?
								<>
									<span className="opacity-0">Get Started Free</span>
									<span className="absolute inset-0 flex items-center justify-center">
										<LoadingSpinner className="h-5 w-5" />
										<span className="ml-2">Connecting...</span>
									</span>
								</>
							:	'Get Started Free'}
						</button>
					</Form>
					<p className="text-muted-foreground mt-5 text-base md:text-lg">
						Works with your existing Spotify account
					</p>
				</div>
			</div>

			{/* Footer */}
			<footer className="bg-background/50 border-border border-t py-12 backdrop-blur-md">
				<div className="container mx-auto px-6 md:px-12">
					<div className="flex flex-col items-center justify-between md:flex-row">
						<div className="mb-8 md:mb-0">
							<div className="bg-gradient-brand text-2xl font-bold md:text-3xl">
								Sorted.
							</div>
							<div className="text-muted-foreground mt-2 text-base">
								From likes to perfect playlists.
							</div>
						</div>
						<div className="flex flex-col gap-6 md:flex-row md:items-center md:gap-8">
							<Link
								to="/privacy"
								className="text-muted-foreground hover:text-foreground py-2 text-base transition-colors md:text-lg"
							>
								Privacy Policy
							</Link>
							<Link
								to="/terms"
								className="text-muted-foreground hover:text-foreground py-2 text-base transition-colors md:text-lg"
							>
								Terms of Service
							</Link>
							<Link
								to="/contact"
								className="text-muted-foreground hover:text-foreground py-2 text-base transition-colors md:text-lg"
							>
								Contact
							</Link>
							<div className="mt-4 flex items-center space-x-6 md:mt-0">
								<a
									href="#"
									className="text-muted-foreground hover:text-foreground transition-colors"
								>
									<svg
										className="h-6 w-6"
										fill="currentColor"
										viewBox="0 0 24 24"
										aria-hidden="true"
									>
										<path
											fillRule="evenodd"
											d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
											clipRule="evenodd"
										></path>
									</svg>
								</a>
								<a
									href="#"
									className="text-muted-foreground hover:text-foreground transition-colors"
								>
									<svg
										className="h-6 w-6"
										fill="currentColor"
										viewBox="0 0 24 24"
										aria-hidden="true"
									>
										<path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
									</svg>
								</a>
								<a
									href="#"
									className="text-muted-foreground hover:text-foreground transition-colors"
								>
									<svg
										className="h-6 w-6"
										fill="currentColor"
										viewBox="0 0 24 24"
										aria-hidden="true"
									>
										<path
											fillRule="evenodd"
											d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z"
											clipRule="evenodd"
										></path>
									</svg>
								</a>
								<a
									href="#"
									className="text-muted-foreground hover:text-foreground transition-colors"
								>
									<svg
										className="h-6 w-6"
										fill="currentColor"
										viewBox="0 0 24 24"
										aria-hidden="true"
									>
										<path
											fillRule="evenodd"
											d="M12 6.253v13.5a1.5 1.5 0 001.5 1.5l5-5.5a1.5 1.5 0 000-3l-5-5.5a1.5 1.5 0 00-1.5 1.5V6.253z"
											clipRule="evenodd"
										></path>
									</svg>
								</a>
							</div>
						</div>
					</div>
					<div className="text-muted-foreground/70 mt-10 text-center text-sm md:text-base">
						2025 Sorted. Not affiliated with Spotify. All rights reserved.
					</div>
				</div>
			</footer>
		</div>
	)
}

export const meta: MetaFunction = () => {
	return [
		{ title: 'Sorted - Organize Your Spotify Liked Songs' },
		{
			name: 'description',
			content:
				'Automatically organize your Spotify liked songs into the perfect playlists using AI analysis of lyrics, mood, and vibe.',
		},
	]
}

export default LandingPage
