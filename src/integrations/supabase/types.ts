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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          id: string
          metadata: Json | null
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          created_at: string
          duration_seconds: number | null
          event_name: string
          id: string
          metadata: Json | null
          page: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          event_name: string
          id?: string
          metadata?: Json | null
          page?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          event_name?: string
          id?: string
          metadata?: Json | null
          page?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          description: string | null
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      bookmarks: {
        Row: {
          created_at: string
          id: string
          note: string | null
          page: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          page: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          page?: number
          user_id?: string
        }
        Relationships: []
      }
      daily_content: {
        Row: {
          arabic_text: string
          content_date: string
          content_type: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          reference: string | null
        }
        Insert: {
          arabic_text: string
          content_date: string
          content_type?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          reference?: string | null
        }
        Update: {
          arabic_text?: string
          content_date?: string
          content_type?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          reference?: string | null
        }
        Relationships: []
      }
      dynamic_strings: {
        Row: {
          description: string | null
          id: string
          key: string
          screen: string | null
          updated_at: string
          updated_by: string | null
          value: string
        }
        Insert: {
          description?: string | null
          id?: string
          key: string
          screen?: string | null
          updated_at?: string
          updated_by?: string | null
          value: string
        }
        Update: {
          description?: string | null
          id?: string
          key?: string
          screen?: string | null
          updated_at?: string
          updated_by?: string | null
          value?: string
        }
        Relationships: []
      }
      global_settings: {
        Row: {
          description: string | null
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      group_invitations: {
        Row: {
          created_at: string
          group_id: string
          id: string
          invited_by: string
          invited_user_id: string
          responded_at: string | null
          role: string
          status: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          invited_by: string
          invited_user_id: string
          responded_at?: string | null
          role?: string
          status?: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          invited_by?: string
          invited_user_id?: string
          responded_at?: string | null
          role?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_invitations_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string
          points: number
          progress: number
          role: string
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string
          points?: number
          progress?: number
          role?: string
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string
          points?: number
          progress?: number
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          created_at: string
          created_by: string
          group_type: string
          id: string
          image_url: string | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          group_type?: string
          id?: string
          image_url?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          group_type?: string
          id?: string
          image_url?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications_log: {
        Row: {
          body: string
          created_at: string
          created_by: string | null
          failed_count: number
          id: string
          sent_count: number
          title: string
          url: string | null
        }
        Insert: {
          body: string
          created_at?: string
          created_by?: string | null
          failed_count?: number
          id?: string
          sent_count?: number
          title: string
          url?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string | null
          failed_count?: number
          id?: string
          sent_count?: number
          title?: string
          url?: string | null
        }
        Relationships: []
      }
      point_adjustments: {
        Row: {
          admin_id: string
          created_at: string
          delta: number
          id: string
          reason: string
          user_id: string
        }
        Insert: {
          admin_id: string
          created_at?: string
          delta: number
          id?: string
          reason: string
          user_id: string
        }
        Update: {
          admin_id?: string
          created_at?: string
          delta?: number
          id?: string
          reason?: string
          user_id?: string
        }
        Relationships: []
      }
      premium_emails: {
        Row: {
          created_at: string
          created_by: string | null
          email: string
          id: string
          note: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email: string
          id?: string
          note?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email?: string
          id?: string
          note?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          status: string
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          status?: string
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          status?: string
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      reading_state: {
        Row: {
          last_page: number
          updated_at: string
          user_id: string
        }
        Insert: {
          last_page?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          last_page?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          body: string
          created_at: string
          id: string
          priority: string
          resolution_note: string | null
          resolved_by: string | null
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          priority?: string
          resolution_note?: string | null
          resolved_by?: string | null
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          priority?: string
          resolution_note?: string | null
          resolved_by?: string | null
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_id: string
          metadata: Json
          progress: number
          unlocked_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          metadata?: Json
          progress?: number
          unlocked_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          metadata?: Json
          progress?: number
          unlocked_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_activity: {
        Row: {
          device_info: Json
          last_active_at: string | null
          last_login_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          device_info?: Json
          last_active_at?: string | null
          last_login_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          device_info?: Json
          last_active_at?: string | null
          last_login_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          badge_id: string
          earned_at: string
          metadata: Json
          user_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string
          metadata?: Json
          user_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string
          metadata?: Json
          user_id?: string
        }
        Relationships: []
      }
      user_bans: {
        Row: {
          banned_at: string
          banned_by: string
          reason: string | null
          unbanned_at: string | null
          user_id: string
        }
        Insert: {
          banned_at?: string
          banned_by: string
          reason?: string | null
          unbanned_at?: string | null
          user_id: string
        }
        Update: {
          banned_at?: string
          banned_by?: string
          reason?: string | null
          unbanned_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_daily_detail: {
        Row: {
          azkar_evening: Json | null
          azkar_morning: Json | null
          completed: boolean
          date: string
          kahf_completed: boolean
          last_completed_page: number | null
          last_read_page: number | null
          points_awarded: Json
          start_page: number | null
          target_goal: number | null
          tracked_pages: Json
          updated_at: string
          usage_seconds: number
          user_id: string
        }
        Insert: {
          azkar_evening?: Json | null
          azkar_morning?: Json | null
          completed?: boolean
          date: string
          kahf_completed?: boolean
          last_completed_page?: number | null
          last_read_page?: number | null
          points_awarded?: Json
          start_page?: number | null
          target_goal?: number | null
          tracked_pages?: Json
          updated_at?: string
          usage_seconds?: number
          user_id: string
        }
        Update: {
          azkar_evening?: Json | null
          azkar_morning?: Json | null
          completed?: boolean
          date?: string
          kahf_completed?: boolean
          last_completed_page?: number | null
          last_read_page?: number | null
          points_awarded?: Json
          start_page?: number | null
          target_goal?: number | null
          tracked_pages?: Json
          updated_at?: string
          usage_seconds?: number
          user_id?: string
        }
        Relationships: []
      }
      user_daily_progress: {
        Row: {
          completion_pct: number
          date: string
          evening_done: boolean
          morning_done: boolean
          points: number
          quran_pages_read: number
          quran_target: number
          updated_at: string
          user_id: string
        }
        Insert: {
          completion_pct?: number
          date?: string
          evening_done?: boolean
          morning_done?: boolean
          points?: number
          quran_pages_read?: number
          quran_target?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          completion_pct?: number
          date?: string
          evening_done?: boolean
          morning_done?: boolean
          points?: number
          quran_pages_read?: number
          quran_target?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_gamification: {
        Row: {
          created_at: string
          current_level: number
          current_streak: number
          last_active_date: string | null
          longest_streak: number
          total_points: number
          total_tasbeeh: number
          total_xp: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_level?: number
          current_streak?: number
          last_active_date?: string | null
          longest_streak?: number
          total_points?: number
          total_tasbeeh?: number
          total_xp?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_level?: number
          current_streak?: number
          last_active_date?: string | null
          longest_streak?: number
          total_points?: number
          total_tasbeeh?: number
          total_xp?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_prayer_settings: {
        Row: {
          latitude: number
          longitude: number
          madhab: string
          method: string
          notify_asr: boolean
          notify_dhuhr: boolean
          notify_fajr: boolean
          notify_isha: boolean
          notify_maghrib: boolean
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          latitude: number
          longitude: number
          madhab?: string
          method?: string
          notify_asr?: boolean
          notify_dhuhr?: boolean
          notify_fajr?: boolean
          notify_isha?: boolean
          notify_maghrib?: boolean
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          latitude?: number
          longitude?: number
          madhab?: string
          method?: string
          notify_asr?: boolean
          notify_dhuhr?: boolean
          notify_fajr?: boolean
          notify_isha?: boolean
          notify_maghrib?: boolean
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          created_at: string
          friday_theme: boolean
          lossless_audio: boolean
          mushaf_mode: string
          notifications_enabled: boolean
          reminder_time: string
          sound_settings: Json
          system_settings: Json
          theme: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          friday_theme?: boolean
          lossless_audio?: boolean
          mushaf_mode?: string
          notifications_enabled?: boolean
          reminder_time?: string
          sound_settings?: Json
          system_settings?: Json
          theme?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          friday_theme?: boolean
          lossless_audio?: boolean
          mushaf_mode?: string
          notifications_enabled?: boolean
          reminder_time?: string
          sound_settings?: Json
          system_settings?: Json
          theme?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_wird_settings: {
        Row: {
          daily_goal: number
          locked_until: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          daily_goal?: number
          locked_until?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          daily_goal?: number
          locked_until?: string | null
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
      find_user_id_by_email: { Args: { _email: string }; Returns: string }
      is_current_user_premium: { Args: never; Returns: boolean }
      is_group_admin: {
        Args: { _group_id: string; _user_id: string }
        Returns: boolean
      }
      is_group_member: {
        Args: { _group_id: string; _user_id: string }
        Returns: boolean
      }
      shares_group_with: { Args: { _a: string; _b: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
