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

const publicRoutes = ['/', '/about'];

export async function loader({ request }: LoaderFunctionArgs) {
  const pathname = new URL(request.url).pathname;
  const isAuthenticated = !!(await authenticator.isAuthenticated(request));

  if (!publicRoutes.includes(pathname) && !isAuthenticated) {
    throw redirect('/');
  }

  return json({ isAuthenticated });
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated = false } = useLoaderData<typeof loader>();

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
            {/* Add navigation items */}
            <Form action="/logout" method="post">
              <button type="submit">Logout</button>
            </Form>
            <a href="/">Home</a>
            <br />
            <a href="/playlists">Playlists</a>
            <br />
            <a href="/savedtracks">Saved Tracks</a>
            <br />
            <br />
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
