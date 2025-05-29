import { Form } from 'react-router';

export function SpotifyLogin() {
  return (
    <div className="text-center">
      <p className="text-xl mb-4">Welcome to Spotify AI Playlist Organizer</p>
      <Form action="/auth/spotify" method="post">
        <button className="px-6 py-3 bg-spotify text-foreground font-semibold rounded-full hover:bg-spotify-hover transition-colors">
          Connect with Spotify
        </button>
      </Form>
    </div>
  )
}
