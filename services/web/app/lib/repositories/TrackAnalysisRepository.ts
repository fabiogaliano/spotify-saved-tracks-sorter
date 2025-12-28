import type {
	TrackAnalysis,
	TrackAnalysisInsert,
	TrackAnalysisRepository,
} from '~/lib/models/TrackAnalysis'
import { getSupabase } from '~/lib/services/DatabaseService'

class SupabaseTrackAnalysisRepository implements TrackAnalysisRepository {
	async getByTrackId(trackId: number): Promise<TrackAnalysis | null> {
		const { data, error } = await getSupabase()
			.from('track_analyses')
			.select('*')
			.eq('track_id', trackId)
			.maybeSingle()

		if (error) throw error
		return data
	}

	async getAllAnalyses(): Promise<TrackAnalysis[]> {
		const { data, error } = await getSupabase().from('track_analyses').select('*')

		if (error) throw error
		return data || []
	}

	async insertAnalysis(analysis: TrackAnalysisInsert): Promise<TrackAnalysis> {
		const { data, error } = await getSupabase()
			.from('track_analyses')
			.insert(analysis)
			.select()
			.single()

		if (error) throw error
		if (!data) throw new Error('Failed to insert track analysis')
		return data
	}

	async deleteAnalysis(id: number): Promise<void> {
		const { error } = await getSupabase().from('track_analyses').delete().eq('id', id)

		if (error) throw error
	}

	async deleteAnalysisByTrackId(trackId: number): Promise<void> {
		const { error } = await getSupabase()
			.from('track_analyses')
			.delete()
			.eq('track_id', trackId)

		if (error) throw error
	}
}

export const trackAnalysisRepository = new SupabaseTrackAnalysisRepository()
