import React from 'react'

import { TrackWithAnalysis } from '~/lib/models/Track'

import LikedSongsContent from './components/LikedSongsContent'
import { LikedSongsUIProvider } from './store/liked-songs-ui-store'

interface LikedSongsTableProps {
	initialSongs: TrackWithAnalysis[]
	userId: number
}

const LikedSongsTable: React.FC<LikedSongsTableProps> = ({ initialSongs, userId }) => {
	return (
		<LikedSongsUIProvider>
			<LikedSongsContent initialSongs={initialSongs} userId={userId} />
		</LikedSongsUIProvider>
	)
}

export { LikedSongsTable }
export default LikedSongsTable
