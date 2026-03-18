export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      ai_insights: {
        Row: {
          ai_model: string | null
          chapters: Json | null
          created_at: string | null
          id: string
          key_takeaways: Json | null
          seo_metadata: Json | null
          summary: string | null
          updated_at: string | null
          video_id: string
        }
        Insert: {
          ai_model?: string | null
          chapters?: Json | null
          created_at?: string | null
          id?: string
          key_takeaways?: Json | null
          seo_metadata?: Json | null
          summary?: string | null
          updated_at?: string | null
          video_id: string
        }
        Update: {
          ai_model?: string | null
          chapters?: Json | null
          created_at?: string | null
          id?: string
          key_takeaways?: Json | null
          seo_metadata?: Json | null
          summary?: string | null
          updated_at?: string | null
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_insights_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: true
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      batch_jobs: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          name: string
          status: string | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          name: string
          status?: string | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string
          status?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "batch_jobs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_jobs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      transcripts: {
        Row: {
          confidence_score: number | null
          created_at: string | null
          id: string
          language_code: string | null
          transcript_json: Json
          transcript_text: string
          video_id: string
          word_count: number | null
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          language_code?: string | null
          transcript_json: Json
          transcript_text: string
          video_id: string
          word_count?: number | null
        }
        Update: {
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          language_code?: string | null
          transcript_json?: Json
          transcript_text?: string
          video_id?: string
          word_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "transcripts_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_logs: {
        Row: {
          api_cost_usd: number
          created_at: string | null
          id: string
          minutes_billed: number
          user_id: string
          video_id: string | null
        }
        Insert: {
          api_cost_usd: number
          created_at?: string | null
          id?: string
          minutes_billed: number
          user_id: string
          video_id?: string | null
        }
        Update: {
          api_cost_usd?: number
          created_at?: string | null
          id?: string
          minutes_billed?: number
          user_id?: string
          video_id?: string | null
        }
        Relationships: []
      }
      users: {
        Row: {
          active_workspace_id: string | null
          avatar_url: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          active_workspace_id?: string | null
          avatar_url?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          active_workspace_id?: string | null
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_active_workspace_id_fkey"
            columns: ["active_workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      videos: {
        Row: {
          audio_url: string | null
          batch_id: string | null
          created_at: string | null
          duration_seconds: number | null
          error_message: string | null
          id: string
          processing_provider: string | null
          status: Database["public"]["Enums"]["video_status"] | null
          thumbnail_url: string | null
          title: string | null
          updated_at: string | null
          uploaded_by: string | null
          workspace_id: string
          youtube_url: string
          youtube_video_id: string | null
        }
        Insert: {
          audio_url?: string | null
          batch_id?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          error_message?: string | null
          id?: string
          processing_provider?: string | null
          status?: Database["public"]["Enums"]["video_status"] | null
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string | null
          uploaded_by?: string | null
          workspace_id: string
          youtube_url: string
          youtube_video_id?: string | null
        }
        Update: {
          audio_url?: string | null
          batch_id?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          error_message?: string | null
          id?: string
          processing_provider?: string | null
          status?: Database["public"]["Enums"]["video_status"] | null
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string | null
          uploaded_by?: string | null
          workspace_id?: string
          youtube_url?: string
          youtube_video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "videos_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "videos_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "videos_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          role: string | null
          user_id: string
          workspace_id: string
        }
        Insert: {
          role?: string | null
          user_id: string
          workspace_id: string
        }
        Update: {
          role?: string | null
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string | null
          id: string
          minutes_used_this_month: number | null
          monthly_minutes_limit: number | null
          name: string
          owner_id: string | null
          stripe_subscription_id: string | null
          tier: Database["public"]["Enums"]["user_tier"] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          minutes_used_this_month?: number | null
          monthly_minutes_limit?: number | null
          name: string
          owner_id?: string | null
          stripe_subscription_id?: string | null
          tier?: Database["public"]["Enums"]["user_tier"] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          minutes_used_this_month?: number | null
          monthly_minutes_limit?: number | null
          name?: string
          owner_id?: string | null
          stripe_subscription_id?: string | null
          tier?: Database["public"]["Enums"]["user_tier"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_my_workspace_ids: { Args: never; Returns: string[] }
      increment_workspace_usage: {
        Args: { p_minutes: number; p_workspace_id: string }
        Returns: undefined
      }
      reset_monthly_usage: { Args: never; Returns: undefined }
      search_transcripts: {
        Args: { search_query: string; workspace_filter?: string }
        Returns: {
          relevance: number
          snippet: string
          video_id: string
          video_title: string
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      user_tier: "free" | "pro" | "enterprise"
      video_status:
        | "queued"
        | "downloading"
        | "transcribing"
        | "ai_processing"
        | "completed"
        | "failed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      user_tier: ["free", "pro", "enterprise"],
      video_status: [
        "queued",
        "downloading",
        "transcribing",
        "ai_processing",
        "completed",
        "failed",
      ],
    },
  },
} as const
