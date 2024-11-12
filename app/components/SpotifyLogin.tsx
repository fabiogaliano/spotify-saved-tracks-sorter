import { Form } from '@remix-run/react'

export function SpotifyLogin() {
  return (
    <div className="text-center">
      <p className="text-xl mb-4">Welcome to Spotify AI Playlist Organizer</p>
      <Form action="/auth/spotify" method="post">
        <button className="px-6 py-3 bg-[#1DB954] text-white font-semibold rounded-full hover:bg-[#1ed760] transition-colors">
          Connect with Spotify
        </button>
      </Form>
    </div>
  )
} 