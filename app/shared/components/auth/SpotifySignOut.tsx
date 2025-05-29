import { Form } from 'react-router';

export function SpotifySignOut() {
  return (
    <div className="flex items-center justify-between">
      <Form action="/auth/logout" method="post">
        <button className="px-4 py-2 rounded-full font-medium text-sm bg-muted text-muted-foreground/50 flex items-center justify-center hover:bg-muted hover:text-muted-foreground/70 transition-all duration-200 active:scale-95">
          Sign Out
        </button>
      </Form>
    </div>
  )
} 