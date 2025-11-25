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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      ad_clicks: {
        Row: {
          ad_id: string | null
          clicked_url: string | null
          device_type: string | null
          id: string
          language: string | null
          region: string | null
          timestamp: string | null
          user_id: string | null
        }
        Insert: {
          ad_id?: string | null
          clicked_url?: string | null
          device_type?: string | null
          id?: string
          language?: string | null
          region?: string | null
          timestamp?: string | null
          user_id?: string | null
        }
        Update: {
          ad_id?: string | null
          clicked_url?: string | null
          device_type?: string | null
          id?: string
          language?: string | null
          region?: string | null
          timestamp?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_clicks_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "advertisements"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_impressions: {
        Row: {
          ad_id: string | null
          device_type: string | null
          id: string
          ip_address: unknown
          language: string | null
          region: string | null
          session_id: string | null
          timestamp: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          ad_id?: string | null
          device_type?: string | null
          id?: string
          ip_address?: unknown
          language?: string | null
          region?: string | null
          session_id?: string | null
          timestamp?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          ad_id?: string | null
          device_type?: string | null
          id?: string
          ip_address?: unknown
          language?: string | null
          region?: string | null
          session_id?: string | null
          timestamp?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_impressions_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "advertisements"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_management_logs: {
        Row: {
          action: string | null
          ad_id: string | null
          admin_id: string | null
          details: Json | null
          id: string
          timestamp: string | null
        }
        Insert: {
          action?: string | null
          ad_id?: string | null
          admin_id?: string | null
          details?: Json | null
          id?: string
          timestamp?: string | null
        }
        Update: {
          action?: string | null
          ad_id?: string | null
          admin_id?: string | null
          details?: Json | null
          id?: string
          timestamp?: string | null
        }
        Relationships: []
      }
      admin_activity_logs: {
        Row: {
          action_type: string
          admin_user_id: string
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          target_user_id: string | null
          target_username: string | null
          user_agent: string | null
        }
        Insert: {
          action_type: string
          admin_user_id: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          target_user_id?: string | null
          target_username?: string | null
          user_agent?: string | null
        }
        Update: {
          action_type?: string
          admin_user_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          target_user_id?: string | null
          target_username?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      advertisements: {
        Row: {
          ab_test_group: string | null
          budget: number | null
          clicks: number
          content: string
          created_at: string
          end_date: string | null
          frequency_cap: number | null
          id: string
          image_url: string | null
          impressions: number
          is_active: boolean
          language: string | null
          position: string
          priority: number | null
          region: string | null
          spent: number | null
          start_date: string | null
          target_url: string | null
          title: string
        }
        Insert: {
          ab_test_group?: string | null
          budget?: number | null
          clicks?: number
          content: string
          created_at?: string
          end_date?: string | null
          frequency_cap?: number | null
          id?: string
          image_url?: string | null
          impressions?: number
          is_active?: boolean
          language?: string | null
          position: string
          priority?: number | null
          region?: string | null
          spent?: number | null
          start_date?: string | null
          target_url?: string | null
          title: string
        }
        Update: {
          ab_test_group?: string | null
          budget?: number | null
          clicks?: number
          content?: string
          created_at?: string
          end_date?: string | null
          frequency_cap?: number | null
          id?: string
          image_url?: string | null
          impressions?: number
          is_active?: boolean
          language?: string | null
          position?: string
          priority?: number | null
          region?: string | null
          spent?: number | null
          start_date?: string | null
          target_url?: string | null
          title?: string
        }
        Relationships: []
      }
      auth_rate_limits: {
        Row: {
          attempt_type: string
          attempts: number | null
          blocked_until: string | null
          first_attempt: string | null
          id: string
          ip_address: unknown
          last_attempt: string | null
        }
        Insert: {
          attempt_type: string
          attempts?: number | null
          blocked_until?: string | null
          first_attempt?: string | null
          id?: string
          ip_address: unknown
          last_attempt?: string | null
        }
        Update: {
          attempt_type?: string
          attempts?: number | null
          blocked_until?: string | null
          first_attempt?: string | null
          id?: string
          ip_address?: unknown
          last_attempt?: string | null
        }
        Relationships: []
      }
      badges: {
        Row: {
          badge_id: string
          category: string
          created_at: string | null
          description_en: string
          description_zh: string
          icon_url: string | null
          id: string
          name_en: string
          name_zh: string
          rarity: string
          unlock_condition: Json
        }
        Insert: {
          badge_id: string
          category: string
          created_at?: string | null
          description_en: string
          description_zh: string
          icon_url?: string | null
          id?: string
          name_en: string
          name_zh: string
          rarity: string
          unlock_condition: Json
        }
        Update: {
          badge_id?: string
          category?: string
          created_at?: string | null
          description_en?: string
          description_zh?: string
          icon_url?: string | null
          id?: string
          name_en?: string
          name_zh?: string
          rarity?: string
          unlock_condition?: Json
        }
        Relationships: []
      }
      battle_participants: {
        Row: {
          eliminated_at: string | null
          id: string
          joined_at: string
          losses: number
          position: number
          room_id: string
          score: number
          status: string
          team: string | null
          user_id: string
          username: string
          wins: number
        }
        Insert: {
          eliminated_at?: string | null
          id?: string
          joined_at?: string
          losses?: number
          position: number
          room_id: string
          score?: number
          status?: string
          team?: string | null
          user_id: string
          username: string
          wins?: number
        }
        Update: {
          eliminated_at?: string | null
          id?: string
          joined_at?: string
          losses?: number
          position?: number
          room_id?: string
          score?: number
          status?: string
          team?: string | null
          user_id?: string
          username?: string
          wins?: number
        }
        Relationships: [
          {
            foreignKeyName: "battle_participants_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "battle_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      battle_records: {
        Row: {
          attack_received: number
          attack_sent: number
          created_at: string
          duration_seconds: number | null
          id: string
          lines_cleared: number
          loser_id: string | null
          loser_score: number
          match_number: number
          room_id: string
          winner_id: string | null
          winner_score: number
        }
        Insert: {
          attack_received?: number
          attack_sent?: number
          created_at?: string
          duration_seconds?: number | null
          id?: string
          lines_cleared?: number
          loser_id?: string | null
          loser_score?: number
          match_number: number
          room_id: string
          winner_id?: string | null
          winner_score?: number
        }
        Update: {
          attack_received?: number
          attack_sent?: number
          created_at?: string
          duration_seconds?: number | null
          id?: string
          lines_cleared?: number
          loser_id?: string | null
          loser_score?: number
          match_number?: number
          room_id?: string
          winner_id?: string | null
          winner_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "battle_records_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "battle_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      battle_rooms: {
        Row: {
          allow_spectators: boolean | null
          created_at: string
          created_by: string
          current_players: number
          custom_settings: Json | null
          finished_at: string | null
          id: string
          max_players: number
          mode: string
          room_code: string
          room_password: string | null
          settings: Json | null
          spectator_count: number | null
          started_at: string | null
          status: string
          team_mode: boolean | null
          team_size: number | null
        }
        Insert: {
          allow_spectators?: boolean | null
          created_at?: string
          created_by: string
          current_players?: number
          custom_settings?: Json | null
          finished_at?: string | null
          id?: string
          max_players?: number
          mode: string
          room_code: string
          room_password?: string | null
          settings?: Json | null
          spectator_count?: number | null
          started_at?: string | null
          status?: string
          team_mode?: boolean | null
          team_size?: number | null
        }
        Update: {
          allow_spectators?: boolean | null
          created_at?: string
          created_by?: string
          current_players?: number
          custom_settings?: Json | null
          finished_at?: string | null
          id?: string
          max_players?: number
          mode?: string
          room_code?: string
          room_password?: string | null
          settings?: Json | null
          spectator_count?: number | null
          started_at?: string | null
          status?: string
          team_mode?: boolean | null
          team_size?: number | null
        }
        Relationships: []
      }
      compressed_replays: {
        Row: {
          actions_count: number
          apm: number
          checksum: string
          compressed_actions: string
          compression_ratio: number
          created_at: string
          duration_seconds: number
          final_level: number
          final_lines: number
          final_score: number
          game_id: string | null
          game_mode: string
          game_settings: Json
          game_type: string
          id: string
          initial_board: Json
          is_featured: boolean
          is_personal_best: boolean
          is_playable: boolean | null
          is_world_record: boolean
          match_id: string | null
          opponent_id: string | null
          place_actions_count: number | null
          pps: number
          seed: string
          updated_at: string
          user_id: string
          username: string | null
          version: string
        }
        Insert: {
          actions_count?: number
          apm?: number
          checksum: string
          compressed_actions: string
          compression_ratio?: number
          created_at?: string
          duration_seconds?: number
          final_level?: number
          final_lines?: number
          final_score?: number
          game_id?: string | null
          game_mode: string
          game_settings?: Json
          game_type?: string
          id?: string
          initial_board?: Json
          is_featured?: boolean
          is_personal_best?: boolean
          is_playable?: boolean | null
          is_world_record?: boolean
          match_id?: string | null
          opponent_id?: string | null
          place_actions_count?: number | null
          pps?: number
          seed: string
          updated_at?: string
          user_id: string
          username?: string | null
          version?: string
        }
        Update: {
          actions_count?: number
          apm?: number
          checksum?: string
          compressed_actions?: string
          compression_ratio?: number
          created_at?: string
          duration_seconds?: number
          final_level?: number
          final_lines?: number
          final_score?: number
          game_id?: string | null
          game_mode?: string
          game_settings?: Json
          game_type?: string
          id?: string
          initial_board?: Json
          is_featured?: boolean
          is_personal_best?: boolean
          is_playable?: boolean | null
          is_world_record?: boolean
          match_id?: string | null
          opponent_id?: string | null
          place_actions_count?: number | null
          pps?: number
          seed?: string
          updated_at?: string
          user_id?: string
          username?: string | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "compressed_replays_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "match_games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compressed_replays_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "ranked_matches"
            referencedColumns: ["id"]
          },
        ]
      }
      friend_requests: {
        Row: {
          created_at: string
          id: string
          message: string | null
          receiver_id: string
          sender_id: string
          status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          receiver_id: string
          sender_id: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          receiver_id?: string
          sender_id?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      friendships: {
        Row: {
          created_at: string
          friend_id: string
          id: string
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          friend_id: string
          id?: string
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          friend_id?: string
          id?: string
          status?: string | null
          user_id?: string
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
      game_modes: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          target_lines: number | null
          time_limit: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          target_lines?: number | null
          time_limit?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          target_lines?: number | null
          time_limit?: number | null
        }
        Relationships: []
      }
      game_replays: {
        Row: {
          apm: number
          created_at: string
          duration: number
          final_lines: number
          final_score: number
          game_mode: string | null
          id: string
          is_public: boolean | null
          match_id: string
          metadata: Json | null
          pps: number
          replay_data: Json
          room_id: string | null
          user_id: string
        }
        Insert: {
          apm: number
          created_at?: string
          duration: number
          final_lines: number
          final_score: number
          game_mode?: string | null
          id?: string
          is_public?: boolean | null
          match_id: string
          metadata?: Json | null
          pps: number
          replay_data: Json
          room_id?: string | null
          user_id: string
        }
        Update: {
          apm?: number
          created_at?: string
          duration?: number
          final_lines?: number
          final_score?: number
          game_mode?: string | null
          id?: string
          is_public?: boolean | null
          match_id?: string
          metadata?: Json | null
          pps?: number
          replay_data?: Json
          room_id?: string | null
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
            foreignKeyName: "game_replays_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "battle_rooms"
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
          game_events: Json | null
          game_mode: string
          game_settings: Json | null
          id: string
          is_personal_best: boolean | null
          is_world_record: boolean | null
          key_inputs: Json | null
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
          game_events?: Json | null
          game_mode?: string
          game_settings?: Json | null
          id?: string
          is_personal_best?: boolean | null
          is_world_record?: boolean | null
          key_inputs?: Json | null
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
          game_events?: Json | null
          game_mode?: string
          game_settings?: Json | null
          id?: string
          is_personal_best?: boolean | null
          is_world_record?: boolean | null
          key_inputs?: Json | null
          opponent_id?: string | null
          pps?: number
          replay_data?: Json
          user_id?: string
        }
        Relationships: []
      }
      league_rankings: {
        Row: {
          best_streak: number
          current_streak: number
          elo_rating: number
          games_lost: number
          games_played: number
          games_won: number
          id: string
          last_played_at: string | null
          longest_win_streak: number
          matches_played: number
          peak_rating: number
          promotion_protection_games: number
          provisional: boolean | null
          rank_tier: string
          rating: number
          rating_deviation: number | null
          season_id: string
          updated_at: string
          user_id: string
          volatility: number | null
          win_streak: number
        }
        Insert: {
          best_streak?: number
          current_streak?: number
          elo_rating?: number
          games_lost?: number
          games_played?: number
          games_won?: number
          id?: string
          last_played_at?: string | null
          longest_win_streak?: number
          matches_played?: number
          peak_rating?: number
          promotion_protection_games?: number
          provisional?: boolean | null
          rank_tier?: string
          rating?: number
          rating_deviation?: number | null
          season_id: string
          updated_at?: string
          user_id: string
          volatility?: number | null
          win_streak?: number
        }
        Update: {
          best_streak?: number
          current_streak?: number
          elo_rating?: number
          games_lost?: number
          games_played?: number
          games_won?: number
          id?: string
          last_played_at?: string | null
          longest_win_streak?: number
          matches_played?: number
          peak_rating?: number
          promotion_protection_games?: number
          provisional?: boolean | null
          rank_tier?: string
          rating?: number
          rating_deviation?: number | null
          season_id?: string
          updated_at?: string
          user_id?: string
          volatility?: number | null
          win_streak?: number
        }
        Relationships: [
          {
            foreignKeyName: "league_rankings_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "league_seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      league_seasons: {
        Row: {
          created_at: string
          end_date: string
          id: string
          name: string
          settings: Json | null
          start_date: string
          status: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          name: string
          settings?: Json | null
          start_date: string
          status?: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          name?: string
          settings?: Json | null
          start_date?: string
          status?: string
        }
        Relationships: []
      }
      match_games: {
        Row: {
          attacks_received: Json
          attacks_sent: Json
          created_at: string
          duration_seconds: number
          finished_at: string
          game_number: number
          game_seed: string
          id: string
          loser_apm: number
          loser_id: string
          loser_lines: number
          loser_pps: number
          loser_score: number
          match_id: string
          winner_apm: number
          winner_id: string
          winner_lines: number
          winner_pps: number
          winner_score: number
        }
        Insert: {
          attacks_received?: Json
          attacks_sent?: Json
          created_at?: string
          duration_seconds?: number
          finished_at?: string
          game_number: number
          game_seed: string
          id?: string
          loser_apm?: number
          loser_id: string
          loser_lines?: number
          loser_pps?: number
          loser_score?: number
          match_id: string
          winner_apm?: number
          winner_id: string
          winner_lines?: number
          winner_pps?: number
          winner_score?: number
        }
        Update: {
          attacks_received?: Json
          attacks_sent?: Json
          created_at?: string
          duration_seconds?: number
          finished_at?: string
          game_number?: number
          game_seed?: string
          id?: string
          loser_apm?: number
          loser_id?: string
          loser_lines?: number
          loser_pps?: number
          loser_score?: number
          match_id?: string
          winner_apm?: number
          winner_id?: string
          winner_lines?: number
          winner_pps?: number
          winner_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "match_games_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "ranked_matches"
            referencedColumns: ["id"]
          },
        ]
      }
      password_reset_tokens: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          token: string
          used: boolean | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          token: string
          used?: boolean | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          token?: string
          used?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      private_messages: {
        Row: {
          content: string
          conversation_id: string | null
          created_at: string
          id: string
          is_read: boolean | null
          receiver_id: string
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean | null
          receiver_id: string
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean | null
          receiver_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      ranked_matches: {
        Row: {
          best_of: number
          created_at: string
          current_game: number
          finished_at: string | null
          id: string
          match_type: string
          player1_id: string
          player1_rating: number
          player1_wins: number
          player2_id: string
          player2_rating: number
          player2_wins: number
          room_id: string | null
          season_id: string | null
          seed: string
          started_at: string | null
          status: string
          winner_id: string | null
        }
        Insert: {
          best_of?: number
          created_at?: string
          current_game?: number
          finished_at?: string | null
          id?: string
          match_type?: string
          player1_id: string
          player1_rating?: number
          player1_wins?: number
          player2_id: string
          player2_rating?: number
          player2_wins?: number
          room_id?: string | null
          season_id?: string | null
          seed: string
          started_at?: string | null
          status?: string
          winner_id?: string | null
        }
        Update: {
          best_of?: number
          created_at?: string
          current_game?: number
          finished_at?: string | null
          id?: string
          match_type?: string
          player1_id?: string
          player1_rating?: number
          player1_wins?: number
          player2_id?: string
          player2_rating?: number
          player2_wins?: number
          room_id?: string | null
          season_id?: string | null
          seed?: string
          started_at?: string | null
          status?: string
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ranked_matches_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "battle_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      replay_bookmarks: {
        Row: {
          bookmark_type: string
          created_at: string
          description: string | null
          id: string
          is_public: boolean
          replay_id: string
          timestamp_ms: number
          title: string
          user_id: string
        }
        Insert: {
          bookmark_type: string
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          replay_id: string
          timestamp_ms: number
          title: string
          user_id: string
        }
        Update: {
          bookmark_type?: string
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean
          replay_id?: string
          timestamp_ms?: number
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "replay_bookmarks_replay_id_fkey"
            columns: ["replay_id"]
            isOneToOne: false
            referencedRelation: "compressed_replays"
            referencedColumns: ["id"]
          },
        ]
      }
      room_messages: {
        Row: {
          created_at: string | null
          id: string
          message: string
          message_type: string | null
          room_id: string
          user_id: string
          username: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          message_type?: string | null
          room_id: string
          user_id: string
          username: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          message_type?: string | null
          room_id?: string
          user_id?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_room"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "battle_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "battle_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      room_spectators: {
        Row: {
          id: string
          joined_at: string | null
          room_id: string
          user_id: string
          username: string
        }
        Insert: {
          id?: string
          joined_at?: string | null
          room_id: string
          user_id: string
          username: string
        }
        Update: {
          id?: string
          joined_at?: string | null
          room_id?: string
          user_id?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_spectators_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "battle_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      security_events: {
        Row: {
          created_at: string | null
          event_data: Json | null
          event_type: string
          id: string
          ip_address: unknown
          session_id: string | null
          severity: string | null
          source: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_data?: Json | null
          event_type: string
          id?: string
          ip_address?: unknown
          session_id?: string | null
          severity?: string | null
          source?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_data?: Json | null
          event_type?: string
          id?: string
          ip_address?: unknown
          session_id?: string | null
          severity?: string | null
          source?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      stranger_message_counts: {
        Row: {
          id: string
          last_message_at: string | null
          message_count: number | null
          receiver_id: string
          sender_id: string
        }
        Insert: {
          id?: string
          last_message_at?: string | null
          message_count?: number | null
          receiver_id: string
          sender_id: string
        }
        Update: {
          id?: string
          last_message_at?: string | null
          message_count?: number | null
          receiver_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      subscribers: {
        Row: {
          created_at: string
          email: string
          friend_limit: number | null
          id: string
          stripe_customer_id: string | null
          subscribed: boolean
          subscription_end: string | null
          subscription_tier: string | null
          updated_at: string
          user_id: string | null
          username_changes_used: number | null
        }
        Insert: {
          created_at?: string
          email: string
          friend_limit?: number | null
          id?: string
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string | null
          username_changes_used?: number | null
        }
        Update: {
          created_at?: string
          email?: string
          friend_limit?: number | null
          id?: string
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string | null
          username_changes_used?: number | null
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          badge_id: string
          id: string
          is_featured: boolean | null
          progress: Json | null
          unlocked_at: string | null
          user_id: string
        }
        Insert: {
          badge_id: string
          id?: string
          is_featured?: boolean | null
          progress?: Json | null
          unlocked_at?: string | null
          user_id: string
        }
        Update: {
          badge_id?: string
          id?: string
          is_featured?: boolean | null
          progress?: Json | null
          unlocked_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["badge_id"]
          },
        ]
      }
      user_best_records: {
        Row: {
          achieved_at: string | null
          best_apm: number | null
          best_lines: number | null
          best_pps: number | null
          best_score: number | null
          best_time: number | null
          game_mode: string
          id: string
          replay_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          achieved_at?: string | null
          best_apm?: number | null
          best_lines?: number | null
          best_pps?: number | null
          best_score?: number | null
          best_time?: number | null
          game_mode: string
          id?: string
          replay_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          achieved_at?: string | null
          best_apm?: number | null
          best_lines?: number | null
          best_pps?: number | null
          best_score?: number | null
          best_time?: number | null
          game_mode?: string
          id?: string
          replay_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_best_records_replay_id_fkey"
            columns: ["replay_id"]
            isOneToOne: false
            referencedRelation: "game_replays_new"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          best_apm: number
          best_pps: number
          created_at: string
          email: string
          friend_limit: number | null
          games_played: number
          games_won: number
          id: string
          rank: string
          rating: number
          subscription_tier: string | null
          total_lines: number
          total_score: number
          updated_at: string
          user_type: string | null
          username: string
          username_changes_count: number | null
          username_changes_used: number | null
          username_last_changed_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          best_apm?: number
          best_pps?: number
          created_at?: string
          email: string
          friend_limit?: number | null
          games_played?: number
          games_won?: number
          id: string
          rank?: string
          rating?: number
          subscription_tier?: string | null
          total_lines?: number
          total_score?: number
          updated_at?: string
          user_type?: string | null
          username: string
          username_changes_count?: number | null
          username_changes_used?: number | null
          username_last_changed_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          best_apm?: number
          best_pps?: number
          created_at?: string
          email?: string
          friend_limit?: number | null
          games_played?: number
          games_won?: number
          id?: string
          rank?: string
          rating?: number
          subscription_tier?: string | null
          total_lines?: number
          total_score?: number
          updated_at?: string
          user_type?: string | null
          username?: string
          username_changes_count?: number | null
          username_changes_used?: number | null
          username_last_changed_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          granted_at: string | null
          granted_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_session_logs: {
        Row: {
          created_at: string
          game_mode: string | null
          id: string
          ip_address: string | null
          session_data: Json | null
          session_type: string
          user_agent: string | null
          user_id: string
          username: string
        }
        Insert: {
          created_at?: string
          game_mode?: string | null
          id?: string
          ip_address?: string | null
          session_data?: Json | null
          session_type: string
          user_agent?: string | null
          user_id: string
          username: string
        }
        Update: {
          created_at?: string
          game_mode?: string | null
          id?: string
          ip_address?: string | null
          session_data?: Json | null
          session_type?: string
          user_agent?: string | null
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          ip_address: unknown
          last_activity: string
          session_token: string
          session_token_hash: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          ip_address?: unknown
          last_activity?: string
          session_token: string
          session_token_hash?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          ip_address?: unknown
          last_activity?: string
          session_token?: string
          session_token_hash?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          arr: number
          auto_play_music: boolean | null
          back_to_menu: string | null
          background_music: string | null
          block_skin: string | null
          controls: Json
          created_at: string
          das: number
          dcd: number | null
          enable_achievement_animation: boolean | null
          enable_ghost: boolean
          enable_landing_effect: boolean | null
          enable_line_animation: boolean | null
          enable_sound: boolean
          enable_wallpaper: boolean | null
          ghost_opacity: number | null
          id: string
          loop_music: boolean | null
          master_volume: number
          music_volume: number | null
          sdf: number
          undo_steps: number | null
          updated_at: string
          user_id: string
          wallpaper_change_interval: number | null
          wallpaper_opacity: number | null
        }
        Insert: {
          arr?: number
          auto_play_music?: boolean | null
          back_to_menu?: string | null
          background_music?: string | null
          block_skin?: string | null
          controls?: Json
          created_at?: string
          das?: number
          dcd?: number | null
          enable_achievement_animation?: boolean | null
          enable_ghost?: boolean
          enable_landing_effect?: boolean | null
          enable_line_animation?: boolean | null
          enable_sound?: boolean
          enable_wallpaper?: boolean | null
          ghost_opacity?: number | null
          id?: string
          loop_music?: boolean | null
          master_volume?: number
          music_volume?: number | null
          sdf?: number
          undo_steps?: number | null
          updated_at?: string
          user_id: string
          wallpaper_change_interval?: number | null
          wallpaper_opacity?: number | null
        }
        Update: {
          arr?: number
          auto_play_music?: boolean | null
          back_to_menu?: string | null
          background_music?: string | null
          block_skin?: string | null
          controls?: Json
          created_at?: string
          das?: number
          dcd?: number | null
          enable_achievement_animation?: boolean | null
          enable_ghost?: boolean
          enable_landing_effect?: boolean | null
          enable_line_animation?: boolean | null
          enable_sound?: boolean
          enable_wallpaper?: boolean | null
          ghost_opacity?: number | null
          id?: string
          loop_music?: boolean | null
          master_volume?: number
          music_volume?: number | null
          sdf?: number
          undo_steps?: number | null
          updated_at?: string
          user_id?: string
          wallpaper_change_interval?: number | null
          wallpaper_opacity?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_elo_change: {
        Args: { k_factor?: number; loser_rating: number; winner_rating: number }
        Returns: {
          loser_new_rating: number
          winner_new_rating: number
        }[]
      }
      can_access_battle_room: {
        Args: { _room_id: string; _user_id: string }
        Returns: boolean
      }
      cleanup_expired_sessions: { Args: never; Returns: undefined }
      get_subscribers_safe: {
        Args: never
        Returns: {
          created_at: string
          friend_limit: number
          id: string
          masked_email: string
          stripe_status: string
          subscribed: boolean
          subscription_end: string
          subscription_tier: string
          updated_at: string
          user_id: string
          username_changes_used: number
        }[]
      }
      get_user_subscription_status: {
        Args: { check_user_id?: string }
        Returns: Json
      }
      get_user_subscription_tier: {
        Args: { _user_id?: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      join_room_by_code: { Args: { room_code_input: string }; Returns: Json }
      upsert_user_session: {
        Args: {
          _expires_at: string
          _last_activity: string
          _session_token: string
          _user_agent: string
          _user_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
