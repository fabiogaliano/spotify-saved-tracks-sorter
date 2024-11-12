import type { LoaderFunctionArgs } from '@remix-run/node';
import { authenticator } from '~/services/auth.server';
import type { SpotifySession } from '~/services/auth.server';
import { initializeSpotifyApi } from '~/services';

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await authenticator.authenticate('spotify', request, {
    successRedirect: '/',
    failureRedirect: '/',
  }) as SpotifySession;

  // Initialize Spotify API if authentication was successful
  if (session) {
    initializeSpotifyApi({
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      expiresIn: Math.floor((session.expiresAt - Date.now()) / 1000),
    })
  }

  return session;
}
