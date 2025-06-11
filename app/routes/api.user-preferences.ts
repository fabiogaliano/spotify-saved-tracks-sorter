import { LoaderFunctionArgs } from 'react-router';
import { requireUserSession } from '~/features/auth/auth.utils';
import { userService } from '~/lib/services/UserService';

export async function loader({ request }: LoaderFunctionArgs) {
  const userSession = await requireUserSession(request);
  if (!userSession) {
    return Response.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const preferences = await userService.getUserPreferences(userSession.userId);

    return Response.json({
      preferences: preferences || {
        batch_size: 1,
        sync_mode: 'manual',
        theme_preference: 'dark'
      }
    });

  } catch (error) {
    console.error('Error loading preferences:', error);
    return Response.json(
      {
        error: 'Failed to load preferences',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}