import { redirect } from 'react-router'
import { LoaderFunction } from 'react-router'

import { apiRoutes } from '~/lib/config/routes'

// Redirect to the API test services route which contains the actual test UI
export const loader: LoaderFunction = async () => {
	return redirect(apiRoutes.test.services)
}
