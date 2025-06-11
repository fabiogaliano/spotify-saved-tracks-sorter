import { Form } from 'react-router';

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
					className="px-6 py-3 bg-[#1DB954] text-foreground font-semibold rounded-full hover:bg-[#1ed760] transition-colors"
				>
					Sync Spotify Library
				</button>
			</Form>
		</div>
	)
}

