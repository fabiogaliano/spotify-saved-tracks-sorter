/**
 * useEstimation Hook
 *
 * Encapsulates all data fetching and estimation logic.
 * Provides reactive state for library stats, measurements, and cost projections.
 */

import { useState, useEffect, useCallback } from 'react'
import { getSupabase } from '~/lib/services/DatabaseService'
import type { TabType } from '../components/TabBar'
import type { LibraryStats } from '../components/StatsPanel'
import type { Measurements, VectorizationMeasurements, LlmMeasurements } from '../components/MeasurementsPanel'
import type { CostProjection, LlmModelCost } from '../components/CostTable'
import type { Provider, ScaleComparison, ScaleCost } from '../../types'
import {
	loadManifest,
	getCachedLyrics,
	saveLyricsToCache,
	markAsFailed,
} from '../../lib/lyrics-cache'
import { DefaultLyricsService } from '~/lib/services/lyrics/LyricsService'
import { buildAnalysisPrompt } from '~/lib/services/analysis/SongAnalysisService'
import type { ReccoBeatsAudioFeatures } from '~/lib/services/reccobeats/ReccoBeatsService'

// Hardcoded audio features for estimation (like test-song-analysis.ts)
// ~500 chars when formatted, representative of typical audio features
const HARDCODED_AUDIO_FEATURES: ReccoBeatsAudioFeatures = {
	id: 'estimation-placeholder',
	tempo: 120,
	energy: 0.7,
	valence: 0.6,
	danceability: 0.75,
	acousticness: 0.2,
	instrumentalness: 0.0,
	liveness: 0.15,
	speechiness: 0.05,
	loudness: -5.5,
}

interface ProgressState {
	current: number
	total: number
	detail?: string
}

export interface EstimationParams {
	activeTab: TabType
	provider: Provider | null
	comparisonProviders: Provider[]
	sampleSize: number
}

// Fixed projection scales (shown in projections table)
const PROJECTION_SCALES = [
	100,
	500,
	1_000,
	2_500,
	5_000,
	10_000,
	25_000,
	50_000,
	100_000,
	250_000,
	500_000,
	1_000_000,
	2_500_000,
]

interface UseEstimationResult {
	stats: LibraryStats
	measurements: Measurements | null
	projections: CostProjection[]
	modelCosts: LlmModelCost[]
	scaleComparisons: ScaleComparison[]
	isLoading: boolean
	progress: ProgressState | null
	error: string | null
	runEstimation: () => void
	refresh: () => void
}

export function useEstimation(params: EstimationParams): UseEstimationResult {
	const { activeTab, provider, comparisonProviders, sampleSize } = params

	const [stats, setStats] = useState<LibraryStats>({ total: 0, analyzed: 0, pending: 0 })
	const [measurements, setMeasurements] = useState<Measurements | null>(null)
	const [projections, setProjections] = useState<CostProjection[]>([])
	const [modelCosts, setModelCosts] = useState<LlmModelCost[]>([])
	const [scaleComparisons, setScaleComparisons] = useState<ScaleComparison[]>([])
	const [isLoading, setIsLoading] = useState(false)
	const [progress, setProgress] = useState<ProgressState | null>(null)
	const [error, setError] = useState<string | null>(null)
	const [refreshKey, setRefreshKey] = useState(0)
	const [shouldRun, setShouldRun] = useState(false)

	const refresh = useCallback(() => {
		setRefreshKey((k: number) => k + 1)
	}, [])

	const runEstimation = useCallback(() => {
		setShouldRun(true)
	}, [])

	// Fetch library stats on mount
	useEffect(() => {
		async function fetchStats() {
			try {
				const supabase = getSupabase()
				const [totalResult, analyzedResult] = await Promise.all([
					supabase.from('tracks').select('*', { count: 'exact', head: true }),
					supabase.from('track_analyses').select('*', { count: 'exact', head: true }),
				])

				// Check for Supabase errors
				if (totalResult.error) {
					throw new Error(`Tracks query failed: ${totalResult.error.message}`)
				}
				if (analyzedResult.error) {
					throw new Error(`Analyses query failed: ${analyzedResult.error.message}`)
				}

				const total = totalResult.count ?? 0
				const analyzed = analyzedResult.count ?? 0

				setStats({
					total,
					analyzed,
					pending: total - analyzed,
				})
			} catch (err) {
				setError(err instanceof Error ? err.message : 'Failed to fetch stats')
			}
		}

		fetchStats()
	}, [refreshKey])

	// Run estimation when triggered
	useEffect(() => {
		if (!shouldRun || !provider) return

		async function run() {
			setIsLoading(true)
			setError(null)
			setShouldRun(false)

			try {
				if (activeTab === 'vectorization') {
					await runVectorizationEstimation()
				} else {
					await runLlmEstimation()
				}
			} catch (err) {
				setError(err instanceof Error ? err.message : 'Estimation failed')
			} finally {
				setIsLoading(false)
				setProgress(null)
			}
		}

		async function runVectorizationEstimation() {
			const supabase = getSupabase()

			setProgress({ current: 0, total: sampleSize, detail: 'Fetching tracks...' })

			// Use random ordering for proper sampling
			// Supabase/Postgres: order by random() equivalent using a seeded approach
			const randomSeed = Math.random()
			const { data, error: fetchError } = await supabase
				.from('track_analyses')
				.select('analysis, model_name, tracks!inner (id, name, artist, album, spotify_track_id)')
				.order('id', { ascending: randomSeed > 0.5 })
				.limit(sampleSize)

			if (fetchError) throw new Error(fetchError.message)
			if (!data || data.length === 0) {
				throw new Error('No analyzed tracks found. Run LLM analysis first.')
			}

			// Measure text lengths
			let textLengths: number[] = []
			try {
				const { extractSongText, combineVectorizationText } = await import(
					'~/lib/services/vectorization/analysis-extractors'
				)

				for (let i = 0; i < data.length; i++) {
					const row = data[i] as any
					setProgress({
						current: i + 1,
						total: data.length,
						detail: `${row.tracks.artist} - ${row.tracks.name.slice(0, 20)}...`,
					})

					if (!row.analysis) continue

					try {
						const songData = {
							id: row.tracks.id,
							track: { title: row.tracks.name, artist: row.tracks.artist, album: row.tracks.album ?? '' },
							analysis: row.analysis,
						}
						const vectorText = extractSongText(songData as any)
						const combined = combineVectorizationText(vectorText)
						textLengths.push(combined.length)
					} catch {
						// Skip extraction errors
					}
				}
			} catch (importErr) {
				// Fallback: estimate from raw analysis JSON size
				textLengths = data.map((row: any) => {
					if (row.analysis) {
						// Use JSON stringified length as a rough estimate
						return JSON.stringify(row.analysis).length
					}
					return 8000 // Default fallback
				})
			}

			const avgTextLength = textLengths.reduce((s, l) => s + l, 0) / textLengths.length
			const avgTokens = Math.round(avgTextLength / 4)

			setMeasurements({
				type: 'vectorization',
				sampleSize: textLengths.length,
				avgTextLength: Math.round(avgTextLength),
				avgTokens,
			})

			// Build projections using selected provider
			const costPerTrack = calculateVectorizationCost(provider!, avgTokens)
			// Use fixed scales + full library, deduplicated and sorted
			const scales = [...PROJECTION_SCALES, stats.total]
				.filter((s, i, arr) => s > 0 && arr.indexOf(s) === i)
				.sort((a, b) => a - b)

			const newProjections: CostProjection[] = scales.map((scale) => {
				const cost = costPerTrack * scale
				const runtimeSecs = (provider!.avg_runtime_seconds ?? 1) * scale
				return {
					tracks: scale,
					cost,
					runtime: formatDuration(runtimeSecs),
					note: scale === stats.total ? '◀ YOUR LIBRARY' : undefined,
					isHighlighted: scale === stats.total,
				}
			})

			setProjections(newProjections)

			// Build comparison matrix only if 2+ comparison providers selected
			if (comparisonProviders.length >= 2) {
				const comparisons = buildScaleComparisons(
					comparisonProviders,
					scales,
					(p) => calculateVectorizationCost(p, avgTokens),
					stats.total
				)
				setScaleComparisons(comparisons)
			} else {
				setScaleComparisons([])
			}
		}

		async function runLlmEstimation() {
			const supabase = getSupabase()

			// Load cache manifest
			const manifest = loadManifest()

			setProgress({ current: 0, total: sampleSize, detail: 'Loading tracks...' })

			// Fetch ALL tracks from library (not just analyzed ones)
			const { data: allTracks, error: fetchError } = await supabase
				.from('tracks')
				.select('id, name, artist, spotify_track_id')
				.order('created_at', { ascending: false })

			if (fetchError) throw new Error(fetchError.message)
			if (!allTracks || allTracks.length === 0) {
				throw new Error('No tracks found in library.')
			}

			// Check if we have enough tracks
			if (allTracks.length < sampleSize) {
				throw new Error(`Only ${allTracks.length} tracks in library. Reduce sample size to ≤${allTracks.length}.`)
			}

			// Get average output size from existing analyses (for estimation)
			const { data: analysisData } = await supabase
				.from('track_analyses')
				.select('analysis')
				.limit(50)

			const avgOutputChars = analysisData && analysisData.length > 0
				? analysisData.reduce((sum, row) => sum + JSON.stringify(row.analysis).length, 0) / analysisData.length
				: 5000 // Fallback estimate if no analyses exist

			// Filter to valid tracks (have spotify_track_id, not failed)
			const validTracks = (allTracks as any[]).filter(t =>
				t.spotify_track_id && !manifest.failed.includes(t.spotify_track_id)
			)

			// Check how many are already cached
			const cachedTracks = validTracks.filter(t => getCachedLyrics(t.spotify_track_id) !== null)
			const uncachedTracks = validTracks.filter(t => getCachedLyrics(t.spotify_track_id) === null)
			const needToFetch = Math.max(0, sampleSize - cachedTracks.length)

			setProgress({
				current: 0,
				total: sampleSize,
				detail: `${cachedTracks.length} cached, need ${needToFetch} more`,
			})

			// Collect samples with full prompt calculation
			const collected: Array<{ promptLength: number; outputChars: number }> = []

			// FAST PATH: Use cached tracks first
			for (const track of cachedTracks) {
				if (collected.length >= sampleSize) break
				const lyrics = getCachedLyrics(track.spotify_track_id)!
				const fullPrompt = buildAnalysisPrompt(
					track.artist,
					track.name,
					lyrics,
					HARDCODED_AUDIO_FEATURES
				)
				collected.push({
					promptLength: fullPrompt.length,
					outputChars: avgOutputChars,
				})
			}

			// SLOW PATH: Fetch remaining if needed
			if (needToFetch > 0 && collected.length < sampleSize) {
				const geniusToken = process.env.GENIUS_CLIENT_TOKEN
				if (!geniusToken) {
					throw new Error('GENIUS_CLIENT_TOKEN not set in environment')
				}
				const lyricsService = new DefaultLyricsService({ accessToken: geniusToken })

				let fetchAttempts = 0
				let fetchSuccesses = 0
				let fetchFailures = 0

				for (const track of uncachedTracks) {
					if (collected.length >= sampleSize) break

					fetchAttempts++
					const trackName = `${track.artist} - ${track.name}`.slice(0, 35)
					setProgress({
						current: collected.length,
						total: sampleSize,
						detail: `[${fetchSuccesses}/${needToFetch}] ${trackName}`,
					})

					try {
						const lyrics = await lyricsService.getLyrics(track.artist, track.name)
						saveLyricsToCache(track.spotify_track_id, lyrics)

						const fullPrompt = buildAnalysisPrompt(
							track.artist,
							track.name,
							lyrics,
							HARDCODED_AUDIO_FEATURES
						)
						collected.push({
							promptLength: fullPrompt.length,
							outputChars: avgOutputChars,
						})
						fetchSuccesses++
					} catch (err) {
						fetchFailures++
						markAsFailed(track.spotify_track_id)
						// Continue to next track
					}
				}
			}

			if (collected.length === 0) {
				throw new Error(`No lyrics available. ${cachedTracks.length} cached, ${uncachedTracks.length} uncached tracks exist.`)
			}

			// Error if we couldn't get enough samples
			if (collected.length < sampleSize) {
				throw new Error(`Only got ${collected.length}/${sampleSize} samples. Need more tracks or fix failed fetches.`)
			}

			// Calculate actual input sizes from real prompts (output uses pre-calculated average)
			const avgInputChars = collected.reduce((s, m) => s + m.promptLength, 0) / collected.length
			const avgInputTokens = Math.round(avgInputChars / 4)
			const avgOutputTokens = Math.round(avgOutputChars / 4)

			setMeasurements({
				type: 'llm',
				sampleSize: collected.length,
				successRate: collected.length / sampleSize,
				avgPromptLength: Math.round(avgInputChars),
				avgInputTokens,
				avgOutputTokens,
			})

			// Build projections using selected provider
			const costPerTrack = calculateLlmCost(provider!, avgInputTokens, avgOutputTokens)
			// Use fixed scales + full library, deduplicated and sorted
			const scales = [...PROJECTION_SCALES, stats.total]
				.filter((s, i, arr) => s > 0 && arr.indexOf(s) === i)
				.sort((a, b) => a - b)

			const newProjections: CostProjection[] = scales.map((scale) => {
				const cost = costPerTrack * scale
				const runtimeSecs = (provider!.avg_runtime_seconds ?? 2) * scale
				return {
					tracks: scale,
					cost,
					runtime: formatDuration(runtimeSecs),
					note: scale === stats.total ? '◀ YOUR LIBRARY' : undefined,
					isHighlighted: scale === stats.total,
				}
			})

			setProjections(newProjections)

			// Build comparison matrix only if 2+ comparison providers selected
			if (comparisonProviders.length >= 2) {
				const comparisons = buildScaleComparisons(
					comparisonProviders,
					scales,
					(p) => calculateLlmCost(p, avgInputTokens, avgOutputTokens),
					stats.total
				)
				setScaleComparisons(comparisons)
			} else {
				setScaleComparisons([])
			}

			setModelCosts([])
		}

		run()
	}, [shouldRun, provider, comparisonProviders, activeTab, sampleSize, stats.total])

	return {
		stats,
		measurements,
		projections,
		modelCosts,
		scaleComparisons,
		isLoading,
		progress,
		error,
		runEstimation,
		refresh,
	}
}

function calculateVectorizationCost(provider: Provider, avgTokens: number): number {
	if (provider.cost_per_run) {
		return provider.cost_per_run
	}
	if (provider.cost_per_1m_tokens) {
		return (avgTokens / 1_000_000) * provider.cost_per_1m_tokens
	}
	return 0.001 // Default fallback
}

/** Build scale comparison matrix for multiple providers */
function buildScaleComparisons(
	providers: Provider[],
	scales: number[],
	costFn: (p: Provider) => number,
	libraryTotal: number
): ScaleComparison[] {
	return scales.map((trackCount) => ({
		tracks: trackCount,
		costs: providers.map((p) => {
			const costPerTrack = costFn(p)
			const totalCost = costPerTrack * trackCount
			const runtimeSecs = (p.avg_runtime_seconds ?? 1) * trackCount
			return {
				provider: p,
				cost: totalCost,
				runtime: formatDuration(runtimeSecs),
			}
		}),
		isHighlighted: trackCount === libraryTotal,
	}))
}

function calculateLlmCost(provider: Provider, inputTokens: number, outputTokens: number): number {
	const inputCost = provider.input_cost_per_1m_tokens ?? 0
	const outputCost = provider.output_cost_per_1m_tokens ?? 0
	return (inputTokens / 1_000_000) * inputCost + (outputTokens / 1_000_000) * outputCost
}

function formatDuration(seconds: number): string {
	if (seconds < 60) return `${Math.round(seconds)}s`
	if (seconds < 3600) return `${Math.round(seconds / 60)}m`
	return `${(seconds / 3600).toFixed(1)}h`
}
