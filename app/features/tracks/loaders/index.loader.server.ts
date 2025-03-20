// index.loader.server.ts
import { type LoaderFunctionArgs } from '@remix-run/node'
import { getUserSession } from '~/features/auth/auth.utils'
import { trackRepository } from '~/lib/repositories/TrackRepository'

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    // Get session without forcing a redirect
    const sessionData = await getUserSession(request)

    // If not authenticated, just return null data - the component will show the landing page
    if (!sessionData) {
      return Response.json({ savedTracks: null })
    }

    const { userId, hasSetupCompleted } = sessionData

    // Fetch saved tracks if user is authenticated and has completed setup
    let savedTracks = null
    if (hasSetupCompleted) {
      savedTracks = await trackRepository.getSavedTracks(userId)
    }

    return Response.json({ savedTracks })
  } catch (error) {
    return Response.json({ savedTracks: null }, { status: 500 })
  }
}