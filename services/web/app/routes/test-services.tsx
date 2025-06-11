import { redirect } from 'react-router';
import { LoaderFunction } from 'react-router';

// Redirect to the API test services route which contains the actual test UI
export const loader: LoaderFunction = async () => {
  return redirect('/api/test-services')
}
