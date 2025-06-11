import { Button } from "~/shared/components/ui/button";
import { Card, CardContent } from "~/shared/components/ui/Card";
import { ArrowRight, ListMusic, Music, Play } from "lucide-react";

export function QuickActions() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card className="bg-card-primary border border-primary/20 hover:border-primary/50 transition-all cursor-pointer overflow-hidden">
        <CardContent className="p-5 flex flex-col h-full">
          <div className="bg-green-500/20 rounded-full p-2 w-fit mb-3">
            <Play className="h-5 w-5 text-green-400" />
          </div>
          <h3 className="font-medium text-foreground mb-1">Match Songs to Playlists</h3>
          <p className="text-sm text-muted-foreground mb-3">Find the perfect playlists for your songs</p>
          <Button className="mt-auto w-full bg-white/10 hover:bg-white/20 text-foreground border-0">
            Start Matching <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-card-secondary border border-secondary/20 hover:border-secondary/50 transition-all cursor-pointer overflow-hidden">
        <CardContent className="p-5 flex flex-col h-full">
          <div className="bg-blue-500/20 rounded-full p-2 w-fit mb-3">
            <Music className="h-5 w-5 text-blue-400" />
          </div>
          <h3 className="font-medium text-foreground mb-1">Analyze Songs</h3>
          <p className="text-sm text-muted-foreground mb-3">Process lyrics and metadata (Batch: 15)</p>
          <Button className="mt-auto w-full bg-white/10 hover:bg-white/20 text-foreground border-0">
            Analyze Batch <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-card-accent border border-accent/20 hover:border-accent/50 transition-all cursor-pointer overflow-hidden">
        <CardContent className="p-5 flex flex-col h-full">
          <div className="bg-purple-500/20 rounded-full p-2 w-fit mb-3">
            <ListMusic className="h-5 w-5 text-purple-400" />
          </div>
          <h3 className="font-medium text-foreground mb-1">Manage Playlists</h3>
          <p className="text-sm text-muted-foreground mb-3">Configure AI flags and descriptions</p>
          <Button className="mt-auto w-full bg-white/10 hover:bg-white/20 text-foreground border-0">
            View Playlists <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
