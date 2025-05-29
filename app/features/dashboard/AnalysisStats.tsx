import { Button } from "~/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/shared/components/ui/Card";
import { Clock } from "lucide-react";

export function AnalysisStats() {
  return (
    <Card className="bg-card border-border overflow-hidden h-full">
      <CardHeader className="pb-2 border-b border-border">
        <CardTitle className="text-lg flex items-center gap-2 text-foreground">
          <div className="bg-purple-500/20 p-1.5 rounded-md">
            <Clock className="h-5 w-5 text-purple-400" />
          </div>
          <span className="font-bold">Processing Status</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-muted-foreground">API credits used</span>
            <span className="font-medium text-foreground">127</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">API credits remaining</span>
            <span className="font-medium text-foreground">873</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Estimated completion</span>
            <span className="font-medium text-foreground">~35 minutes</span>
          </div>
        </div>

        <Card className="bg-card-secondary border-border">
          <CardContent className="p-4">
            <h4 className="text-sm font-medium text-foreground mb-1">Need faster analysis?</h4>
            <p className="text-xs text-muted-foreground">Increase your batch size in settings to process more songs at once.</p>
            <Button
              size="sm"
              className="mt-2 text-xs text-foreground bg-white/10 hover:bg-white/20 px-3 py-1 h-auto transition-colors"
            >
              Adjust Settings
            </Button>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
}
