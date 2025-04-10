import { PlaylistTrackUI } from '../playlist-viewer/types';

export const TableElements = {
  Header: () => (
    <thead className="border-b border-gray-800">
      <tr>
        <th className="text-left text-xs font-medium text-gray-400 p-2">#</th>
        <th className="text-left text-xs font-medium text-gray-400 p-2">Title</th>
        <th className="text-left text-xs font-medium text-gray-400 p-2">Album</th>
        <th className="text-left text-xs font-medium text-gray-400 p-2">Date Added</th>
      </tr>
    </thead>
  ),

  TrackRow: ({ track, index }: { track: PlaylistTrackUI; index: number }) => {
    const relativeDate = track.dateAdded;
    const fullDate = track.rawAddedAt || '';

    return (
      <tr className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
        <td className="text-gray-400 p-2 w-10 text-right">{index + 1}</td>
        <td className="text-white p-2">
          <div className="flex flex-col">
            <span className="font-medium">{track.title}</span>
            <span className="text-gray-400 text-sm">{track.artist}</span>
          </div>
        </td>
        <td className="text-gray-300 p-2">{track.album}</td>
        <td className="text-gray-400 text-sm p-2">
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
            <td colSpan={4} className="text-center text-gray-400 py-8">
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
