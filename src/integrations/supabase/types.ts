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
      advertisements: {
        Row: {
          clicks: number
          content: string
          created_at: string
          end_date: string | null
          id: string
          image_url: string | null
          impressions: number
          is_active: boolean
          position: string
          start_date: string | null
          target_url: string | null
          title: string
        }
        Insert: {
          clicks?: number
          content: string
          created_at?: string
          end_date?: string | null
          id?: string
          image_url?: string | null
          impressions?: number
          is_active?: boolean
          position: string
          start_date?: string | null
          target_url?: string | null
          title: string
        }
        Update: {
          clicks?: number
          content?: string
          created_at?: string
          end_date?: string | null
          id?: string
          image_url?: string | null
          impressions?: number
          is_active?: boolean
          position?: string
          start_date?: string | null
          target_url?: string | null
          title?: string
        }
        Relationships: []
      }
      game_matches: {
        Row: {
          created_at: string
          duration: number
          finished_at: string | null
          game_type: string
          id: string
          player1_apm: number
          player1_id: string
          player1_lines: number
          player1_pps: number
          player1_score: number
          player2_apm: number
          player2_id: string | null
          player2_lines: number
          player2_pps: number
          player2_score: number
          status: string
          winner_id: string | null
        }
        Insert: {
          created_at?: string
          duration?: number
          finished_at?: string | null
          game_type: string
          id?: string
          player1_apm?: number
          player1_id: string
          player1_lines?: number
          player1_pps?: number
          player1_score?: number
          player2_apm?: number
          player2_id?: string | null
          player2_lines?: number
          player2_pps?: number
          player2_score?: number
          status?: string
          winner_id?: string | null
        }
        Update: {
          created_at?: string
          duration?: number
          finished_at?: string | null
          game_type?: string
          id?: string
          player1_apm?: number
          player1_id?: string
          player1_lines?: number
          player1_pps?: number
          player1_score?: number
          player2_apm?: number
          player2_id?: string | null
          player2_lines?: number
          player2_pps?: number
          player2_score?: number
          status?: string
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "game_matches_player1_id_fkey"
            columns: ["player1_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_matches_player2_id_fkey"
            columns: ["player2_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_matches_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      game_replays: {
        Row: {
          apm: number
          created_at: string
          duration: number
          final_lines: number
          final_score: number
          id: string
          match_id: string
          pps: number
          replay_data: Json
          user_id: string
        }
        Insert: {
          apm: number
          created_at?: string
          duration: number
          final_lines: number
          final_score: number
          id?: string
          match_id: string
          pps: number
          replay_data: Json
          user_id: string
        }
        Update: {
          apm?: number
          created_at?: string
          duration?: number
          final_lines?: number
          final_score?: number
          id?: string
          match_id?: string
          pps?: number
          replay_data?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_replays_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "game_matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_replays_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      game_replays_new: {
        Row: {
          apm: number
          created_at: string
          duration: number
          final_level: number
          final_lines: number
          final_score: number
          game_mode: string
          id: string
          is_personal_best: boolean | null
          is_world_record: boolean | null
          opponent_id: string | null
          pps: number
          replay_data: Json
          user_id: string
        }
        Insert: {
          apm?: number
          created_at?: string
          duration?: number
          final_level?: number
          final_lines?: number
          final_score?: number
          game_mode?: string
          id?: string
          is_personal_best?: boolean | null
          is_world_record?: boolean | null
          opponent_id?: string | null
          pps?: number
          replay_data: Json
          user_id: string
        }
        Update: {
          apm?: number
          created_at?: string
          duration?: number
          final_level?: number
          final_lines?: number
          final_score?: number
          game_mode?: string
          id?: string
          is_personal_best?: boolean | null
          is_world_record?: boolean | null
          opponent_id?: string | null
          pps?: number
          replay_data?: Json
          user_id?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          best_apm: number
          best_pps: number
          created_at: string
          email: string
          games_played: number
          games_won: number
          id: string
          rank: string
          rating: number
          total_lines: number
          total_score: number
          updated_at: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          best_apm?: number
          best_pps?: number
          created_at?: string
          email: string
          games_played?: number
          games_won?: number
          id: string
          rank?: string
          rating?: number
          total_lines?: number
          total_score?: number
          updated_at?: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          best_apm?: number
          best_pps?: number
          created_at?: string
          email?: string
          games_played?: number
          games_won?: number
          id?: string
          rank?: string
          rating?: number
          total_lines?: number
          total_score?: number
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          arr: number
          controls: Json
          created_at: string
          das: number
          enable_ghost: boolean
          enable_sound: boolean
          id: string
          master_volume: number
          sdf: number
          updated_at: string
          user_id: string
        }
        Insert: {
          arr?: number
          controls?: Json
          created_at?: string
          das?: number
          enable_ghost?: boolean
          enable_sound?: boolean
          id?: string
          master_volume?: number
          sdf?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          arr?: number
          controls?: Json
          created_at?: string
          das?: number
          enable_ghost?: boolean
          enable_sound?: boolean
          id?: string
          master_volume?: number
          sdf?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
