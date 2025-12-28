import { Form } from 'react-router'

export function SpotifyLogin() {
	return (
		<div className="text-center">
			<p className="mb-4 text-xl">Welcome to Spotify AI Playlist Organizer</p>
			<Form action="/auth/spotify" method="post">
				<button className="bg-spotify text-foreground hover:bg-spotify-hover rounded-full px-6 py-3 font-semibold transition-colors">
					Connect with Spotify
				</button>
			</Form>
		</div>
	)
}
