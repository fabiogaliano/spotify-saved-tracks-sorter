import {
  Form,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from '@remix-run/react';
import type { LinksFunction, LoaderFunctionArgs } from '@remix-run/node';
import { json, redirect } from '@remix-run/node';
import { authenticator } from '~/services/auth.server';
import type { SpotifySession } from '~/services/auth.server';

import './tailwind.css';

export const links: LinksFunction = () => [
  { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
  {
    rel: 'preconnect',
    href: 'https://fonts.gstatic.com',
    crossOrigin: 'anonymous',
  },
  {
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap',
  },
];

const publicRoutes = ['/', '/about', '/auth/spotify', '/auth/spotify/callback'];

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Get session and handle type safety
  const session = await authenticator.isAuthenticated(request) as SpotifySession | null;

  // For protected routes, redirect if not authenticated
  if (!publicRoutes.includes(pathname) && !session) {
    return redirect('/');
  }

  // Return minimal session data needed for UI
  return json({
    isAuthenticated: !!session,
    user: session?.user || null
  });
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useLoaderData<typeof loader>();

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {isAuthenticated && (
          <nav>
            <div>
              {user?.name && <span>Welcome, {user.name}</span>}
              <Form action="/logout" method="post">
                <button type="submit">Logout</button>
              </Form>
              <a href="/">Home</a>
            </div>
          </nav>
        )}
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}
