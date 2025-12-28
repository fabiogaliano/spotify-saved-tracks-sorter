import { getSupabase } from '~/lib/services/DatabaseService'

interface PlaylistAnalysis {
	id: number
	playlist_id: number
	analysis: any
	user_id: number
	created_at: string | null
	model_name: string
	version: number
}

class PlaylistAnalysisRepository {
	/**
	 * Get all analyses for a user
	 */
	async getAnalysesByUserId(userId: number): Promise<PlaylistAnalysis[]> {
		const { data, error } = await getSupabase()
			.from('playlist_analyses')
			.select('id, playlist_id, analysis, user_id, created_at, model_name, version')
			.eq('user_id', userId)

		if (error) {
			console.error('Error fetching playlist analyses:', error)
			throw error
		}

		return data || []
	}

	/**
	 * Get analysis for a specific playlist
	 */
	async getAnalysisByPlaylistId(playlistId: number): Promise<PlaylistAnalysis | null> {
		const { data, error } = await getSupabase()
			.from('playlist_analyses')
			.select('*')
			.eq('playlist_id', playlistId)
			.limit(1)

		if (error) {
			console.error(`Error fetching analysis for playlist ${playlistId}:`, error)
			throw error
		}

		return data?.[0] || null
	}

	/**
	 * Insert a new playlist analysis
	 */
	async createAnalysis(
		playlistId: number,
		userId: number,
		analysis: any,
		modelName: string = 'default-model',
		version: number = 1
	): Promise<number> {
		const { data, error } = await getSupabase()
			.from('playlist_analyses')
			.insert({
				playlist_id: playlistId,
				user_id: userId,
				analysis,
				model_name: modelName,
				version,
			})
			.select('id')

		if (error) {
			console.error(`Error creating analysis for playlist ${playlistId}:`, error)
			throw error
		}

		return data?.[0]?.id
	}

	/**
	 * Update an existing playlist analysis
	 */
	async updateAnalysis(analysisId: number, analysis: any): Promise<void> {
		const { error } = await getSupabase()
			.from('playlist_analyses')
			.update({ analysis })
			.eq('id', analysisId)

		if (error) {
			console.error(`Error updating analysis ${analysisId}:`, error)
			throw error
		}
	}

	/**
	 * Delete a playlist analysis
	 */
	async deleteAnalysis(analysisId: number): Promise<void> {
		const { error } = await getSupabase()
			.from('playlist_analyses')
			.delete()
			.eq('id', analysisId)

		if (error) {
			console.error(`Error deleting analysis ${analysisId}:`, error)
			throw error
		}
	}
}

export const playlistAnalysisRepository = new PlaylistAnalysisRepository()
