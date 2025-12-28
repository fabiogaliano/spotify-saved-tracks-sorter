import { Database } from '~/types/database.types'

import { getSupabase } from '../services/DatabaseService'

export type TrackAnalysisAttempt =
	Database['public']['Tables']['track_analysis_attempts']['Row']
export type TrackAnalysisAttemptInsert =
	Database['public']['Tables']['track_analysis_attempts']['Insert']
export type TrackAnalysisAttemptUpdate =
	Database['public']['Tables']['track_analysis_attempts']['Update']

export type FailedAnalysisAttempt = Pick<TrackAnalysisAttempt, 'track_id'>

export class TrackAnalysisAttemptsRepository {
	async getLatestAttemptForTrack(trackId: number): Promise<TrackAnalysisAttempt | null> {
		const { data, error } = await getSupabase()
			.from('track_analysis_attempts')
			.select('*')
			.eq('track_id', trackId)
			.order('created_at', { ascending: false })
			.limit(1)
			.single()

		if (error) {
			if (error.code === 'PGRST116') {
				// No rows returned
				return null
			}
			console.error('Error fetching latest track analysis attempt:', error)
			throw error
		}

		return data
	}

	async deleteAttempt(attemptId: number): Promise<void> {
		const { error } = await getSupabase()
			.from('track_analysis_attempts')
			.delete()
			.eq('id', attemptId)

		if (error) {
			throw new Error(`Failed to delete attempt ${attemptId}: ${error.message}`)
		}
	}

	async getAttemptsByTrackId(trackId: number): Promise<TrackAnalysisAttempt[]> {
		const { data, error } = await getSupabase()
			.from('track_analysis_attempts')
			.select('*')
			.eq('track_id', trackId)
			.order('created_at', { ascending: false })

		if (error) {
			console.error('Error fetching track analysis attempts:', error)
			throw error
		}

		return data || []
	}

	async getAttemptsByJobId(jobId: string): Promise<TrackAnalysisAttempt[]> {
		const { data, error } = await getSupabase()
			.from('track_analysis_attempts')
			.select('*')
			.eq('job_id', jobId)
			.order('created_at', { ascending: false })

		if (error) {
			console.error('Error fetching track analysis attempts by job ID:', error)
			throw error
		}

		return data || []
	}

	async createAttempt(
		attempt: TrackAnalysisAttemptInsert
	): Promise<TrackAnalysisAttempt> {
		const { data, error } = await getSupabase()
			.from('track_analysis_attempts')
			.insert(attempt)
			.select()
			.single()

		if (error) {
			console.error('Error creating track analysis attempt:', error)
			throw error
		}

		return data
	}

	async updateAttempt(
		id: number,
		updates: TrackAnalysisAttemptUpdate
	): Promise<TrackAnalysisAttempt> {
		const { data, error } = await getSupabase()
			.from('track_analysis_attempts')
			.update(updates)
			.eq('id', id)
			.select()
			.single()

		if (error) {
			console.error('Error updating track analysis attempt:', error)
			throw error
		}

		return data
	}

	async markAttemptAsFailed(
		id: number,
		errorType: string,
		errorMessage: string
	): Promise<TrackAnalysisAttempt> {
		return this.updateAttempt(id, {
			status: 'FAILED',
			error_type: errorType,
			error_message: errorMessage,
			updated_at: new Date().toISOString(),
		})
	}

	async getFailedAnalysisAttempts(trackIds: number[]): Promise<FailedAnalysisAttempt[]> {
		if (!trackIds.length) return []

		const { data, error } = await getSupabase()
			.from('track_analysis_attempts')
			.select('track_id')
			.in('track_id', trackIds)
			.eq('status', 'FAILED')

		if (error) {
			console.error('Error fetching failed analysis attempts:', error)
			return []
		}

		return data || []
	}
}

export const trackAnalysisAttemptsRepository = new TrackAnalysisAttemptsRepository()
