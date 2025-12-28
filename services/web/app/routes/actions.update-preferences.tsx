import { ActionFunctionArgs } from 'react-router'

import { requireUserSession } from '~/features/auth/auth.utils'
import type { LibrarySyncMode } from '~/lib/models/User'
import { userService } from '~/lib/services/UserService'
import type { Enums } from '~/types/database.types'

interface UpdatePreferencesRequest {
	batchSize?: number
	syncMode?: LibrarySyncMode
	theme?: Enums<'theme'>
}

export async function action({ request }: ActionFunctionArgs) {
	const userSession = await requireUserSession(request)
	if (!userSession) {
		return Response.json({ error: 'Authentication required' }, { status: 401 })
	}

	try {
		const body = (await request.json()) as UpdatePreferencesRequest

		const updatedPreferences = await userService.updateAllPreferences(
			userSession.userId,
			body
		)

		return Response.json({
			success: true,
			preferences: updatedPreferences,
		})
	} catch (error) {
		console.error('Error updating preferences:', error)
		return Response.json(
			{
				error: 'Failed to update preferences',
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 }
		)
	}
}
