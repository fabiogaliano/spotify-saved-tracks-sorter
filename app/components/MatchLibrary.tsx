import { useState } from 'react'
import { matchingService } from '~/lib/services'
import type { Song, Playlist, MatchResult } from '~/lib/models/Matching'

interface MatchLibraryProps {
	savedTracks: Song[]
	playlists: Playlist[]
}

export function MatchLibrary({ savedTracks, playlists }: MatchLibraryProps) {
	const [isMatching, setIsMatching] = useState(false)
	const [matchResults, setMatchResults] = useState<
		Array<{
			song: Song
			matches: Array<{ playlist: Playlist; matchResult: MatchResult }>
		}>
	>([])
	const [error, setError] = useState<string | null>(null)

	// Match all saved tracks to playlists
	const handleMatchLibrary = async () => {
		try {
			setIsMatching(true)
			setError(null)

			// Limit to first 10 songs for testing
			const songs = savedTracks.slice(0, 10)

			// Match each song to all playlists
			const results = await Promise.all(
				songs.map(async song => {
					try {
						const matches = await matchingService.matchSongToPlaylists(song, playlists)
						// Return the top matches for each song
						return { song, matches: matches.slice(0, 3) }
					} catch (err) {
						console.error('Error matching song:', err)
						return { song, matches: [] }
					}
				})
			)

			setMatchResults(results)
		} catch (err) {
			console.error('Error in matchLibrary:', err)
			setError(
				`Error matching library: ${err instanceof Error ? err.message : String(err)}`
			)
		} finally {
			setIsMatching(false)
		}
	}

	// Match a single playlist against all songs
	const matchPlaylist = async (playlist: Playlist) => {
		try {
			setIsMatching(true)
			setError(null)

			// Match the playlist against all saved tracks
			const results = await matchingService.matchSongsToPlaylist(playlist, savedTracks)

			// Show the top matches
			alert(
				`Top matches for ${playlist.name || playlist.id}:\n${results
					.slice(0, 5)
					.map(
						r =>
							`${r.track_info.artist} - ${r.track_info.title}: ${(
								r.similarity * 100
							).toFixed(1)}%`
					)
					.join('\n')}`
			)
		} catch (err) {
			console.error('Error matching playlist:', err)
			setError(
				`Error matching playlist: ${err instanceof Error ? err.message : String(err)}`
			)
		} finally {
			setIsMatching(false)
		}
	}

	return (
		<div className="p-4 bg-gray-800 rounded-lg">
			<h2 className="text-xl font-bold mb-4">Match Library</h2>

			<button
				onClick={handleMatchLibrary}
				disabled={isMatching}
				className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
			>
				{isMatching ? 'Matching...' : 'Match Library'}
			</button>

			{error && <div className="mt-4 p-3 bg-red-600 rounded-lg">{error}</div>}

			{matchResults.length > 0 && (
				<div className="mt-6">
					<h3 className="text-lg font-semibold mb-2">Match Results</h3>

					<div className="space-y-4">
						{matchResults.map(result => (
							<div
								key={result.song.track.id}
								className="border border-gray-700 rounded-lg p-3"
							>
								<h4 className="font-medium">
									{result.song.track.artist} - {result.song.track.title}
								</h4>

								{result.matches.length > 0 ? (
									<div className="mt-2 space-y-2">
										<p className="text-sm text-gray-400">Top matches:</p>
										{result.matches.map(({ playlist, matchResult }) => (
											<div
												key={playlist.id}
												className="flex items-center justify-between text-sm p-2 bg-gray-900 rounded"
											>
												<span>{playlist.name || `Playlist ${playlist.id}`}</span>
												<span
													className={`px-2 py-1 rounded ${
														matchResult.similarity > 0.8
															? 'bg-green-600'
															: matchResult.similarity > 0.6
															? 'bg-green-800'
															: matchResult.similarity > 0.4
															? 'bg-yellow-600'
															: 'bg-red-600'
													}`}
												>
													{(matchResult.similarity * 100).toFixed(1)}%
												</span>
											</div>
										))}
									</div>
								) : (
									<p className="text-sm text-gray-400 mt-2">No matches found</p>
								)}
							</div>
						))}
					</div>
				</div>
			)}

			{playlists.length > 0 && (
				<div className="mt-6">
					<h3 className="text-lg font-semibold mb-2">Match Individual Playlists</h3>
					<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
						{playlists.map(playlist => (
							<button
								key={playlist.id}
								onClick={() => matchPlaylist(playlist)}
								disabled={isMatching}
								className="p-2 bg-gray-700 rounded-lg text-sm hover:bg-gray-600 disabled:opacity-50 truncate"
							>
								{playlist.name || `Playlist ${playlist.id}`}
							</button>
						))}
					</div>
				</div>
			)}
		</div>
	)
}
