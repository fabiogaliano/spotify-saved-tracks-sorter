import { Form } from 'react-router'

export function SpotifySignOut() {
	return (
		<div className="flex items-center justify-between">
			<Form action="/auth/logout" method="post">
				<button className="bg-muted text-muted-foreground/50 hover:bg-muted hover:text-muted-foreground/70 flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 active:scale-95">
					Sign Out
				</button>
			</Form>
		</div>
	)
}
