import type { LoaderFunctionArgs, MetaFunction, ActionFunction } from '@remix-run/node'
import { Form, useActionData, useLoaderData } from '@remix-run/react'
import {
  spotifyStrategy,
  getSpotifyApi,
  getOrCreateUserDB,
  initializeSpotifyApi,
} from '~/services'
import { SYNC_TYPES, startSyncSavedTracks } from '~/services/api.sync_savedtracks'
import { getLastSyncTime } from '~/services/db/savedtracks.server'

export const meta: MetaFunction = () => {
  return [
    { title: 'Like songs automatic sorter' },
    { name: 'description', content: 'Welcome to AI liked songs sorter!' },
  ]
}

export async function loader({ request }: LoaderFunctionArgs) {
  let spotifyProfile = null
  let user = null

  const session = await spotifyStrategy.getSession(request)
  if (session) {
    initializeSpotifyApi(session)
    const spotifyApi = getSpotifyApi()
    spotifyProfile = await spotifyApi.currentUser.profile()
    if (spotifyProfile && spotifyProfile.id) {
      try {
        user = await getOrCreateUserDB(spotifyProfile.id, spotifyProfile.email)
        const lastsync = await getLastSyncTime(user.id, SYNC_TYPES.SONGS)
        const lastSyncDate = new Date(lastsync)

        // console.log('lastsync : ', lastSyncDate)
      } catch (error) {
        console.error('getOrCreateUserDB error:', error)
      }
    }
  }

  return { spotifyProfile, user }
}

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData()
  const userId = formData.get('userId')

  try {
    const userIdNumber = userId ? Number(userId) : null
    if (!userIdNumber) throw new Error('User ID not provided')
    const result = await startSyncSavedTracks(userIdNumber)
    console.log(result)
    return result
  } catch (error) {
    console.error('Error syncing tracks:', error)
    return { error: 'Failed to sync tracks' }
  }
}
export default function Index() {
  const { spotifyProfile, user } = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()
  console.log('actionData: ', actionData)
  return (
    <div style={{ textAlign: 'center', padding: 20 }}>
      {spotifyProfile ? (
        <p>You are logged in as: {spotifyProfile.display_name}</p>
      ) : (
        <p>You are not logged in yet!</p>
      )}
      <Form action={spotifyProfile ? '/logout' : '/auth/spotify'} method="post">
        <button>{spotifyProfile ? 'Logout' : 'Log in with Spotify'}</button>
      </Form>
      <br />
      <br />
      <p>Organize your Spotify Liked Songs with the help of AI</p>
      <br />
      <p>To any playlist, edit the description to start with "AI:"</p>
      <p>Then write the mood you want for songs to be matched against.</p>
      <p>
        <b>example</b>
      </p>
      <p>AI: falling in love and taking life slowly</p>
      <br />
      {spotifyProfile ? (
        <Form method="post">
          <input type="hidden" name="userId" value={user?.id} />
          <button type="submit" name="_action" value="sync">
            Fetch saved tracks
          </button>
        </Form>
      ) : null}
    </div>
  )
}
