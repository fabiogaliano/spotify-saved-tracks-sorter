import { PlaylistTrackUI } from '../../types';

export const TableElements = {
  Header: () => (
    <thead className="border-b border-border">
      <tr>
        <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">#</th>
        <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Title</th>
        <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Album</th>
        <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Date Added</th>
      </tr>
    </thead>
  ),

  TrackRow: ({ track, index }: { track: PlaylistTrackUI; index: number }) => {
    const relativeDate = track.dateAdded;
    const fullDate = track.rawAddedAt || '';

    return (
      <tr className="border-b border-border/50 hover:bg-card/30 transition-colors">
        <td className="px-4 py-3 text-muted-foreground w-10 text-right">{index + 1}</td>
        <td className="px-4 py-3 text-foreground">
          <div className="flex flex-col">
            <span className="font-medium">{track.title}</span>
            <span className="text-muted-foreground text-sm">{track.artist}</span>
          </div>
        </td>
        <td className="px-4 py-3 text-muted-foreground">{track.album}</td>
        <td className="px-4 py-3 text-muted-foreground text-sm">
          <span title={fullDate}>
            {relativeDate}
          </span>
        </td>
      </tr>
    );
  },

  PlaylistTable: ({ playlistTracks }: { playlistTracks: PlaylistTrackUI[] }) => (
    <table className="w-full">
      <TableElements.Header />
      <tbody>
        {playlistTracks.length === 0 ? (
          <tr>
            <td colSpan={4} className="text-center text-muted-foreground py-8">
              No tracks found in this playlist
            </td>
          </tr>
        ) : (
          playlistTracks.map((track, index) => (
            <TableElements.TrackRow key={track.id} track={track} index={index} />
          ))
        )}
      </tbody>
    </table>
  )
};
