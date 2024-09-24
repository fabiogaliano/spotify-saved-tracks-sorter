import type { LoaderFunctionArgs, MetaFunction } from '@remix-run/node';
import { Form, useLoaderData } from '@remix-run/react';
import { spotifyStrategy } from '~/services/auth.server';
import { SpotifyApi } from '@fostertheweb/spotify-web-sdk';

export const meta: MetaFunction = () => {
  return [
    { title: 'Like songs automatic sorter' },
    { name: 'description', content: 'Welcome to AI liked songs sorter!' },
  ];
};

export async function loader({ request }: LoaderFunctionArgs) {
  if (!process.env.SPOTIFY_CLIENT_ID) {
    throw new Error('SPOTIFY_CLIENT_ID environment variable is not set!');
  }

  const data = await spotifyStrategy.getSession(request);
  let savedTracks = null;
  if (data && data.accessToken) {
    const sdk = SpotifyApi.withAccessToken(process.env.SPOTIFY_CLIENT_ID, {
      access_token: data.accessToken,
      refresh_token: data.refreshToken!,
      expires_in: data.expiresAt,
      token_type: data.tokenType!
    })
    savedTracks = await sdk.currentUser.tracks.savedTracks()
  }

  return { data, savedTracks }
}

export default function Index() {
  const { data, savedTracks } = useLoaderData<typeof loader>();
  const user = data?.user;

  console.log('savedTracks: ', savedTracks?.items[0].track);
  return (
    <div style={{ textAlign: 'center', padding: 20 }}>
      <h2>Welcome to AI liked songs sorter!</h2>
      <br></br>
      {user ? (
        <p>You are logged in as: {user.name}</p>
      ) : (
        <p>You are not logged in yet!</p>
      )}
      <Form action={user ? '/logout' : '/auth/spotify'} method="post">
        <button>{user ? 'Logout' : 'Log in with Spotify'}</button>
      </Form>
    </div>
  );
}
