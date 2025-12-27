import { useLoaderData } from 'react-router'
import { loader, type MatchingLoaderData } from '~/features/matching/loaders/matching.loader.server'
import MatchingPage from '~/features/matching/MatchingPage'

export { loader }

export default function MatchingRoute() {
  const data = useLoaderData<MatchingLoaderData>()
  return <MatchingPage playlists={data.playlists} tracks={data.tracks} />
}
