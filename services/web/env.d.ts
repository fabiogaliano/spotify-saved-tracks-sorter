declare global {
  namespace NodeJS {
    interface ProcessEnv {
      SPOTIFY_CLIENT_ID: string;
      SPOTIFY_CLIENT_SECRET: string;
      SPOTIFY_CALLBACK_URL: string;
      SESSION_SECRET: string;
      GENIUS_CLIENT_TOKEN: string;
      SUPABASE_KEY: string;
      SUPABASE_URL: string;
      SUPABASE_PROJECT_ID: string;
    }
  }
}

export {}
