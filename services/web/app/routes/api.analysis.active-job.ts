import { LoaderFunctionArgs } from 'react-router'

import {
	createResponseWithUpdatedSession,
	requireUserSession,
} from '~/features/auth/auth.utils'
import { jobPersistenceService } from '~/lib/services/JobPersistenceService'
import { isTrackBatchJob } from '~/lib/types/analysis.types'

export async function loader({ request }: LoaderFunctionArgs) {
	const sessionData = await requireUserSession(request)
	if (!sessionData) {
		return Response.json({ error: 'Authentication required' }, { status: 401 })
	}

	try {
		const activeJob = await jobPersistenceService.getActiveJobForUser(sessionData.userId)

		if (activeJob) {
			// Convert itemStates Map to a plain object for JSON serialization
			// Only track_batch jobs have itemStates; playlist jobs don't
			const itemStatesObj =
				isTrackBatchJob(activeJob) ?
					Object.fromEntries(activeJob.itemStates.entries())
				:	{}

			const jobForSerialization = {
				...activeJob,
				itemStates: itemStatesObj,
			}
			return createResponseWithUpdatedSession(jobForSerialization, sessionData)
		} else {
			return createResponseWithUpdatedSession(null, sessionData)
		}
	} catch (error) {
		console.error('Error fetching active job:', error)
		return Response.json({ error: 'Failed to fetch active job' }, { status: 500 })
	}
}
