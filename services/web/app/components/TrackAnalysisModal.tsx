import { useState } from 'react'

import {
	BarChart3,
	Brain,
	Calendar,
	Globe,
	Heart,
	MessageSquare,
	Music,
	Palette,
	Sparkles,
	Target,
	Users,
	Zap,
} from 'lucide-react'

import type {
	SongAnalysis,
	SongContext,
	SongEmotional,
	SongInterpretation,
	SongMatchingProfile,
	SongMusicalStyle,
	SongTheme,
} from '~/lib/services/analysis/analysis-types'
import { isSongAnalysis } from '~/lib/services/analysis/analysis-types'
import { Card, CardContent, CardHeader, CardTitle } from '~/shared/components/ui/Card'
import { Badge } from '~/shared/components/ui/badge'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '~/shared/components/ui/dialog'
import { ScrollArea } from '~/shared/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/shared/components/ui/tabs'

interface TrackAnalysisModalProps {
	trackName: string
	artistName: string
	analysis: any // Will be parsed to check format
	isOpen: boolean
	onOpenChange: (open: boolean) => void
}

const TrackAnalysisModal = ({
	trackName,
	artistName,
	analysis,
	isOpen,
	onOpenChange,
}: TrackAnalysisModalProps) => {
	const [activeTab, setActiveTab] = useState('meaning')

	// Parse the analysis if it's the new format
	const songAnalysis: SongAnalysis | null = isSongAnalysis(analysis) ? analysis : null

	const renderThemes = () => {
		if (!songAnalysis?.meaning?.themes) return null

		return (
			<div className="space-y-4">
				<div className="grid gap-4">
					{songAnalysis.meaning.themes.map((theme, index) => {
						const isHighConfidence = theme.confidence > 0.8

						return (
							<Card
								key={index}
								className={`border transition-all duration-300 ${
									isHighConfidence ?
										'border-blue-500/30 bg-gradient-to-r from-blue-500/5 to-purple-500/5 hover:border-blue-500/50'
									:	'bg-card border-border hover:border-green-500/50'
								}`}
							>
								<CardHeader className="pb-3">
									<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
										<div className="flex-1">
											<CardTitle className="text-foreground mb-2 text-xl font-bold break-words">
												{theme.name}
											</CardTitle>
											<div className="flex items-center gap-2">
												<div className="bg-secondary h-2 max-w-[200px] flex-1 rounded-full">
													<div
														className={`h-2 rounded-full transition-all ${
															isHighConfidence ?
																'bg-gradient-to-r from-blue-500 to-purple-500'
															:	'bg-green-500'
														}`}
														style={{ width: `${theme.confidence * 100}%` }}
													/>
												</div>
												<span className="text-muted-foreground text-sm">
													{Math.round(theme.confidence * 100)}% confident
												</span>
											</div>
										</div>
									</div>
								</CardHeader>
								<CardContent className="pt-2">
									<p className="text-foreground/90 text-sm leading-relaxed">
										{theme.description}
									</p>
								</CardContent>
							</Card>
						)
					})}
				</div>
			</div>
		)
	}

	const renderInterpretation = () => {
		if (!songAnalysis?.meaning?.interpretation) return null
		const interp = songAnalysis.meaning.interpretation

		return (
			<div className="space-y-4">
				<Card className="bg-card border-border">
					<CardHeader className="border-border border-b pb-3">
						<CardTitle className="text-foreground flex items-center gap-2 text-lg">
							<div className="rounded-lg bg-blue-600/20 p-2">
								<Brain className="h-4 w-4 text-blue-400" />
							</div>
							Song Interpretation
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4 pt-4">
						<div>
							<h4 className="text-muted-foreground mb-2 text-sm font-medium">
								Surface Meaning
							</h4>
							<p className="text-foreground bg-card-foreground/5 rounded-lg p-3 text-sm leading-relaxed break-words">
								{interp.surface_meaning}
							</p>
						</div>
						<div>
							<h4 className="text-muted-foreground mb-2 text-sm font-medium">
								Deeper Meaning
							</h4>
							<p className="text-foreground bg-card-foreground/5 rounded-lg p-3 text-sm leading-relaxed break-words">
								{interp.deeper_meaning}
							</p>
						</div>
						{interp.cultural_significance && (
							<div className="rounded-lg border border-purple-500/20 bg-purple-600/10 p-4">
								<h4 className="mb-2 text-sm font-medium text-purple-400">
									Cultural Significance
								</h4>
								<p className="text-foreground text-sm leading-relaxed break-words">
									{interp.cultural_significance}
								</p>
							</div>
						)}

						{interp.metaphors && interp.metaphors.length > 0 && (
							<div>
								<h4 className="text-muted-foreground mb-3 flex items-center gap-2 text-sm font-medium">
									<Sparkles className="h-4 w-4 text-yellow-500" />
									Key Metaphors
								</h4>
								<div className="space-y-3">
									{interp.metaphors.map((metaphor, idx) => (
										<div key={idx} className="group relative">
											<div className="absolute top-0 bottom-0 left-0 w-1 rounded-full bg-gradient-to-b from-yellow-500 to-orange-500" />
											<div className="space-y-1 pl-4">
												<p className="text-foreground text-sm font-medium italic">
													"{metaphor.text}"
												</p>
												<p className="text-muted-foreground border-muted-foreground/30 border-l-2 border-dotted pl-2 text-sm">
													{metaphor.meaning}
												</p>
											</div>
										</div>
									))}
								</div>
							</div>
						)}

						{interp.key_lines && interp.key_lines.length > 0 && (
							<div>
								<h4 className="text-muted-foreground mb-3 flex items-center gap-2 text-sm font-medium">
									<MessageSquare className="h-4 w-4 text-blue-500" />
									Most Impactful Lines
								</h4>
								<div className="space-y-3">
									{interp.key_lines.map((keyLine, idx) => (
										<div
											key={idx}
											className="rounded-lg border border-blue-500/20 bg-gradient-to-r from-blue-500/10 to-purple-500/10 p-4"
										>
											<p className="text-foreground mb-2 text-base leading-relaxed font-semibold">
												"{keyLine.line}"
											</p>
											<p className="text-foreground/80 border-l-2 border-blue-500/30 pl-4 text-sm italic">
												{keyLine.significance}
											</p>
										</div>
									))}
								</div>
							</div>
						)}
					</CardContent>
				</Card>
			</div>
		)
	}

	const renderEmotional = () => {
		if (!songAnalysis?.emotional) return null
		const emotional = songAnalysis.emotional

		return (
			<div className="space-y-4">
				{/* Main Emotional Profile */}
				<Card className="bg-card border-border">
					<CardHeader className="border-border border-b pb-3">
						<CardTitle className="text-foreground flex items-center gap-2 text-lg">
							<div className="rounded-lg bg-pink-600/20 p-2">
								<Heart className="h-4 w-4 text-pink-400" />
							</div>
							Emotional Profile
						</CardTitle>
					</CardHeader>
					<CardContent className="pt-4">
						<div className="space-y-4">
							<div className="rounded-lg border border-pink-500/20 bg-gradient-to-r from-pink-500/10 to-purple-500/10 p-4">
								<h3 className="text-foreground mb-2 text-xl font-bold capitalize">
									{emotional.dominant_mood}
								</h3>
								<p className="text-foreground/90 text-sm leading-relaxed italic">
									{emotional.mood_description}
								</p>
							</div>

							<div className="grid grid-cols-3 gap-4">
								<div>
									<h4 className="text-muted-foreground mb-2 text-xs font-medium">
										Intensity
									</h4>
									<div className="space-y-2">
										<div className="flex justify-between text-sm">
											<span>{Math.round(emotional.intensity * 100)}%</span>
										</div>
										<div className="bg-secondary h-2 w-full rounded-full">
											<div
												className="h-2 rounded-full bg-pink-500"
												style={{ width: `${emotional.intensity * 100}%` }}
											/>
										</div>
									</div>
								</div>

								<div>
									<h4 className="text-muted-foreground mb-2 text-xs font-medium">
										Valence
									</h4>
									<div className="space-y-2">
										<div className="flex justify-between text-sm">
											<span>{Math.round(emotional.valence * 100)}%</span>
										</div>
										<div className="bg-secondary h-2 w-full rounded-full">
											<div
												className="h-2 rounded-full bg-blue-500"
												style={{ width: `${emotional.valence * 100}%` }}
											/>
										</div>
									</div>
								</div>

								<div>
									<h4 className="text-muted-foreground mb-2 text-xs font-medium">
										Energy
									</h4>
									<div className="space-y-2">
										<div className="flex justify-between text-sm">
											<span>{Math.round(emotional.energy * 100)}%</span>
										</div>
										<div className="bg-secondary h-2 w-full rounded-full">
											<div
												className="h-2 rounded-full bg-orange-500"
												style={{ width: `${emotional.energy * 100}%` }}
											/>
										</div>
									</div>
								</div>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Emotional Journey Timeline */}
				{emotional.journey && emotional.journey.length > 0 && (
					<Card className="bg-card border-border overflow-hidden">
						<CardHeader className="border-border border-b bg-gradient-to-r from-pink-500/5 to-purple-500/5 pb-3">
							<CardTitle className="text-foreground flex items-center gap-2 text-lg">
								<div className="rounded-lg bg-purple-600/20 p-2">
									<Music className="h-4 w-4 text-purple-400" />
								</div>
								Emotional Journey Through The Song
							</CardTitle>
						</CardHeader>
						<CardContent className="pt-4">
							<div className="relative">
								{/* Timeline line */}
								<div className="absolute top-0 bottom-0 left-8 w-0.5 bg-gradient-to-b from-pink-500/50 via-purple-500/50 to-blue-500/50" />

								<div className="space-y-6">
									{emotional.journey.map((section, idx) => (
										<div key={idx} className="relative flex items-start gap-4">
											{/* Timeline dot */}
											<div className="relative z-10 w-16 flex-shrink-0">
												<div className="border-background h-4 w-4 rounded-full border-2 bg-gradient-to-r from-pink-500 to-purple-500" />
											</div>

											{/* Content */}
											<div className="-mt-1 flex-1">
												<div className="rounded-lg bg-gradient-to-r from-pink-500/5 to-transparent p-4">
													<div className="mb-2 flex items-center gap-2">
														<Badge className="border-pink-500/30 bg-pink-600/20 text-pink-400">
															{section.section}
														</Badge>
														<span className="text-foreground text-sm font-semibold capitalize">
															{section.mood}
														</span>
													</div>
													<p className="text-foreground/80 text-sm leading-relaxed">
														{section.description}
													</p>
												</div>
											</div>
										</div>
									))}
								</div>
							</div>
						</CardContent>
					</Card>
				)}

				{/* Emotional Peaks */}
				{emotional.emotional_peaks && emotional.emotional_peaks.length > 0 && (
					<Card className="bg-card border-border">
						<CardHeader className="border-border border-b pb-3">
							<CardTitle className="text-foreground flex items-center gap-2 text-lg">
								<div className="rounded-lg bg-red-600/20 p-2">
									<Zap className="h-4 w-4 text-red-400" />
								</div>
								Emotional Peaks
							</CardTitle>
						</CardHeader>
						<CardContent className="pt-4">
							<div className="flex flex-wrap gap-2">
								{emotional.emotional_peaks.map((peak, idx) => (
									<Badge
										key={idx}
										variant="secondary"
										className="text-foreground border-red-500/30 bg-red-600/20"
									>
										{peak}
									</Badge>
								))}
							</div>
						</CardContent>
					</Card>
				)}
			</div>
		)
	}

	const renderContext = () => {
		if (!songAnalysis?.context) return null
		const context = songAnalysis.context

		return (
			<div className="space-y-4">
				<Card className="bg-card border-border">
					<CardHeader className="border-border border-b pb-3">
						<CardTitle className="text-foreground flex items-center gap-2 text-lg">
							<div className="rounded-lg bg-yellow-600/20 p-2">
								<BarChart3 className="h-4 w-4 text-yellow-400" />
							</div>
							Listening Contexts
						</CardTitle>
					</CardHeader>
					<CardContent className="pt-4">
						<div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
							{Object.entries(context.listening_contexts)
								.sort(([, a], [, b]) => b - a) // Sort by score descending
								.map(([activity, score]) => {
									const getActivityIcon = (activity: string) => {
										const icons: Record<string, string> = {
											workout: '💪',
											party: '🎉',
											relaxation: '😌',
											focus: '🎯',
											driving: '🚗',
											emotional_release: '💔',
											cooking: '🍳',
											social_gathering: '👥',
											morning_routine: '☀️',
											late_night: '🌙',
											romance: '💕',
											meditation: '🧘',
										}
										return icons[activity] || '🎵'
									}

									return (
										<div key={activity} className="group relative">
											<div className="border-border bg-card hover:bg-card-foreground/5 rounded-lg border p-3 transition-all hover:border-green-500/50">
												<div className="mb-2 flex items-center gap-2">
													<span className="text-lg">{getActivityIcon(activity)}</span>
													<span className="text-xs font-medium capitalize">
														{activity.replaceAll('_', ' ')}
													</span>
												</div>
												<div className="space-y-1">
													<div className="flex justify-between text-xs">
														<span
															className={`font-semibold ${
																score > 0.7 ? 'text-green-500'
																: score > 0.4 ? 'text-yellow-500'
																: 'text-red-500'
															}`}
														>
															{Math.round(score * 100)}%
														</span>
													</div>
													<div className="bg-secondary h-1.5 w-full rounded-full">
														<div
															className={`h-1.5 rounded-full transition-all ${
																score > 0.7 ? 'bg-green-500'
																: score > 0.4 ? 'bg-yellow-500'
																: 'bg-red-500'
															}`}
															style={{ width: `${score * 100}%` }}
														/>
													</div>
												</div>
											</div>
										</div>
									)
								})}
						</div>
					</CardContent>
				</Card>

				{context.best_moments && context.best_moments.length > 0 && (
					<Card className="border-green-500/20 bg-gradient-to-br from-green-500/5 to-blue-500/5">
						<CardHeader className="border-b border-green-500/20 pb-3">
							<CardTitle className="text-foreground flex items-center gap-2 text-lg">
								<div className="rounded-lg bg-green-600/20 p-2">
									<Sparkles className="h-4 w-4 text-green-400" />
								</div>
								Perfect Moments For This Song
							</CardTitle>
						</CardHeader>
						<CardContent className="pt-4">
							<div className="grid gap-2">
								{context.best_moments.map((moment, idx) => (
									<div
										key={idx}
										className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-green-500/10"
									>
										<div className="h-2 w-2 flex-shrink-0 rounded-full bg-green-500" />
										<span className="text-foreground/90 text-sm leading-relaxed">
											{moment}
										</span>
									</div>
								))}
							</div>
						</CardContent>
					</Card>
				)}

				{context.audience && (
					<Card className="bg-card border-border">
						<CardHeader className="border-border border-b pb-3">
							<CardTitle className="text-foreground flex items-center gap-2 text-lg">
								<div className="rounded-lg bg-blue-600/20 p-2">
									<Users className="h-4 w-4 text-blue-400" />
								</div>
								Target Audience
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3 pt-4">
							{context.audience.primary_demographic && (
								<div>
									<h4 className="text-muted-foreground mb-1 text-sm font-medium">
										Primary Demographic
									</h4>
									<p className="text-foreground text-sm">
										{context.audience.primary_demographic}
									</p>
								</div>
							)}
							{context.audience.universal_appeal != null && (
								<div>
									<h4 className="text-muted-foreground mb-2 text-sm font-medium">
										Universal Appeal
									</h4>
									<div className="flex items-center gap-2">
										<div className="bg-secondary h-2 flex-1 rounded-full">
											<div
												className="h-2 rounded-full bg-blue-500"
												style={{ width: `${context.audience.universal_appeal * 100}%` }}
											/>
										</div>
										<span className="text-muted-foreground shrink-0 text-sm">
											{Math.round(context.audience.universal_appeal * 100)}%
										</span>
									</div>
								</div>
							)}
							{context.audience.resonates_with &&
								context.audience.resonates_with.length > 0 && (
									<div className="mt-3">
										<h4 className="text-muted-foreground mb-2 text-sm font-medium">
											Resonates With
										</h4>
										<div className="flex flex-wrap gap-2">
											{context.audience.resonates_with.map((group, idx) => (
												<Badge key={idx} variant="outline" className="text-foreground">
													{group}
												</Badge>
											))}
										</div>
									</div>
								)}
						</CardContent>
					</Card>
				)}
			</div>
		)
	}

	const renderAudioFeatures = () => {
		if (!songAnalysis?.audio_features) return null
		const features = songAnalysis.audio_features

		return (
			<Card className="bg-card border-border">
				<CardHeader className="border-border border-b pb-3">
					<CardTitle className="text-foreground flex items-center gap-2 text-lg">
						<div className="rounded-lg bg-purple-600/20 p-2">
							<BarChart3 className="h-4 w-4 text-purple-400" />
						</div>
						Audio Features
					</CardTitle>
				</CardHeader>
				<CardContent className="pt-4">
					<div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
						<div className="space-y-1">
							<div className="text-muted-foreground text-xs font-medium">Tempo</div>
							<div className="text-foreground text-lg font-bold">
								{Math.round(features.tempo)} BPM
							</div>
						</div>
						<div className="space-y-1">
							<div className="text-muted-foreground text-xs font-medium">Energy</div>
							<div className="flex items-center gap-2">
								<div className="bg-secondary h-2 flex-1 rounded-full">
									<div
										className="h-2 rounded-full bg-orange-500"
										style={{ width: `${features.energy * 100}%` }}
									/>
								</div>
								<span className="text-muted-foreground text-sm">
									{Math.round(features.energy * 100)}%
								</span>
							</div>
						</div>
						<div className="space-y-1">
							<div className="text-muted-foreground text-xs font-medium">Valence</div>
							<div className="flex items-center gap-2">
								<div className="bg-secondary h-2 flex-1 rounded-full">
									<div
										className="h-2 rounded-full bg-blue-500"
										style={{ width: `${features.valence * 100}%` }}
									/>
								</div>
								<span className="text-muted-foreground text-sm">
									{Math.round(features.valence * 100)}%
								</span>
							</div>
						</div>
						<div className="space-y-1">
							<div className="text-muted-foreground text-xs font-medium">
								Danceability
							</div>
							<div className="flex items-center gap-2">
								<div className="bg-secondary h-2 flex-1 rounded-full">
									<div
										className="h-2 rounded-full bg-pink-500"
										style={{ width: `${features.danceability * 100}%` }}
									/>
								</div>
								<span className="text-muted-foreground text-sm">
									{Math.round(features.danceability * 100)}%
								</span>
							</div>
						</div>
						<div className="space-y-1">
							<div className="text-muted-foreground text-xs font-medium">
								Acousticness
							</div>
							<div className="flex items-center gap-2">
								<div className="bg-secondary h-2 flex-1 rounded-full">
									<div
										className="h-2 rounded-full bg-green-500"
										style={{ width: `${features.acousticness * 100}%` }}
									/>
								</div>
								<span className="text-muted-foreground text-sm">
									{Math.round(features.acousticness * 100)}%
								</span>
							</div>
						</div>
						<div className="space-y-1">
							<div className="text-muted-foreground text-xs font-medium">Loudness</div>
							<div className="text-foreground text-lg font-bold">
								{features.loudness.toFixed(1)} dB
							</div>
						</div>
					</div>
				</CardContent>
			</Card>
		)
	}

	const renderMusicalStyle = () => {
		if (!songAnalysis?.musical_style) return null
		const style = songAnalysis.musical_style

		return (
			<Card className="bg-card border-border">
				<CardHeader className="border-border border-b pb-3">
					<CardTitle className="text-foreground flex items-center gap-2 text-lg">
						<div className="rounded-lg bg-green-600/20 p-2">
							<Palette className="h-4 w-4 text-green-400" />
						</div>
						Musical Style
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4 pt-4">
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<div>
							<h4 className="text-muted-foreground mb-2 text-sm font-medium">
								Primary Genre
							</h4>
							<Badge variant="secondary" className="max-w-full break-words capitalize">
								{style.genre_primary}
							</Badge>
						</div>
						{style.genre_secondary && (
							<div>
								<h4 className="text-muted-foreground mb-2 text-sm font-medium">
									Secondary Genre
								</h4>
								<Badge variant="secondary" className="max-w-full break-words capitalize">
									{style.genre_secondary}
								</Badge>
							</div>
						)}
					</div>
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<div>
							<h4 className="text-muted-foreground mb-2 text-sm font-medium">
								Vocal Style
							</h4>
							<Badge variant="outline" className="capitalize">
								{style.vocal_style}
							</Badge>
						</div>
						<div>
							<h4 className="text-muted-foreground mb-2 text-sm font-medium">
								Production
							</h4>
							<Badge variant="outline" className="capitalize">
								{style.production_style}
							</Badge>
						</div>
					</div>
					{style.sonic_texture && (
						<div className="mt-4">
							<h4 className="text-muted-foreground mb-2 flex items-center gap-2 text-sm font-medium">
								<Music className="h-4 w-4 text-green-500" />
								Sonic Texture
							</h4>
							<p className="text-foreground rounded-lg border border-green-500/20 bg-gradient-to-r from-green-500/10 to-transparent p-4 text-sm italic">
								{style.sonic_texture}
							</p>
						</div>
					)}
					{style.distinctive_elements && style.distinctive_elements.length > 0 && (
						<div className="mt-4">
							<h4 className="text-muted-foreground mb-2 text-sm font-medium">
								Distinctive Elements
							</h4>
							<div className="flex flex-wrap gap-2">
								{style.distinctive_elements.map((element, idx) => (
									<Badge
										key={idx}
										variant="secondary"
										className="text-foreground border-green-500/30 bg-green-600/20"
									>
										{element}
									</Badge>
								))}
							</div>
						</div>
					)}
				</CardContent>
			</Card>
		)
	}

	const renderMatchingProfile = () => {
		if (!songAnalysis?.matching_profile) return null
		const profile = songAnalysis.matching_profile

		return (
			<Card className="bg-card border-border">
				<CardHeader className="border-border border-b pb-3">
					<CardTitle className="text-foreground flex items-center gap-2 text-lg">
						<div className="rounded-lg bg-orange-600/20 p-2">
							<Target className="h-4 w-4 text-orange-400" />
						</div>
						Matching Profile
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4 pt-4">
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
						{[
							{
								key: 'mood_consistency',
								label: 'Mood Consistency',
								bgClass: 'bg-blue-500',
							},
							{
								key: 'energy_flexibility',
								label: 'Energy Flexibility',
								bgClass: 'bg-pink-500',
							},
							{
								key: 'theme_cohesion',
								label: 'Theme Cohesion',
								bgClass: 'bg-purple-500',
							},
							{
								key: 'sonic_similarity',
								label: 'Sonic Similarity',
								bgClass: 'bg-green-500',
							},
						].map(({ key, label, bgClass }) => (
							<div key={key} className="space-y-2">
								<div className="flex justify-between text-sm">
									<span className="mr-2 truncate font-medium">{label}</span>
									<span className="text-muted-foreground shrink-0">
										{Math.round((profile[key as keyof typeof profile] as number) * 100)}%
									</span>
								</div>
								<div className="bg-secondary h-2 w-full rounded-full">
									<div
										className={`${bgClass} h-2 rounded-full`}
										style={{
											width: `${(profile[key as keyof typeof profile] as number) * 100}%`,
										}}
									/>
								</div>
							</div>
						))}
					</div>
				</CardContent>
			</Card>
		)
	}

	const renderContent = () => {
		if (!analysis || !songAnalysis) {
			return (
				<div className="flex h-full items-center justify-center">
					<p className="text-muted-foreground">No analysis available for this track.</p>
				</div>
			)
		}

		return (
			<Tabs
				value={activeTab}
				onValueChange={setActiveTab}
				className="flex h-full w-full flex-col"
			>
				<div className="border-border shrink-0 border-b px-6">
					<TabsList className="h-auto w-full flex-wrap justify-start overflow-x-auto rounded-none bg-transparent px-0 py-2">
						<TabsTrigger
							value="meaning"
							className="data-[state=active]:text-foreground text-muted-foreground hover:text-foreground rounded-none border-b-2 border-transparent px-3 py-2 text-xs whitespace-nowrap transition-colors data-[state=active]:border-b-2 data-[state=active]:border-green-500 data-[state=active]:bg-transparent md:px-4 md:text-sm"
						>
							Themes & Meaning
						</TabsTrigger>
						<TabsTrigger
							value="emotional"
							className="data-[state=active]:text-foreground text-muted-foreground hover:text-foreground rounded-none border-b-2 border-transparent px-3 py-2 text-xs whitespace-nowrap transition-colors data-[state=active]:border-b-2 data-[state=active]:border-green-500 data-[state=active]:bg-transparent md:px-4 md:text-sm"
						>
							Emotional
						</TabsTrigger>
						<TabsTrigger
							value="context"
							className="data-[state=active]:text-foreground text-muted-foreground hover:text-foreground rounded-none border-b-2 border-transparent px-3 py-2 text-xs whitespace-nowrap transition-colors data-[state=active]:border-b-2 data-[state=active]:border-green-500 data-[state=active]:bg-transparent md:px-4 md:text-sm"
						>
							Context
						</TabsTrigger>
						<TabsTrigger
							value="style"
							className="data-[state=active]:text-foreground text-muted-foreground hover:text-foreground rounded-none border-b-2 border-transparent px-3 py-2 text-xs whitespace-nowrap transition-colors data-[state=active]:border-b-2 data-[state=active]:border-green-500 data-[state=active]:bg-transparent md:px-4 md:text-sm"
						>
							Style & Matching
						</TabsTrigger>
					</TabsList>
				</div>

				<div className="min-h-0 flex-1 overflow-hidden">
					<div className="h-full">
						<TabsContent
							value="meaning"
							className="m-0 h-full data-[state=inactive]:hidden"
						>
							<ScrollArea className="h-full px-6 py-4">
								<div className="space-y-4 pb-4">
									{renderThemes()}
									{renderInterpretation()}
								</div>
							</ScrollArea>
						</TabsContent>

						<TabsContent
							value="emotional"
							className="m-0 h-full data-[state=inactive]:hidden"
						>
							<ScrollArea className="h-full px-6 py-4">
								<div className="pb-4">{renderEmotional()}</div>
							</ScrollArea>
						</TabsContent>

						<TabsContent
							value="context"
							className="m-0 h-full data-[state=inactive]:hidden"
						>
							<ScrollArea className="h-full px-6 py-4">
								<div className="pb-4">{renderContext()}</div>
							</ScrollArea>
						</TabsContent>

						<TabsContent
							value="style"
							className="m-0 h-full data-[state=inactive]:hidden"
						>
							<ScrollArea className="h-full px-6 py-4">
								<div className="space-y-4 pb-4">
									{renderAudioFeatures()}
									{renderMusicalStyle()}
									{renderMatchingProfile()}
								</div>
							</ScrollArea>
						</TabsContent>
					</div>
				</div>
			</Tabs>
		)
	}

	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent className="bg-card border-border flex h-[85vh] max-w-[95vw] flex-col gap-0 overflow-hidden p-0 md:max-w-4xl lg:max-w-5xl">
				<DialogHeader className="border-border from-card to-card-foreground/5 shrink-0 border-b bg-gradient-to-r px-6 py-4">
					<div className="space-y-3">
						<div>
							<DialogTitle className="text-foreground pr-8 text-xl font-bold break-words md:text-2xl">
								{trackName}
							</DialogTitle>
							<DialogDescription className="text-muted-foreground text-sm break-words md:text-base">
								{artistName}
							</DialogDescription>
						</div>

						{songAnalysis && (
							<div className="flex items-center gap-4 pt-2">
								<div className="flex items-center gap-2">
									<div
										className={`h-3 w-3 rounded-full bg-gradient-to-r ${
											songAnalysis.emotional.valence > 0.6 ? 'from-green-500 to-blue-500'
											: songAnalysis.emotional.valence > 0.3 ?
												'from-yellow-500 to-orange-500'
											:	'from-red-500 to-purple-500'
										}`}
									/>
									<span className="text-muted-foreground text-xs capitalize">
										{songAnalysis.emotional.dominant_mood}
									</span>
								</div>
								<div className="flex items-center gap-2">
									<Zap
										className={`h-3 w-3 ${
											songAnalysis.emotional.energy > 0.7 ? 'text-orange-500'
											: songAnalysis.emotional.energy > 0.4 ? 'text-yellow-500'
											: 'text-blue-500'
										}`}
									/>
									<span className="text-muted-foreground text-xs">
										{songAnalysis.emotional.energy > 0.7 ?
											'High'
										: songAnalysis.emotional.energy > 0.4 ?
											'Medium'
										:	'Low'}{' '}
										Energy
									</span>
								</div>
							</div>
						)}
					</div>
				</DialogHeader>

				<div className="min-h-0 flex-1 overflow-hidden">{renderContent()}</div>
			</DialogContent>
		</Dialog>
	)
}

export default TrackAnalysisModal
