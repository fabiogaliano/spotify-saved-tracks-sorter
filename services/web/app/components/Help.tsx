export function Help() {
	return (
		<div className="bg-muted mb-8 rounded-2xl p-6">
			<h2 className="mb-4 text-lg font-semibold">How it works</h2>

			<h3 className="mb-2 font-medium">Setting up playlists</h3>
			<ol className="mb-6 space-y-3">
				<li>1. Create or select a playlist in Spotify</li>
				<li>2. Edit the playlist description to start with "AI:"</li>
				<li>3. Add your desired mood or theme after "AI:"</li>
			</ol>

			<div className="mt-4 mb-6 rounded-xl bg-white p-4">
				<p className="text-muted-foreground/60 text-sm">Example description:</p>
				<p className="font-medium">AI: falling in love and taking life slowly</p>
			</div>

			<h3 className="mb-2 font-medium">Track Controls</h3>
			<div className="space-y-3">
				<div className="flex items-center gap-3">
					<div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-emerald-200 bg-emerald-50">
						{/* Playlist icon */}
						<svg
							className="h-3 w-3 text-emerald-500"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
						>
							<path d="M12 4v16m8-8H4" strokeLinecap="round" strokeLinejoin="round" />
						</svg>
					</div>
					<p className="text-sm">
						<span className="font-medium">Sort:</span> Enable the track to be sorted into
						matching AI playlists
					</p>
				</div>

				<div className="flex items-center gap-3">
					<div className="border-border flex h-6 w-6 items-center justify-center rounded-full border bg-white">
						{/* Skip/Pause icon */}
						<svg
							className="text-muted-foreground h-3 w-3"
							viewBox="0 0 24 24"
							fill="currentColor"
						>
							<path
								d="M8 5v14m8-14v14"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
						</svg>
					</div>
					<p className="text-sm">
						<span className="font-medium">Skip:</span> Temporarily ignore the track - it
						will reappear in future sorting sessions
					</p>
				</div>

				<div className="flex items-center gap-3">
					<div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-rose-200 bg-rose-50">
						{/* Remove/Block icon */}
						<svg
							className="h-3 w-3 text-rose-500"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
						>
							<path
								d="M18 6L6 18M6 6l12 12"
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
						</svg>
					</div>
					<p className="text-sm">
						<span className="font-medium">Remove:</span> Remove the track from sorting
						consideration permanently
					</p>
				</div>
			</div>

			<p className="text-muted-foreground/60 mt-4 text-sm">
				Tip: You can click or drag the control button to change a track's status
			</p>
		</div>
	)
}
