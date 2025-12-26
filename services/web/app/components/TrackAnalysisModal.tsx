import { useState } from 'react'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '~/shared/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '~/shared/components/ui/Card'
import { ScrollArea } from '~/shared/components/ui/scroll-area'
import { Badge } from '~/shared/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/shared/components/ui/tabs'
import {
  Brain,
  Globe,
  Heart,
  Music,
  Palette,
  Target,
  Sparkles,
  MessageSquare,
  Calendar,
  Users,
  Zap,
  BarChart3
} from 'lucide-react'
import type { 
  SongAnalysis, 
  SongTheme, 
  SongInterpretation, 
  SongEmotional, 
  SongContext,
  SongMusicalStyle,
  SongMatchingProfile 
} from '~/lib/services/analysis/analysis-types'
import { isSongAnalysis } from '~/lib/services/analysis/analysis-types'

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
                  isHighConfidence 
                    ? 'bg-gradient-to-r from-blue-500/5 to-purple-500/5 border-blue-500/30 hover:border-blue-500/50' 
                    : 'bg-card border-border hover:border-green-500/50'
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                    <div className="flex-1">
                      <CardTitle className="text-xl font-bold text-foreground break-words mb-2">
                        {theme.name}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-secondary rounded-full h-2 max-w-[200px]">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              isHighConfidence ? 'bg-gradient-to-r from-blue-500 to-purple-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${theme.confidence * 100}%` }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {Math.round(theme.confidence * 100)}% confident
                        </span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-2">
                  <p className="text-sm text-foreground/90 leading-relaxed">
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
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-lg flex items-center gap-2 text-foreground">
              <div className="bg-blue-600/20 p-2 rounded-lg">
                <Brain className="w-4 h-4 text-blue-400" />
              </div>
              Song Interpretation
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Surface Meaning</h4>
              <p className="text-sm text-foreground bg-card-foreground/5 p-3 rounded-lg leading-relaxed break-words">
                {interp.surface_meaning}
              </p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Deeper Meaning</h4>
              <p className="text-sm text-foreground bg-card-foreground/5 p-3 rounded-lg leading-relaxed break-words">
                {interp.deeper_meaning}
              </p>
            </div>
            {interp.cultural_significance && (
              <div className="bg-purple-600/10 p-4 rounded-lg border border-purple-500/20">
                <h4 className="text-sm font-medium text-purple-400 mb-2">Cultural Significance</h4>
                <p className="text-sm text-foreground leading-relaxed break-words">{interp.cultural_significance}</p>
              </div>
            )}
            
            {interp.metaphors && interp.metaphors.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-yellow-500" />
                  Key Metaphors
                </h4>
                <div className="space-y-3">
                  {interp.metaphors.map((metaphor, idx) => (
                    <div key={idx} className="relative group">
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-yellow-500 to-orange-500 rounded-full" />
                      <div className="pl-4 space-y-1">
                        <p className="text-sm text-foreground font-medium italic">"{metaphor.text}"</p>
                        <p className="text-sm text-muted-foreground pl-2 border-l-2 border-dotted border-muted-foreground/30">
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
                <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-blue-500" />
                  Most Impactful Lines
                </h4>
                <div className="space-y-3">
                  {interp.key_lines.map((keyLine, idx) => (
                    <div key={idx} className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 p-4 rounded-lg border border-blue-500/20">
                      <p className="text-base text-foreground font-semibold mb-2 leading-relaxed">
                        "{keyLine.line}"
                      </p>
                      <p className="text-sm text-foreground/80 italic pl-4 border-l-2 border-blue-500/30">
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
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-lg flex items-center gap-2 text-foreground">
              <div className="bg-pink-600/20 p-2 rounded-lg">
                <Heart className="w-4 h-4 text-pink-400" />
              </div>
              Emotional Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-pink-500/10 to-purple-500/10 p-4 rounded-lg border border-pink-500/20">
                <h3 className="text-xl font-bold text-foreground capitalize mb-2">{emotional.dominant_mood}</h3>
                <p className="text-sm text-foreground/90 leading-relaxed italic">{emotional.mood_description}</p>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground mb-2">Intensity</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{Math.round(emotional.intensity * 100)}%</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div
                        className="bg-pink-500 h-2 rounded-full"
                        style={{ width: `${emotional.intensity * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground mb-2">Valence</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{Math.round(emotional.valence * 100)}%</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${emotional.valence * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground mb-2">Energy</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{Math.round(emotional.energy * 100)}%</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div
                        className="bg-orange-500 h-2 rounded-full"
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
            <CardHeader className="pb-3 border-b border-border bg-gradient-to-r from-pink-500/5 to-purple-500/5">
              <CardTitle className="text-lg flex items-center gap-2 text-foreground">
                <div className="bg-purple-600/20 p-2 rounded-lg">
                  <Music className="w-4 h-4 text-purple-400" />
                </div>
                Emotional Journey Through The Song
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-pink-500/50 via-purple-500/50 to-blue-500/50" />
                
                <div className="space-y-6">
                  {emotional.journey.map((section, idx) => (
                    <div key={idx} className="relative flex gap-4 items-start">
                      {/* Timeline dot */}
                      <div className="relative z-10 w-16 flex-shrink-0">
                        <div className="w-4 h-4 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 border-2 border-background" />
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 -mt-1">
                        <div className="bg-gradient-to-r from-pink-500/5 to-transparent p-4 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className="bg-pink-600/20 text-pink-400 border-pink-500/30">
                              {section.section}
                            </Badge>
                            <span className="text-sm font-semibold text-foreground capitalize">{section.mood}</span>
                          </div>
                          <p className="text-sm text-foreground/80 leading-relaxed">{section.description}</p>
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
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-lg flex items-center gap-2 text-foreground">
                <div className="bg-red-600/20 p-2 rounded-lg">
                  <Zap className="w-4 h-4 text-red-400" />
                </div>
                Emotional Peaks
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="flex flex-wrap gap-2">
                {emotional.emotional_peaks.map((peak, idx) => (
                  <Badge key={idx} variant="secondary" className="bg-red-600/20 text-foreground border-red-500/30">
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
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-lg flex items-center gap-2 text-foreground">
              <div className="bg-yellow-600/20 p-2 rounded-lg">
                <BarChart3 className="w-4 h-4 text-yellow-400" />
              </div>
              Listening Contexts
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
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
                      meditation: '🧘'
                    }
                    return icons[activity] || '🎵'
                  }
                  
                  return (
                    <div key={activity} className="relative group">
                      <div className="p-3 rounded-lg border border-border hover:border-green-500/50 transition-all bg-card hover:bg-card-foreground/5">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">{getActivityIcon(activity)}</span>
                          <span className="text-xs font-medium capitalize">{activity.replace('_', ' ')}</span>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className={`font-semibold ${score > 0.7 ? 'text-green-500' : score > 0.4 ? 'text-yellow-500' : 'text-red-500'}`}>
                              {Math.round(score * 100)}%
                            </span>
                          </div>
                          <div className="w-full bg-secondary rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full transition-all ${score > 0.7 ? 'bg-green-500' : score > 0.4 ? 'bg-yellow-500' : 'bg-red-500'}`}
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
          <Card className="bg-gradient-to-br from-green-500/5 to-blue-500/5 border-green-500/20">
            <CardHeader className="pb-3 border-b border-green-500/20">
              <CardTitle className="text-lg flex items-center gap-2 text-foreground">
                <div className="bg-green-600/20 p-2 rounded-lg">
                  <Sparkles className="w-4 h-4 text-green-400" />
                </div>
                Perfect Moments For This Song
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid gap-2">
                {context.best_moments.map((moment, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-2 rounded-lg hover:bg-green-500/10 transition-colors">
                    <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                    <span className="text-sm text-foreground/90 leading-relaxed">{moment}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {context.audience && (
          <Card className="bg-card border-border">
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-lg flex items-center gap-2 text-foreground">
                <div className="bg-blue-600/20 p-2 rounded-lg">
                  <Users className="w-4 h-4 text-blue-400" />
                </div>
                Target Audience
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              {context.audience.primary_demographic && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Primary Demographic</h4>
                  <p className="text-sm text-foreground">{context.audience.primary_demographic}</p>
                </div>
              )}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Universal Appeal</h4>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-secondary rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${context.audience.universal_appeal * 100}%` }}
                    />
                  </div>
                  <span className="text-sm text-muted-foreground shrink-0">
                    {Math.round(context.audience.universal_appeal * 100)}%
                  </span>
                </div>
              </div>
              {context.audience.resonates_with && context.audience.resonates_with.length > 0 && (
                <div className="mt-3">
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Resonates With</h4>
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
        <CardHeader className="pb-3 border-b border-border">
          <CardTitle className="text-lg flex items-center gap-2 text-foreground">
            <div className="bg-purple-600/20 p-2 rounded-lg">
              <BarChart3 className="w-4 h-4 text-purple-400" />
            </div>
            Audio Features
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">Tempo</div>
              <div className="text-lg font-bold text-foreground">{Math.round(features.tempo)} BPM</div>
            </div>
            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">Energy</div>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-secondary rounded-full h-2">
                  <div
                    className="bg-orange-500 h-2 rounded-full"
                    style={{ width: `${features.energy * 100}%` }}
                  />
                </div>
                <span className="text-sm text-muted-foreground">{Math.round(features.energy * 100)}%</span>
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">Valence</div>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-secondary rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${features.valence * 100}%` }}
                  />
                </div>
                <span className="text-sm text-muted-foreground">{Math.round(features.valence * 100)}%</span>
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">Danceability</div>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-secondary rounded-full h-2">
                  <div
                    className="bg-pink-500 h-2 rounded-full"
                    style={{ width: `${features.danceability * 100}%` }}
                  />
                </div>
                <span className="text-sm text-muted-foreground">{Math.round(features.danceability * 100)}%</span>
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">Acousticness</div>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-secondary rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full"
                    style={{ width: `${features.acousticness * 100}%` }}
                  />
                </div>
                <span className="text-sm text-muted-foreground">{Math.round(features.acousticness * 100)}%</span>
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">Loudness</div>
              <div className="text-lg font-bold text-foreground">{features.loudness.toFixed(1)} dB</div>
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
        <CardHeader className="pb-3 border-b border-border">
          <CardTitle className="text-lg flex items-center gap-2 text-foreground">
            <div className="bg-green-600/20 p-2 rounded-lg">
              <Palette className="w-4 h-4 text-green-400" />
            </div>
            Musical Style
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Primary Genre</h4>
              <Badge variant="secondary" className="capitalize break-words max-w-full">
                {style.genre_primary}
              </Badge>
            </div>
            {style.genre_secondary && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Secondary Genre</h4>
                <Badge variant="secondary" className="capitalize break-words max-w-full">
                  {style.genre_secondary}
                </Badge>
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Vocal Style</h4>
              <Badge variant="outline" className="capitalize">
                {style.vocal_style}
              </Badge>
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Production</h4>
              <Badge variant="outline" className="capitalize">
                {style.production_style}
              </Badge>
            </div>
          </div>
          {style.sonic_texture && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                <Music className="w-4 h-4 text-green-500" />
                Sonic Texture
              </h4>
              <p className="text-sm text-foreground bg-gradient-to-r from-green-500/10 to-transparent p-4 rounded-lg border border-green-500/20 italic">
                {style.sonic_texture}
              </p>
            </div>
          )}
          {style.distinctive_elements && style.distinctive_elements.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Distinctive Elements</h4>
              <div className="flex flex-wrap gap-2">
                {style.distinctive_elements.map((element, idx) => (
                  <Badge key={idx} variant="secondary" className="bg-green-600/20 text-foreground border-green-500/30">
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
        <CardHeader className="pb-3 border-b border-border">
          <CardTitle className="text-lg flex items-center gap-2 text-foreground">
            <div className="bg-orange-600/20 p-2 rounded-lg">
              <Target className="w-4 h-4 text-orange-400" />
            </div>
            Matching Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { key: 'mood_consistency', label: 'Mood Consistency', color: 'blue' },
              { key: 'energy_flexibility', label: 'Energy Flexibility', color: 'pink' },
              { key: 'theme_cohesion', label: 'Theme Cohesion', color: 'purple' },
              { key: 'sonic_similarity', label: 'Sonic Similarity', color: 'green' }
            ].map(({ key, label, color }) => (
              <div key={key} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium truncate mr-2">{label}</span>
                  <span className="text-muted-foreground shrink-0">
                    {Math.round(profile[key as keyof typeof profile] as number * 100)}%
                  </span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div
                    className={`bg-${color}-500 h-2 rounded-full`}
                    style={{ width: `${(profile[key as keyof typeof profile] as number) * 100}%` }}
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
        <div className="h-full flex items-center justify-center">
          <p className="text-muted-foreground">No analysis available for this track.</p>
        </div>
      )
    }

    return (
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full h-full flex flex-col">
        <div className="shrink-0 px-6 border-b border-border">
          <TabsList className="bg-transparent w-full justify-start rounded-none px-0 h-auto py-2 flex-wrap overflow-x-auto">
            <TabsTrigger
              value="meaning"
              className="data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:border-b-2 data-[state=active]:border-green-500 rounded-none px-3 md:px-4 py-2 text-xs md:text-sm text-muted-foreground hover:text-foreground whitespace-nowrap border-b-2 border-transparent transition-colors"
            >
              Themes & Meaning
            </TabsTrigger>
            <TabsTrigger
              value="emotional"
              className="data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:border-b-2 data-[state=active]:border-green-500 rounded-none px-3 md:px-4 py-2 text-xs md:text-sm text-muted-foreground hover:text-foreground whitespace-nowrap border-b-2 border-transparent transition-colors"
            >
              Emotional
            </TabsTrigger>
            <TabsTrigger
              value="context"
              className="data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:border-b-2 data-[state=active]:border-green-500 rounded-none px-3 md:px-4 py-2 text-xs md:text-sm text-muted-foreground hover:text-foreground whitespace-nowrap border-b-2 border-transparent transition-colors"
            >
              Context
            </TabsTrigger>
            <TabsTrigger
              value="style"
              className="data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:border-b-2 data-[state=active]:border-green-500 rounded-none px-3 md:px-4 py-2 text-xs md:text-sm text-muted-foreground hover:text-foreground whitespace-nowrap border-b-2 border-transparent transition-colors"
            >
              Style & Matching
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden">
          <div className="h-full">
            <TabsContent value="meaning" className="h-full m-0 data-[state=inactive]:hidden">
              <ScrollArea className="h-full px-6 py-4">
                <div className="space-y-4 pb-4">
                  {renderThemes()}
                  {renderInterpretation()}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="emotional" className="h-full m-0 data-[state=inactive]:hidden">
              <ScrollArea className="h-full px-6 py-4">
                <div className="pb-4">
                  {renderEmotional()}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="context" className="h-full m-0 data-[state=inactive]:hidden">
              <ScrollArea className="h-full px-6 py-4">
                <div className="pb-4">
                  {renderContext()}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="style" className="h-full m-0 data-[state=inactive]:hidden">
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
      <DialogContent className="max-w-[95vw] md:max-w-4xl lg:max-w-5xl h-[85vh] flex flex-col overflow-hidden bg-card border-border p-0 gap-0">
        <DialogClose className="text-green-500 absolute right-4 top-4 z-10" />

        <DialogHeader className="border-b border-border px-6 py-4 shrink-0 bg-gradient-to-r from-card to-card-foreground/5">
          <div className="space-y-3">
            <div>
              <DialogTitle className="text-xl md:text-2xl font-bold text-foreground pr-8 break-words">
                {trackName}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground text-sm md:text-base break-words">
                {artistName}
              </DialogDescription>
            </div>
            
            {songAnalysis && (
              <div className="flex items-center gap-4 pt-2">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${
                    songAnalysis.emotional.valence > 0.6 ? 'from-green-500 to-blue-500' : 
                    songAnalysis.emotional.valence > 0.3 ? 'from-yellow-500 to-orange-500' : 
                    'from-red-500 to-purple-500'
                  }`} />
                  <span className="text-xs text-muted-foreground capitalize">
                    {songAnalysis.emotional.dominant_mood}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className={`w-3 h-3 ${
                    songAnalysis.emotional.energy > 0.7 ? 'text-orange-500' : 
                    songAnalysis.emotional.energy > 0.4 ? 'text-yellow-500' : 
                    'text-blue-500'
                  }`} />
                  <span className="text-xs text-muted-foreground">
                    {songAnalysis.emotional.energy > 0.7 ? 'High' : 
                     songAnalysis.emotional.energy > 0.4 ? 'Medium' : 'Low'} Energy
                  </span>
                </div>
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-hidden">
          {renderContent()}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default TrackAnalysisModal