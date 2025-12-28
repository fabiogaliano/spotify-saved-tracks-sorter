import { Form } from 'react-router'

type SyncLibraryProps = {
	userId: number | undefined
}

export function SyncLibrary({ userId }: SyncLibraryProps) {
	return (
		<div className="text-center">
			<Form method="post">
				<input type="hidden" name="userId" value={userId} />
				<button
					type="submit"
					name="_action"
					value="sync"
					className="text-foreground rounded-full bg-[#1DB954] px-6 py-3 font-semibold transition-colors hover:bg-[#1ed760]"
				>
					Sync Spotify Library
				</button>
			</Form>
		</div>
	)
}
