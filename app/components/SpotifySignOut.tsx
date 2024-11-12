import { Form } from '@remix-run/react'

export function SpotifySignOut() {
  return (
    <div className="flex items-center justify-between">
      <Form action="/logout" method="post">
        <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">
          Sign Out
        </button>
      </Form>
    </div>
  )
} 