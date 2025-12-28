import { PlaylistTrackUI } from '../../types'

export const TableElements = {
	Header: () => (
		<thead className="border-border border-b">
			<tr>
				<th className="text-muted-foreground px-4 py-3 text-left text-sm font-medium">
					#
				</th>
				<th className="text-muted-foreground px-4 py-3 text-left text-sm font-medium">
					Title
				</th>
				<th className="text-muted-foreground px-4 py-3 text-left text-sm font-medium">
					Album
				</th>
				<th className="text-muted-foreground px-4 py-3 text-left text-sm font-medium">
					Date Added
				</th>
			</tr>
		</thead>
	),

	TrackRow: ({ track, index }: { track: PlaylistTrackUI; index: number }) => {
		const relativeDate = track.dateAdded
		const fullDate = track.rawAddedAt || ''

		return (
			<tr className="border-border/50 hover:bg-card/30 border-b transition-colors">
				<td className="text-muted-foreground w-10 px-4 py-3 text-right">{index + 1}</td>
				<td className="text-foreground px-4 py-3">
					<div className="flex flex-col">
						<span className="font-medium">{track.title}</span>
						<span className="text-muted-foreground text-sm">{track.artist}</span>
					</div>
				</td>
				<td className="text-muted-foreground px-4 py-3">{track.album}</td>
				<td className="text-muted-foreground px-4 py-3 text-sm">
					<span title={fullDate}>{relativeDate}</span>
				</td>
			</tr>
		)
	},

	PlaylistTable: ({ playlistTracks }: { playlistTracks: PlaylistTrackUI[] }) => (
		<table className="w-full">
			<TableElements.Header />
			<tbody>
				{playlistTracks.length === 0 ?
					<tr>
						<td colSpan={4} className="text-muted-foreground py-8 text-center">
							No tracks found in this playlist
						</td>
					</tr>
				:	playlistTracks.map((track, index) => (
						<TableElements.TrackRow key={track.id} track={track} index={index} />
					))
				}
			</tbody>
		</table>
	),
}
