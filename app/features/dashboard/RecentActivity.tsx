import { Button } from "~/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/shared/components/ui/Card";
import { Activity, CheckCircle2, ChevronRight, ListMusic, Music } from "lucide-react";

export function RecentActivity() {
  return (
    <Card className="bg-card border-border overflow-hidden h-full">
      <CardHeader className="pb-2 border-b border-border">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg flex items-center gap-2 text-foreground">
            <div className="bg-blue-500/20 p-1.5 rounded-md">
              <Activity className="h-5 w-5 text-blue-400" />
            </div>
            <span className="font-bold">Recent Activity</span>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground hover:bg-transparent p-0 h-auto"
          >
            View All <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          <div className="flex items-start gap-3 p-3 rounded-md hover:bg-background/20 transition-colors">
            <div className="bg-green-500/20 rounded-full p-1.5 mt-0.5">
              <CheckCircle2 className="h-4 w-4 text-green-400" />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <p className="text-foreground font-medium">12 songs matched to "Workout Mix"</p>
                <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">Just now</span>
              </div>
              <p className="text-sm text-muted-foreground">Songs automatically sorted based on analysis</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-md hover:bg-background/20 transition-colors">
            <div className="bg-blue-500/20 rounded-full p-1.5 mt-0.5">
              <Music className="h-4 w-4 text-blue-400" />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <p className="text-foreground font-medium">15 songs analyzed</p>
                <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">5 min ago</span>
              </div>
              <p className="text-sm text-muted-foreground">Batch analysis completed in 45 seconds</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-md hover:bg-background/20 transition-colors">
            <div className="bg-purple-500/20 rounded-full p-1.5 mt-0.5">
              <ListMusic className="h-4 w-4 text-purple-400" />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <p className="text-foreground font-medium">"Chill Vibes" playlist updated</p>
                <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">2 hours ago</span>
              </div>
              <p className="text-sm text-muted-foreground">AI flag added: "relaxing acoustic songs with nature themes"</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
