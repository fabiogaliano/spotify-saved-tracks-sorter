import { useLoaderData } from 'react-router'

import MatchingPage from '~/features/matching/MatchingPage'
import {
	type MatchingLoaderData,
	loader,
} from '~/features/matching/loaders/matching.loader.server'

export { loader }

export default function MatchingRoute() {
	const data = useLoaderData<MatchingLoaderData>()
	return <MatchingPage playlists={data.playlists} tracks={data.tracks} />
}
