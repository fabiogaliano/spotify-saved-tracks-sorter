import { Button } from "~/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/shared/components/ui/Card";
import { Progress } from "~/shared/components/ui/progress";
import { Music, RefreshCw } from "lucide-react";
import { TrackAnalysisStats } from "~/lib/models/Track";

export function LibraryStatus({ stats }: { stats: TrackAnalysisStats }) {
  return (
    <Card className="bg-gray-900/80 border-gray-800 overflow-hidden">
      <CardHeader className="pb-2 border-b border-gray-800">
        <CardTitle className="text-lg flex justify-between gap-2 text-white">
          <div className="flex items-center gap-2">
            <div className="bg-green-500/20 p-1.5 rounded-md">
              <Music className="h-5 w-5 text-green-400" />
            </div>
            <span className="font-bold">Library Status</span>
          </div>
          <Button
            variant="default"
            size="sm"
            className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700 hover:border-gray-600 transition-colors gap-2"
          >
            <RefreshCw className="h-4 w-4" /> Sync Library
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-300">Songs in library</span>
            <span className="font-medium text-white">{stats.total}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-300">Songs analyzed</span>
            <span className="font-medium text-white">{stats.withAnalysis}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-300">AI-flagged playlists</span>
            <span className="font-medium text-white">? implement</span>
          </div>
        </div>

        <div className="w-full">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-300">Analysis Progress</span>
            <span className="text-green-400 font-medium">{stats.analysisPercentage.toFixed(1)}%</span>
          </div>
          <Progress
            value={16}
            className="h-3 bg-gray-800 border border-gray-700"
            indicatorClassName="bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]"
          />
        </div>
      </CardContent>
    </Card>
  );
}
