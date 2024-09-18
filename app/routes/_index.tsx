import type { LoaderFunctionArgs, MetaFunction } from '@remix-run/node';
import { Form, useLoaderData } from '@remix-run/react';
import { spotifyStrategy } from '~/services/auth.server';

export const meta: MetaFunction = () => {
  return [
    { title: "New Remix App" },
    { name: "description", content: "Welcome to Remix!" },
  ];
};

export async function loader({ request }: LoaderFunctionArgs) {
  return spotifyStrategy.getSession(request);
}

export default function Index() {
  const data = useLoaderData<typeof loader>();
  const user = data?.user;

  return (
    <div style={{ textAlign: 'center', padding: 20 }}>
      <h2>Welcome to Remix!</h2>
      <p>
        <a href="https://docs.remix.run">Check out the docs</a> to get
        started.
      </p>
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
