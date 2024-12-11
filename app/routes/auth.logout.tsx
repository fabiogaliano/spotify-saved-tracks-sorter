import type { ActionFunctionArgs } from '@remix-run/node';
import { redirect } from '@remix-run/node';
import { authenticator } from '~/core/auth/auth.server';
import { clearSpotifyApi } from '~/core/api/spotify.api';
import { logger } from '~/core/logging/Logger';

export async function action({ request }: ActionFunctionArgs) {
  clearSpotifyApi();
  logger.clearDefaultContext();
  logger.info('User logged out');
  return authenticator.logout(request, { redirectTo: '/' });
}

export function loader() {
  return redirect('/');
}
