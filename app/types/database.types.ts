export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      analysis_jobs: {
        Row: {
          created_at: string
          id: number
          status: string
          track_count: number
          tracks_failed: number
          tracks_processed: number
          tracks_succeeded: number
          updated_at: string
          user_id: number
        }
        Insert: {
          created_at?: string
          id?: number
          status: string
          track_count?: number
          tracks_failed?: number
          tracks_processed?: number
          tracks_succeeded?: number
          updated_at?: string
          user_id: number
        }
        Update: {
          created_at?: string
          id?: number
          status?: string
          track_count?: number
          tracks_failed?: number
          tracks_processed?: number
          tracks_succeeded?: number
          updated_at?: string
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "analysis_jobs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      audio_features: {
        Row: {
          acousticness: number | null
          created_at: string | null
          danceability: number | null
          energy: number | null
          id: number
          instrumentalness: number | null
          liveness: number | null
          speechiness: number | null
          tempo: number | null
          track_id: number | null
          valence: number | null
        }
        Insert: {
          acousticness?: number | null
          created_at?: string | null
          danceability?: number | null
          energy?: number | null
          id?: number
          instrumentalness?: number | null
          liveness?: number | null
          speechiness?: number | null
          tempo?: number | null
          track_id?: number | null
          valence?: number | null
        }
        Update: {
          acousticness?: number | null
          created_at?: string | null
          danceability?: number | null
          energy?: number | null
          id?: number
          instrumentalness?: number | null
          liveness?: number | null
          speechiness?: number | null
          tempo?: number | null
          track_id?: number | null
          valence?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "audio_features_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: true
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      playlist_analyses: {
        Row: {
          analysis: Json
          created_at: string | null
          id: number
          model_name: string
          playlist_id: number
          user_id: number
          version: number
        }
        Insert: {
          analysis: Json
          created_at?: string | null
          id?: number
          model_name: string
          playlist_id: number
          user_id: number
          version: number
        }
        Update: {
          analysis?: Json
          created_at?: string | null
          id?: number
          model_name?: string
          playlist_id?: number
          user_id?: number
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "playlist_analyses_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "playlists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playlist_analyses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      playlist_tracks: {
        Row: {
          added_at: string
          id: number
          playlist_id: number
          track_id: number
          user_id: number
        }
        Insert: {
          added_at: string
          id?: number
          playlist_id: number
          track_id: number
          user_id: number
        }
        Update: {
          added_at?: string
          id?: number
          playlist_id?: number
          track_id?: number
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "playlist_tracks_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "playlists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playlist_tracks_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playlist_tracks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      playlists: {
        Row: {
          created_at: string | null
          description: string | null
          id: number
          is_flagged: boolean | null
          name: string
          spotify_playlist_id: string
          track_count: number
          tracks_last_synced_at: string | null
          tracks_sync_status:
            | Database["public"]["Enums"]["playlist_tracks_sync_status_enum"]
            | null
          updated_at: string | null
          user_id: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: number
          is_flagged?: boolean | null
          name: string
          spotify_playlist_id: string
          track_count?: number
          tracks_last_synced_at?: string | null
          tracks_sync_status?:
            | Database["public"]["Enums"]["playlist_tracks_sync_status_enum"]
            | null
          updated_at?: string | null
          user_id?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: number
          is_flagged?: boolean | null
          name?: string
          spotify_playlist_id?: string
          track_count?: number
          tracks_last_synced_at?: string | null
          tracks_sync_status?:
            | Database["public"]["Enums"]["playlist_tracks_sync_status_enum"]
            | null
          updated_at?: string | null
          user_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "playlists_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_keys: {
        Row: {
          auth_tag: string
          created_at: string
          encrypted_key: string
          id: number
          iv: string
          provider: string
          updated_at: string
          user_id: number | null
        }
        Insert: {
          auth_tag?: string
          created_at?: string
          encrypted_key: string
          id?: number
          iv: string
          provider: string
          updated_at?: string
          user_id?: number | null
        }
        Update: {
          auth_tag?: string
          created_at?: string
          encrypted_key?: string
          id?: number
          iv?: string
          provider?: string
          updated_at?: string
          user_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_keys_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_tracks: {
        Row: {
          id: number
          liked_at: string
          sorting_status:
            | Database["public"]["Enums"]["sorting_status_enum"]
            | null
          track_id: number
          user_id: number
        }
        Insert: {
          id?: number
          liked_at: string
          sorting_status?:
            | Database["public"]["Enums"]["sorting_status_enum"]
            | null
          track_id: number
          user_id: number
        }
        Update: {
          id?: number
          liked_at?: string
          sorting_status?:
            | Database["public"]["Enums"]["sorting_status_enum"]
            | null
          track_id?: number
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "saved_tracks_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_tracks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      track_analyses: {
        Row: {
          analysis: Json
          created_at: string | null
          id: number
          model_name: string
          track_id: number
          version: number
        }
        Insert: {
          analysis: Json
          created_at?: string | null
          id?: number
          model_name: string
          track_id: number
          version: number
        }
        Update: {
          analysis?: Json
          created_at?: string | null
          id?: number
          model_name?: string
          track_id?: number
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "track_analyses_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      track_analysis_attempts: {
        Row: {
          created_at: string
          error_message: string | null
          error_type: string | null
          id: number
          job_id: number
          status: string
          track_id: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          error_type?: string | null
          id?: number
          job_id: number
          status: string
          track_id: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          error_type?: string | null
          id?: number
          job_id?: number
          status?: string
          track_id?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "track_analysis_attempts_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "analysis_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "track_analysis_attempts_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      track_playlist_matches: {
        Row: {
          created_at: string | null
          factors: Json
          model_name: string
          playlist_id: number
          score: number
          track_id: number
          version: number
        }
        Insert: {
          created_at?: string | null
          factors: Json
          model_name: string
          playlist_id: number
          score: number
          track_id: number
          version: number
        }
        Update: {
          created_at?: string | null
          factors?: Json
          model_name?: string
          playlist_id?: number
          score?: number
          track_id?: number
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "song_playlist_matches_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "playlists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "song_playlist_matches_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      tracks: {
        Row: {
          album: string | null
          artist: string
          created_at: string | null
          id: number
          name: string
          spotify_track_id: string
        }
        Insert: {
          album?: string | null
          artist: string
          created_at?: string | null
          id?: number
          name: string
          spotify_track_id: string
        }
        Update: {
          album?: string | null
          artist?: string
          created_at?: string | null
          id?: number
          name?: string
          spotify_track_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          active_provider: string | null
          batch_size: number
          sync_mode: Database["public"]["Enums"]["sync_mode_enum"]
          updated_at: string | null
          user_id: number
        }
        Insert: {
          active_provider?: string | null
          batch_size?: number
          sync_mode?: Database["public"]["Enums"]["sync_mode_enum"]
          updated_at?: string | null
          user_id: number
        }
        Update: {
          active_provider?: string | null
          batch_size?: number
          sync_mode?: Database["public"]["Enums"]["sync_mode_enum"]
          updated_at?: string | null
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_provider_preferences_new_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          has_setup_completed: boolean
          id: number
          last_login: string | null
          playlists_last_sync: string | null
          playlists_sync_status: string | null
          songs_last_sync: string | null
          songs_sync_status: string | null
          spotify_user_email: string | null
          spotify_user_id: string
        }
        Insert: {
          created_at?: string | null
          has_setup_completed?: boolean
          id?: number
          last_login?: string | null
          playlists_last_sync?: string | null
          playlists_sync_status?: string | null
          songs_last_sync?: string | null
          songs_sync_status?: string | null
          spotify_user_email?: string | null
          spotify_user_id: string
        }
        Update: {
          created_at?: string | null
          has_setup_completed?: boolean
          id?: number
          last_login?: string | null
          playlists_last_sync?: string | null
          playlists_sync_status?: string | null
          songs_last_sync?: string | null
          songs_sync_status?: string | null
          spotify_user_email?: string | null
          spotify_user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_track_analysis_job: {
        Args: { p_user_id: number; p_track_ids: number[] }
        Returns: number
      }
      batch_update_playlist_track_counts: {
        Args: { updates: Json[] }
        Returns: undefined
      }
      exec_sql: {
        Args: { sql: string }
        Returns: undefined
      }
      get_latest_analysis_job: {
        Args: { p_user_id: number }
        Returns: {
          id: number
          status: string
          created_at: string
          updated_at: string
          track_count: number
          tracks_processed: number
          tracks_succeeded: number
          tracks_failed: number
          completion_percentage: number
        }[]
      }
    }
    Enums: {
      analysis_version_enum: "1.0"
      playlist_tracks_sync_status_enum:
        | "NOT_STARTED"
        | "IN_PROGRESS"
        | "COMPLETED"
        | "FAILED"
      sorting_status_enum: "unsorted" | "sorted" | "ignored"
      sync_mode_enum: "manual" | "automatic"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      analysis_version_enum: ["1.0"],
      playlist_tracks_sync_status_enum: [
        "NOT_STARTED",
        "IN_PROGRESS",
        "COMPLETED",
        "FAILED",
      ],
      sorting_status_enum: ["unsorted", "sorted", "ignored"],
      sync_mode_enum: ["manual", "automatic"],
    },
  },
} as const
