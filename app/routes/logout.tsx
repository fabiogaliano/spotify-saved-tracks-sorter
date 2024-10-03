import type { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/node';
import { redirect } from '@remix-run/node';
import { authenticator } from '~/services/auth.server';
import { clearSpotifyApi } from '~/services/spotify.server';

export async function action({ request }: ActionFunctionArgs) {
  clearSpotifyApi();
  return authenticator.logout(request, { redirectTo: '/' });
}

export function loader() {
  return redirect('/');
}
