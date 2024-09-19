import type { LoaderFunctionArgs, MetaFunction } from '@remix-run/node';
import { Form, useLoaderData } from '@remix-run/react';
import { spotifyStrategy } from '~/services/auth.server';

export const meta: MetaFunction = () => {
  return [
    { title: "Like songs automatic sorter" },
    { name: "description", content: "Welcome to AI liked songs sorter!" },
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
