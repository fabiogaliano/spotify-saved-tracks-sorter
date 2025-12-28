import type { ActionFunctionArgs } from 'react-router'

import { logger } from '~/lib/logging/Logger'
import { playlistAnalysisRepository } from '~/lib/repositories/PlaylistAnalysisRepository'
import { playlistRepository } from '~/lib/repositories/PlaylistRepository'
import { trackRepository } from '~/lib/repositories/TrackRepository'
import { llmProviderManager } from '~/lib/services'

// Define a more specific type for playlist tracks that matches database return
interface DbPlaylistTrack {
	track_id: number
	spotify_track_id: string
	name: string
	artist: string
	[key: string]: any
}

export const action = async ({ request }: ActionFunctionArgs) => {
	try {
		const formData = await request.formData()
		const playlistId = formData.get('playlistId')?.toString()
		const promptTemplate =
			formData.get('prompt')?.toString() || 'Analyze this playlist: {playlist_name}'

		if (!playlistId) {
			return { success: false, error: 'No playlist ID provided' }
		}

		// Get playlist details
		const playlist = await playlistRepository.getPlaylistById(Number(playlistId))
		if (!playlist) {
			return { success: false, error: `Playlist with ID ${playlistId} not found` }
		}

		// Check if this playlist already has an analysis
		const existingAnalysis = await playlistAnalysisRepository.getAnalysisByPlaylistId(
			Number(playlistId)
		)

		if (existingAnalysis) {
			return {
				success: true,
				playlistId,
				analysisId: existingAnalysis.id,
				alreadyAnalyzed: true,
			}
		}

		// Get playlist tracks
		const playlistTracks = await playlistRepository.getPlaylistTracks(Number(playlistId))

		if (!playlistTracks || playlistTracks.length === 0) {
			return { success: false, playlistId, error: 'No tracks found in this playlist' }
		}

		// Get track details using the repository
		const trackIds = playlistTracks.map(pt => pt.track_id)
		const trackDetailsResult = await trackRepository.getTracksByIds(trackIds)

		// Combine playlist tracks with their details
		const tracks = playlistTracks.map(pt => {
			const trackDetail = trackDetailsResult.find(t => t.id === pt.track_id)
			return {
				track_id: pt.track_id,
				spotify_track_id: pt.spotify_track_id,
				name: trackDetail?.name || '',
				artist: trackDetail?.artist || '',
			}
		})

		// Format track list for prompt
		const formattedTracks = tracks
			.filter(t => t.name && t.artist)
			.map(t => `"${t.name}" by ${t.artist}`)
			.join('\n')

		// Fill prompt template
		const filledPrompt = promptTemplate
			.replace('{playlist_name}', playlist.name)
			.replace('{playlist_description}', playlist.description || '')
			.replace('{tracks}', formattedTracks)

		// Generate analysis using LLM
		const llmResponse = await llmProviderManager.generateText(filledPrompt)
		let analysisJson: any
		try {
			analysisJson = JSON.parse(llmResponse.text)
		} catch (e) {
			const jsonMatch = llmResponse.text.match(/```json\s*([\s\S]*?)\s*```/)
			if (jsonMatch && jsonMatch[1]) {
				try {
					analysisJson = JSON.parse(jsonMatch[1].trim())
				} catch (extractError) {
					logger.error('Failed to parse extracted LLM content as JSON', {
						playlistId,
						extractError,
					})
					return {
						success: false,
						playlistId,
						error: 'Failed to parse extracted LLM content as JSON',
					}
				}
			} else {
				logger.error(
					'Failed to parse LLM analysis result as JSON - no JSON code block found',
					{ playlistId }
				)
				return {
					success: false,
					playlistId,
					error: 'Failed to parse LLM analysis result as JSON - no JSON code block found',
				}
			}
		}

		if (!analysisJson) {
			return { success: false, playlistId, error: 'Failed to generate analysis' }
		}

		const modelUsed = llmProviderManager.getCurrentModel()

		// Store analysis in database
		try {
			const analysisId = await playlistAnalysisRepository.createAnalysis(
				Number(playlistId),
				1, // TODO: Replace with actual user ID from session
				analysisJson,
				modelUsed,
				1 // Version number
			)

			return { success: true, playlistId, analysisId }
		} catch (insertError) {
			console.error('Error saving analysis:', insertError)
			return {
				success: false,
				playlistId,
				error: 'Failed to save analysis',
				details: insertError instanceof Error ? insertError.message : 'Unknown error',
			}
		}
	} catch (error) {
		console.error('Error in playlist analysis action:', error)
		return {
			success: false,
			error: 'An unexpected error occurred',
			details: error instanceof Error ? error.message : 'Unknown error',
		}
	}
}
