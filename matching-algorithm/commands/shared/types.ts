export interface PlaylistAnalysis {
  timestamp: string;
  playlist: {
    id: string;
    name: string;
    description: string;
    track_ids: string[];
    analysis: {
      meaning: {
        themes: Array<{
          name: string;
          confidence: number;
          description: string;
        }>;
        main_message: string;
      };
      emotional: {
        dominantMood: {
          mood: string;
          description: string;
        };
        intensity_score: number;
      };
      context: {
        primary_setting: string;
        situations: {
          perfect_for: string[];
          why: string;
        };
        fit_scores: {
          morning: number;
          working: number;
          relaxation: number;
        };
      };
    };
    matchability: {
      versatility_score: number;
      distinctiveness: number;
      adaptability: number;
    };
  };
}

export interface CommandOptions {
  latest?: boolean;
}

export interface PlaylistCommandOptions extends CommandOptions {
  name?: string;
  description?: string;
}
