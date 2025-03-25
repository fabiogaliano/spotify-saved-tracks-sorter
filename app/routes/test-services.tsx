import { redirect } from '@remix-run/node'
import { LoaderFunction } from '@remix-run/node'

// Redirect to the API test services route which contains the actual test UI
export const loader: LoaderFunction = async () => {
  return redirect('/api/test-services')
}
