import { useState } from 'react'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '~/shared/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '~/shared/components/ui/Card'
import { ScrollArea } from '~/shared/components/ui/scroll-area'
import { Badge } from '~/shared/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/shared/components/ui/tabs'
import { XIcon } from 'lucide-react'

interface TrackAnalysisModalProps {
  trackName: string
  artistName: string
  analysis: any // Using any temporarily, we'll define proper types below
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

// Define types based on the JSON structure
interface Theme {
  name: string
  confidence: number
  description: string
  related_themes: string[]
  connection: string
}

interface InterpretationData {
  main_message: string
  verified: string[]
  derived: string[]
}

interface MoodSection {
  section: string
  mood: string
  intensity: number
  description: string
}

interface DominantMood {
  mood: string
  description: string
}

interface EmotionalData {
  dominantMood: DominantMood
  progression: MoodSection[]
  intensity_score: number
}

interface Context {
  primary_setting: string
  situations: {
    perfect_for: string[]
    why: string
  }
  activities: string[]
  temporal: string[]
  social: string[]
  fit_scores: {
    morning: number
    working: number
    relaxation: number
  }
}

interface Matchability {
  versatility: number
  mood_consistency: number
  uniqueness: number
}

interface MeaningAnalysis {
  themes: Theme[]
  interpretation: InterpretationData
}

interface LyricsAnalysis {
  timestamp: string
  track: {
    id: string
    artist: string
    title: string
  }
  analysis: {
    meaning: MeaningAnalysis
    emotional: EmotionalData
    context: Context
    matchability: Matchability
  }
}

// Alternative format (Wallows format)
interface LineAnnotation {
  text: string
  verified: boolean
  votes_total: number
  pinnedRole: string | null
}

interface LyricLine {
  id: number
  text: string
  range: {
    start: number
    end: number
  }
  annotations: LineAnnotation[]
}

interface LyricSection {
  type: string
  lines: LyricLine[]
}

type LyricsWithAnnotations = LyricSection[]

const TrackAnalysisModal = ({
  trackName,
  artistName,
  analysis,
  isOpen,
  onOpenChange,
}: TrackAnalysisModalProps) => {
  const [activeTab, setActiveTab] = useState('themes')

  // Helper to check which format the analysis is in
  const isLyricsAnalysisFormat = () => {
    return analysis && analysis.meaning && analysis.emotional
  }

  const isLyricsWithAnnotationsFormat = () => {
    return Array.isArray(analysis)
  }

  const renderThemes = (themes: Theme[]) => {
    return (
      <div className="space-y-4">
        {themes.map((theme, index) => (
          <Card key={index} className="bg-gray-900/80 border-gray-800">
            <CardHeader className="pb-2 border-b border-gray-800">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg font-semibold text-white">{theme.name}</CardTitle>
                <Badge className="bg-blue-600/40 text-white border border-blue-500">
                  {Math.round(theme.confidence * 100)}% confidence
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-3">
              <p className="text-sm text-gray-200 mb-3">{theme.description}</p>
              <div className="mt-2">
                <h4 className="text-xs font-medium text-gray-400 mb-1">Related Themes:</h4>
                <div className="flex flex-wrap gap-1 w-full">
                  {/* Using full width to constrain the badges */}
                  {theme.related_themes.map((relatedTheme, i) => (
                    <Badge key={i} variant="secondary" className="bg-blue-600/40 text-white border border-blue-500 hover:bg-blue-600/60">
                      {relatedTheme}
                    </Badge>
                  ))}
                </div>
              </div>
              {theme.connection && (
                <div className="mt-3">
                  <h4 className="text-xs font-medium text-gray-400 mb-1">Connection:</h4>
                  <p className="text-xs text-gray-200">{theme.connection}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const renderInterpretation = (interpretation: InterpretationData) => {
    return (
      <div className="space-y-4">
        <Card className="bg-gray-900/80 border-gray-800">
          <CardHeader className="pb-2 border-b border-gray-800">
            <CardTitle className="text-lg flex items-center gap-2 text-white">
              <div className="bg-green-600/40 p-1.5 rounded-md">
                <span className="text-white text-sm">💡</span>
              </div>
              Main Message
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-3">
            <p className="text-sm text-gray-200">{interpretation.main_message}</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/80 border-gray-800">
          <CardHeader className="pb-2 border-b border-gray-800">
            <CardTitle className="text-lg flex items-center gap-2 text-white">
              <div className="bg-blue-600/40 p-1.5 rounded-md">
                <span className="text-white text-sm">✓</span>
              </div>
              Verified Interpretations
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-3">
            <ul className="list-disc pl-5 space-y-1">
              {interpretation.verified.map((point, index) => (
                <li key={index} className="text-sm text-gray-300">{point}</li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/80 border-gray-800">
          <CardHeader className="pb-2 border-b border-gray-800">
            <CardTitle className="text-lg flex items-center gap-2 text-white">
              <div className="bg-purple-600/40 p-1.5 rounded-md">
                <span className="text-white text-sm">🔎</span>
              </div>
              Derived Interpretations
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-3">
            <ul className="list-disc pl-5 space-y-1">
              {interpretation.derived.map((point, index) => (
                <li key={index} className="text-sm text-gray-300">{point}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    )
  }

  const renderEmotional = (emotional: EmotionalData) => {
    return (
      <div className="space-y-4">
        <Card className="bg-gray-900/80 border-gray-800">
          <CardHeader className="pb-2 border-b border-gray-800">
            <CardTitle className="text-lg flex items-center gap-2 text-white">
              <div className="bg-pink-600/40 p-1.5 rounded-md">
                <span className="text-white text-sm">🎭</span>
              </div>
              Dominant Mood
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-3">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-md font-semibold text-white">{emotional.dominantMood.mood}</h3>
              <Badge className="bg-pink-600/40 text-white border border-pink-500">
                {Math.round(emotional.intensity_score * 100)}% intensity
              </Badge>
            </div>
            <p className="text-sm text-gray-200">{emotional.dominantMood.description}</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/80 border-gray-800">
          <CardHeader className="pb-2 border-b border-gray-800">
            <CardTitle className="text-lg flex items-center gap-2 text-white">
              <div className="bg-indigo-600/40 p-1.5 rounded-md">
                <span className="text-white text-sm">📊</span>
              </div>
              Mood Progression
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-3">
            <div className="space-y-3">
              {emotional.progression.map((section, index) => (
                <div key={index} className="border-l-2 border-green-700 pl-3 py-1">
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-medium">{section.section}</h4>
                    <Badge className="bg-indigo-600/40 text-white border border-indigo-500">
                      {Math.round(section.intensity * 100)}%
                    </Badge>
                  </div>
                  <p className="text-xs font-medium text-blue-100 mt-1">{section.mood}</p>
                  <p className="text-xs text-gray-200 mt-1">{section.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const renderContext = (context: Context) => {
    return (
      <div className="space-y-4">
        <Card className="bg-gray-900/80 border-gray-800">
          <CardHeader className="pb-2 border-b border-gray-800">
            <CardTitle className="text-lg flex items-center gap-2 text-white">
              <div className="bg-yellow-600/40 p-1.5 rounded-md">
                <span className="text-white text-sm">🌇</span>
              </div>
              Setting & Situations
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-3">
            <h4 className="text-xs font-medium text-gray-400 mb-1">Primary Setting:</h4>
            <p className="text-sm text-gray-200 mb-3">{context.primary_setting}</p>

            <h4 className="text-xs font-medium text-gray-400 mb-1">Perfect For:</h4>
            <div className="flex flex-wrap gap-1 mb-2 w-full">
              {/* Using a container with full width to constrain the badges */}
              {context.situations.perfect_for.map((situation, i) => (
                <Badge key={i} className="bg-yellow-600/40 text-white border border-yellow-500 hover:bg-yellow-600/60 max-w-full">
                  <span className="inline-block">{situation}</span>
                </Badge>
              ))}
            </div>
            <p className="text-xs text-gray-200 mt-1">{context.situations.why}</p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-gray-900/80 border-gray-800">
            <CardHeader className="pb-2 border-b border-gray-800">
              <CardTitle className="text-md flex items-center gap-2 text-white">
                <div className="bg-green-600/40 p-1.5 rounded-md">
                  <span className="text-white text-sm">🏃</span>
                </div>
                Activities
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-3">
              <div className="flex flex-wrap gap-1 w-full">
                {/* Using full width to constrain the badges */}
                {context.activities.map((activity, i) => (
                  <Badge key={i} className="bg-green-600/40 text-white border border-green-500 hover:bg-green-600/60 max-w-full">
                    <span className="inline-block">{activity}</span>
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/80 border-gray-800">
            <CardHeader className="pb-2 border-b border-gray-800">
              <CardTitle className="text-md flex items-center gap-2 text-white">
                <div className="bg-blue-600/40 p-1.5 rounded-md">
                  <span className="text-white text-sm">👥</span>
                </div>
                Social Context
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-3">
              <div className="flex flex-wrap gap-1 w-full">
                {/* Using full width to constrain the badges */}
                {context.social.map((social, i) => (
                  <Badge key={i} className="bg-blue-600/40 text-white border border-blue-500 hover:bg-blue-600/60 max-w-full">
                    <span className="inline-block">{social}</span>
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-gray-900/80 border-gray-800">
          <CardHeader className="pb-2 border-b border-gray-800">
            <CardTitle className="text-md flex items-center gap-2 text-white">
              <div className="bg-purple-600/40 p-1.5 rounded-md">
                <span className="text-white text-sm">🕓</span>
              </div>
              Temporal Fit
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-3">
            <div className="flex flex-wrap gap-1 mb-3 w-full">
              {/* Using a container with full width to constrain the badges */}
              {context.temporal.map((time, i) => (
                <Badge key={i} className="bg-purple-600/40 text-white border border-purple-500 hover:bg-purple-600/60 max-w-full">
                  <span className="inline-block">{time}</span>
                </Badge>
              ))}
            </div>

            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Morning</span>
                  <span>{Math.round(context.fit_scores.morning * 100)}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-1.5">
                  <div
                    className="bg-green-500 h-1.5 rounded-full"
                    style={{ width: `${context.fit_scores.morning * 100}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Working</span>
                  <span>{Math.round(context.fit_scores.working * 100)}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-1.5">
                  <div
                    className="bg-green-500 h-1.5 rounded-full"
                    style={{ width: `${context.fit_scores.working * 100}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Relaxation</span>
                  <span>{Math.round(context.fit_scores.relaxation * 100)}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-1.5">
                  <div
                    className="bg-green-500 h-1.5 rounded-full"
                    style={{ width: `${context.fit_scores.relaxation * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const renderMatchability = (matchability: Matchability) => {
    return (
      <div className="space-y-4">
        <Card className="bg-gray-900/80 border-gray-800">
          <CardHeader className="pb-2 border-b border-gray-800">
            <CardTitle className="text-lg flex items-center gap-2 text-white">
              <div className="bg-orange-600/40 p-1.5 rounded-md">
                <span className="text-white text-sm">🎧</span>
              </div>
              Matchability Scores
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-3">
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">Versatility</span>
                  <span>{Math.round(matchability.versatility * 100)}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full"
                    style={{ width: `${matchability.versatility * 100}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-400 mt-1">How well the track fits different contexts</p>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">Mood Consistency</span>
                  <span>{Math.round(matchability.mood_consistency * 100)}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full"
                    style={{ width: `${matchability.mood_consistency * 100}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-400 mt-1">How consistent the mood is throughout the track</p>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">Uniqueness</span>
                  <span>{Math.round(matchability.uniqueness * 100)}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full"
                    style={{ width: `${matchability.uniqueness * 100}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-400 mt-1">How distinctive the track is compared to others</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const renderLyricsWithAnnotations = (lyricsData: LyricsWithAnnotations) => {
    return (
      <div className="space-y-4">
        {lyricsData.map((section, sectionIndex) => (
          <Card key={sectionIndex} className="bg-gray-900/80 border-gray-800">
            <CardHeader className="pb-2 border-b border-gray-800">
              <CardTitle className="text-lg flex items-center gap-2 text-white">
                <div className="bg-blue-600/40 p-1.5 rounded-md">
                  <span className="text-white text-sm">🎵</span>
                </div>
                {section.type}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-3">
              <div className="space-y-4">
                {section.lines.map((line, lineIndex) => (
                  <div key={lineIndex} className="border-l-2 border-green-700 pl-3 py-1">
                    <p className="whitespace-pre-line text-sm font-medium text-gray-200">{line.text}</p>

                    {line.annotations.length > 0 && (
                      <div className="mt-2 space-y-2">
                        {line.annotations.map((annotation, annoIndex) => (
                          <div key={annoIndex} className="bg-gray-800/50 p-2 rounded-md border border-gray-700">
                            <div className="flex justify-between items-center mb-1">
                              {annotation.pinnedRole && (
                                <Badge className="bg-blue-600/40 text-white border border-blue-500">
                                  {annotation.pinnedRole}
                                </Badge>
                              )}
                              <div className="flex items-center gap-1 text-xs text-gray-400">
                                <span>{annotation.votes_total} votes</span>
                                {annotation.verified && (
                                  <Badge className="bg-green-600/40 text-white border border-green-500">
                                    Verified
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <p className="text-xs text-gray-200">{annotation.text}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const renderContent = () => {
    if (!analysis) {
      return (
        <div className="py-8 text-center">
          <p className="text-gray-400">No analysis available for this track.</p>
        </div>
      )
    }

    // Format 1: Lyrics Analysis (Corinne Bailey)
    if (isLyricsAnalysisFormat()) {
      const { meaning, emotional, context, matchability } = analysis

      return (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-gray-900/50 border-b border-gray-800 w-full justify-start rounded-none px-0 h-auto mb-4">
            <TabsTrigger value="themes" className="data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-green-500 rounded-none px-4 py-2 text-gray-400 hover:text-white">Themes</TabsTrigger>
            <TabsTrigger value="interpretation" className="data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-green-500 rounded-none px-4 py-2 text-gray-400 hover:text-white">Interpretation</TabsTrigger>
            <TabsTrigger value="emotional" className="data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-green-500 rounded-none px-4 py-2 text-gray-400 hover:text-white">Emotional</TabsTrigger>
            <TabsTrigger value="context" className="data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-green-500 rounded-none px-4 py-2 text-gray-400 hover:text-white">Context</TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[60vh]">
            <TabsContent value="themes" className="mt-0">
              {meaning && meaning.themes ? renderThemes(meaning.themes) : null}
            </TabsContent>

            <TabsContent value="interpretation" className="mt-0">
              {meaning && meaning.interpretation ? renderInterpretation(meaning.interpretation) : null}
            </TabsContent>

            <TabsContent value="emotional" className="mt-0">
              {emotional ? renderEmotional(emotional) : null}
            </TabsContent>

            <TabsContent value="context" className="mt-0">
              {context ? renderContext(context) : null}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      )
    }

    // Format 2: Lyrics with Annotations (Wallows)
    if (isLyricsWithAnnotationsFormat()) {
      return (
        <ScrollArea className="h-[60vh]">
          {renderLyricsWithAnnotations(analysis)}
        </ScrollArea>
      )
    }

    // Unknown format
    return (
      <div className="py-8 text-center">
        <p className="text-gray-400">Unable to display analysis. Unknown format.</p>
        <pre className="mt-4 text-xs text-left bg-gray-900 p-4 rounded overflow-auto max-h-[300px]">
          {JSON.stringify(analysis, null, 2)}
        </pre>
      </div>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[80vh] overflow-hidden bg-gray-900 border-gray-800">
        <DialogClose style={{ color: '#10b981' }} />

        <DialogHeader className="border-b border-gray-800 pb-3">
          <DialogTitle className="text-xl font-bold text-white">{trackName}</DialogTitle>
          <DialogDescription className="text-gray-400">{artistName}</DialogDescription>
        </DialogHeader>

        <div className="py-1">
          {renderContent()}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default TrackAnalysisModal
