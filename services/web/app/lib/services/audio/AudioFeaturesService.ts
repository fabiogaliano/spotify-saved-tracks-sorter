import {
	type ReccoBeatsAudioFeatures,
	ReccoBeatsService,
} from '~/lib/services/reccobeats/ReccoBeatsService'

type TrackInfo = {
	trackId: number
	spotifyTrackId: string
}

export class AudioFeaturesService {
	constructor(private readonly reccoBeatsService: ReccoBeatsService) {}

	async fetchFeatures(
		trackId: number,
		spotifyTrackId: string
	): Promise<ReccoBeatsAudioFeatures | null> {
		const result = await this.fetchFeaturesBatch([{ trackId, spotifyTrackId }])
		return result.get(trackId) ?? null
	}

	async fetchFeaturesBatch(
		tracks: TrackInfo[]
	): Promise<Map<number, ReccoBeatsAudioFeatures>> {
		const results = new Map<number, ReccoBeatsAudioFeatures>()
		if (tracks.length === 0) return results

		try {
			const spotifyIds = tracks.map(t => t.spotifyTrackId)
			const fetchedFeatures =
				await this.reccoBeatsService.getAudioFeaturesBatch(spotifyIds)

			for (const track of tracks) {
				const features = fetchedFeatures.get(track.spotifyTrackId)
				if (features) {
					results.set(track.trackId, features)
				}
			}

			return results
		} catch (error) {
			return results
		}
	}
}
