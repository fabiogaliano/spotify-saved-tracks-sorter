import { Button } from "~/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/shared/components/ui/Card";
import { Clock } from "lucide-react";

export function AnalysisStats() {
  return (
    <Card className="bg-gray-900/80 border-gray-800 overflow-hidden h-full">
      <CardHeader className="pb-2 border-b border-gray-800">
        <CardTitle className="text-lg flex items-center gap-2 text-white">
          <div className="bg-purple-500/20 p-1.5 rounded-md">
            <Clock className="h-5 w-5 text-purple-400" />
          </div>
          <span className="font-bold">Processing Status</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-300">API credits used</span>
            <span className="font-medium text-white">127</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-300">API credits remaining</span>
            <span className="font-medium text-white">873</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-300">Estimated completion</span>
            <span className="font-medium text-white">~35 minutes</span>
          </div>
        </div>

        <Card className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 border-gray-800">
          <CardContent className="p-4">
            <h4 className="text-sm font-medium text-white mb-1">Need faster analysis?</h4>
            <p className="text-xs text-gray-300">Increase your batch size in settings to process more songs at once.</p>
            <Button
              size="sm"
              className="mt-2 text-xs text-white bg-white/10 hover:bg-white/20 px-3 py-1 h-auto transition-colors"
            >
              Adjust Settings
            </Button>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
}
