import { LoaderFunction } from 'react-router';
import { Outlet } from 'react-router';
import { getUserSession } from '~/features/auth/auth.utils'

// This serves as the layout for all /api/* routes
export const loader: LoaderFunction = async ({ request }) => {
  const session = await getUserSession(request)
  const isAuthenticated = session !== null

  return Response.json({ isAuthenticated })
}

export default function ApiRoute() {
  return <Outlet />
}
