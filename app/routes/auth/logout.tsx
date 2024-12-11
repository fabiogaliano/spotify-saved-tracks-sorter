import type { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/node';
import { redirect } from '@remix-run/node';
import { authenticator } from '~/core/auth/auth.server';
import { clearSpotifyApi } from '~/core/api/spotify.api';

export async function action({ request }: ActionFunctionArgs) {
  clearSpotifyApi();
  return authenticator.logout(request, { redirectTo: '/' });
}

export function loader() {
  return redirect('/');
}
