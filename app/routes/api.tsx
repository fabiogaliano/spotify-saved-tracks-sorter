import { LoaderFunction, json } from '@remix-run/node'
import { Outlet } from '@remix-run/react'
import { getUserSession } from '~/features/auth/auth.utils'

// This serves as the layout for all /api/* routes
export const loader: LoaderFunction = async ({ request }) => {
  const { session } = await getUserSession(request)
  const isAuthenticated = session !== null
  
  return json({ isAuthenticated })
}

export default function ApiRoute() {
  return <Outlet />
}
