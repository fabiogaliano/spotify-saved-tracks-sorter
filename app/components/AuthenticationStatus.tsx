import { Form } from '@remix-run/react'
import type { SpotifyApi } from '@spotify/web-api-ts-sdk'

type AuthenticationStatusProps = {
  spotifyProfile: SpotifyApi.CurrentUsersProfileResponse | null
}

export function AuthenticationStatus({ spotifyProfile }: AuthenticationStatusProps) {
  if (spotifyProfile) {
    return (
      <div className="flex items-center justify-between">
        <p className="text-lg">Welcome, {spotifyProfile.display_name}</p>
        <Form action="/logout" method="post">
          <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">
            Sign Out
          </button>
        </Form>
      </div>
    )
  }

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