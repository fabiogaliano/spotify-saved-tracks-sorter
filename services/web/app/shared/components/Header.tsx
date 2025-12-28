import { Beaker } from 'lucide-react'
import { Link } from 'react-router'

import { SpotifySignOut } from '~/components/SpotifySignOut'
import { ThemeToggleButton } from '~/components/theme-toggle-button'
import { Avatar, AvatarFallback, AvatarImage } from '~/shared/components/ui/avatar'

import { Button } from './ui/button'

interface HeaderProps {
	userName: string
	image: string
}

export const Header = ({ userName, image }: HeaderProps) => {
	return (
		<header className="mb-6 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center md:gap-6">
			{/* Nav */}
			<div className="bg-gradient-brand text-2xl font-bold md:text-3xl">Sorted.</div>
			<div>
				<h1 className="text-2xl font-bold md:text-3xl">Your Music Dashboard</h1>
				<p className="text-muted-foreground">
					Organize your Spotify library intelligently
				</p>
			</div>

			<div className="flex flex-wrap items-center gap-3 md:gap-4">
				<span className="text-sm md:text-base">{userName}</span>
				<Avatar>
					<AvatarImage src={image} />
					<AvatarFallback className="text-muted-foreground/50">
						{userName[0] + userName[1]}
					</AvatarFallback>
				</Avatar>

				<ThemeToggleButton />
				<SpotifySignOut />
				{process.env.NODE_ENV !== 'production' && (
					<Link to="/test-services">
						<Button
							variant="default"
							size="sm"
							className="text-foreground gap-2 border-green-600 bg-green-700 transition-colors hover:border-green-500 hover:bg-green-600"
						>
							<Beaker className="h-4 w-4" /> Test Services
						</Button>
					</Link>
				)}
			</div>
		</header>
	)
}
