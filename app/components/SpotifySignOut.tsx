import { Form } from '@remix-run/react'

export function SpotifySignOut() {
  return (
    <div className="flex items-center justify-between">
      <Form action="/logout" method="post">
        <button className="px-4 py-2 rounded-full font-medium text-sm bg-gray-100 text-gray-700 flex items-center justify-center hover:bg-gray-200 hover:text-gray-500 transition-all duration-200 active:scale-95">
  Sign Out
</button>
      </Form>
    </div>
  )
} 