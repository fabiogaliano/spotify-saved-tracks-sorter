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
      batch_update_playlist_track_counts: {
        Args: {
          updates: Json[]
        }
        Returns: undefined
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

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
