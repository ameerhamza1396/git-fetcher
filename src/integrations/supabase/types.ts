export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
    // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      ai_chat_sessions: {
        Row: {
          created_at: string
          id: string
          messages: Json | null
          session_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          messages?: Json | null
          session_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          messages?: Json | null
          session_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_generated_tests: {
        Row: {
          accuracy: number | null
          difficulty: string
          generated_at: string
          id: string
          questions: Json
          score: number | null
          test_taken: boolean | null
          topic: string
          total_questions: number
          user_id: string
        }
        Insert: {
          accuracy?: number | null
          difficulty: string
          generated_at?: string
          id?: string
          questions: Json
          score?: number | null
          test_taken?: boolean | null
          topic: string
          total_questions: number
          user_id: string
        }
        Update: {
          accuracy?: number | null
          difficulty?: string
          generated_at?: string
          id?: string
          questions?: Json
          score?: number | null
          test_taken?: boolean | null
          topic?: string
          total_questions?: number
          user_id?: string
        }
        Relationships: []
      }
      ambassador_applications: {
        Row: {
          college_id_card_url: string
          college_name: string
          contact_number: string
          created_at: string | null
          education: string
          email: string
          id: string
          name: string
          profile_picture_url: string
          recent_marksheet_url: string
          user_id: string | null
        }
        Insert: {
          college_id_card_url: string
          college_name: string
          contact_number: string
          created_at?: string | null
          education: string
          email: string
          id?: string
          name: string
          profile_picture_url: string
          recent_marksheet_url: string
          user_id?: string | null
        }
        Update: {
          college_id_card_url?: string
          college_name?: string
          contact_number?: string
          created_at?: string | null
          education?: string
          email?: string
          id?: string
          name?: string
          profile_picture_url?: string
          recent_marksheet_url?: string
          user_id?: string | null
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          created_at: string
          setting_name: string
          setting_value: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          setting_name: string
          setting_value?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          setting_name?: string
          setting_value?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      battle_participants: {
        Row: {
          answers: Json | null
          battle_room_id: string | null
          created_at: string
          id: string
          is_ready: boolean | null
          joined_at: string
          kicked_at: string | null
          score: number | null
          team: number | null
          user_id: string
          username: string
        }
        Insert: {
          answers?: Json | null
          battle_room_id?: string | null
          created_at?: string
          id?: string
          is_ready?: boolean | null
          joined_at?: string
          kicked_at?: string | null
          score?: number | null
          team?: number | null
          user_id: string
          username: string
        }
        Update: {
          answers?: Json | null
          battle_room_id?: string | null
          created_at?: string
          id?: string
          is_ready?: boolean | null
          joined_at?: string
          kicked_at?: string | null
          score?: number | null
          team?: number | null
          user_id?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "battle_participants_battle_room_id_fkey"
            columns: ["battle_room_id"]
            isOneToOne: false
            referencedRelation: "battle_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      battle_results: {
        Row: {
          accuracy_percentage: number | null
          battle_room_id: string | null
          created_at: string
          final_score: number
          id: string
          rank: number
          time_bonus: number | null
          total_correct: number
          total_questions: number
          user_id: string
        }
        Insert: {
          accuracy_percentage?: number | null
          battle_room_id?: string | null
          created_at?: string
          final_score: number
          id?: string
          rank: number
          time_bonus?: number | null
          total_correct: number
          total_questions: number
          user_id: string
        }
        Update: {
          accuracy_percentage?: number | null
          battle_room_id?: string | null
          created_at?: string
          final_score?: number
          id?: string
          rank?: number
          time_bonus?: number | null
          total_correct?: number
          total_questions?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "battle_results_battle_room_id_fkey"
            columns: ["battle_room_id"]
            isOneToOne: false
            referencedRelation: "battle_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      battle_rooms: {
        Row: {
          battle_type: string
          chapter_id: string | null
          countdown_initiated_at: string | null
          created_at: string
          current_players: number | null
          current_question: number | null
          ended_at: string | null
          host_id: string | null
          host_ping_requested_at: string | null
          id: string
          last_ping_sender_id: string | null
          last_ping_sender_username: string | null
          max_players: number
          questions: Json | null
          room_code: string
          started_at: string | null
          status: string
          subject: string | null
          subject_id: string | null
          time_per_question: number | null
          total_questions: number | null
        }
        Insert: {
          battle_type: string
          chapter_id?: string | null
          countdown_initiated_at?: string | null
          created_at?: string
          current_players?: number | null
          current_question?: number | null
          ended_at?: string | null
          host_id?: string | null
          host_ping_requested_at?: string | null
          id?: string
          last_ping_sender_id?: string | null
          last_ping_sender_username?: string | null
          max_players: number
          questions?: Json | null
          room_code: string
          started_at?: string | null
          status?: string
          subject?: string | null
          subject_id?: string | null
          time_per_question?: number | null
          total_questions?: number | null
        }
        Update: {
          battle_type?: string
          chapter_id?: string | null
          countdown_initiated_at?: string | null
          created_at?: string
          current_players?: number | null
          current_question?: number | null
          ended_at?: string | null
          host_id?: string | null
          host_ping_requested_at?: string | null
          id?: string
          last_ping_sender_id?: string | null
          last_ping_sender_username?: string | null
          max_players?: number
          questions?: Json | null
          room_code?: string
          started_at?: string | null
          status?: string
          subject?: string | null
          subject_id?: string | null
          time_per_question?: number | null
          total_questions?: number | null
        }
        Relationships: []
      }
      chapters: {
        Row: {
          chapter_number: number
          created_at: string
          description: string | null
          id: string
          name: string
          subject_id: string | null
        }
        Insert: {
          chapter_number: number
          created_at?: string
          description?: string | null
          id?: string
          name: string
          subject_id?: string | null
        }
        Update: {
          chapter_number?: number
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          subject_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chapters_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      classroom_members: {
        Row: {
          classroom_id: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          classroom_id: string
          created_at?: string
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          classroom_id?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "classroom_members_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
        ]
      }
      classrooms: {
        Row: {
          created_at: string
          description: string | null
          host_id: string
          id: string
          invite_code: string | null
          is_public: boolean
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          host_id: string
          id?: string
          invite_code?: string | null
          is_public?: boolean
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          host_id?: string
          id?: string
          invite_code?: string | null
          is_public?: boolean
          name?: string
        }
        Relationships: []
      }
      internship_applications: {
        Row: {
          application_status: string
          cnic_student_card_url: string
          contact_number: string
          created_at: string | null
          email: string
          gender: string
          id: string
          name: string
          profile_picture_url: string
          skill_experience: string
          skills_to_apply: Json
          user_id: string | null
          user_skills: string
          why_join_medistics: string
        }
        Insert: {
          application_status?: string
          cnic_student_card_url: string
          contact_number: string
          created_at?: string | null
          email: string
          gender: string
          id?: string
          name: string
          profile_picture_url: string
          skill_experience: string
          skills_to_apply: Json
          user_id?: string | null
          user_skills: string
          why_join_medistics: string
        }
        Update: {
          application_status?: string
          cnic_student_card_url?: string
          contact_number?: string
          created_at?: string | null
          email?: string
          gender?: string
          id?: string
          name?: string
          profile_picture_url?: string
          skill_experience?: string
          skills_to_apply?: Json
          user_id?: string | null
          user_skills?: string
          why_join_medistics?: string
        }
        Relationships: [
          {
            foreignKeyName: "internship_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      leaderboard_entries: {
        Row: {
          battles_won: number | null
          best_streak: number | null
          current_streak: number | null
          id: string
          rank_points: number | null
          tier: string | null
          total_battles: number | null
          total_score: number | null
          updated_at: string
          user_id: string
          username: string
          win_rate: number | null
        }
        Insert: {
          battles_won?: number | null
          best_streak?: number | null
          current_streak?: number | null
          id?: string
          rank_points?: number | null
          tier?: string | null
          total_battles?: number | null
          total_score?: number | null
          updated_at?: string
          user_id: string
          username: string
          win_rate?: number | null
        }
        Update: {
          battles_won?: number | null
          best_streak?: number | null
          current_streak?: number | null
          id?: string
          rank_points?: number | null
          tier?: string | null
          total_battles?: number | null
          total_score?: number | null
          updated_at?: string
          user_id?: string
          username?: string
          win_rate?: number | null
        }
        Relationships: []
      }
      manual_payment_requests: {
        Row: {
          cloudinary_proof_url: string
          currency: string
          duration: string
          email: string
          id: string
          name: string | null
          plan_name: string
          price: number
          status: string
          submission_timestamp: string
          user_id: string
        }
        Insert: {
          cloudinary_proof_url: string
          currency: string
          duration: string
          email: string
          id?: string
          name?: string | null
          plan_name: string
          price: number
          status?: string
          submission_timestamp?: string
          user_id: string
        }
        Update: {
          cloudinary_proof_url?: string
          currency?: string
          duration?: string
          email?: string
          id?: string
          name?: string | null
          plan_name?: string
          price?: number
          status?: string
          submission_timestamp?: string
          user_id?: string
        }
        Relationships: []
      }
      mcqs: {
        Row: {
          category: string | null
          chapter_id: string | null
          correct_answer: string
          created_at: string | null
          difficulty: string | null
          explanation: string | null
          id: string
          options: Json
          question: string
          subject: string | null
        }
        Insert: {
          category?: string | null
          chapter_id?: string | null
          correct_answer: string
          created_at?: string | null
          difficulty?: string | null
          explanation?: string | null
          id?: string
          options: Json
          question: string
          subject?: string | null
        }
        Update: {
          category?: string | null
          chapter_id?: string | null
          correct_answer?: string
          created_at?: string | null
          difficulty?: string | null
          explanation?: string | null
          id?: string
          options?: Json
          question?: string
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mcqs_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      mock_test_questions: {
        Row: {
          correct_answer: string
          created_at: string | null
          explanation: string | null
          id: number
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          question: string
        }
        Insert: {
          correct_answer: string
          created_at?: string | null
          explanation?: string | null
          id?: number
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          question: string
        }
        Update: {
          correct_answer?: string
          created_at?: string | null
          explanation?: string | null
          id?: number
          option_a?: string
          option_b?: string
          option_c?: string
          option_d?: string
          question?: string
        }
        Relationships: []
      }
      payment_submissions: {
        Row: {
          admin_status: string
          amount: number
          created_at: string
          currency: string
          email: string
          full_name: string
          id: string
          plan_purchased: string
          plan_validity: string
          proof_url: string
          submission_timestamp: string
          user_id: string | null
          username: string | null
        }
        Insert: {
          admin_status?: string
          amount: number
          created_at?: string
          currency: string
          email: string
          full_name: string
          id?: string
          plan_purchased: string
          plan_validity: string
          proof_url: string
          submission_timestamp?: string
          user_id?: string | null
          username?: string | null
        }
        Update: {
          admin_status?: string
          amount?: number
          created_at?: string
          currency?: string
          email?: string
          full_name?: string
          id?: string
          plan_purchased?: string
          plan_validity?: string
          proof_url?: string
          submission_timestamp?: string
          user_id?: string | null
          username?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          full_name: string | null
          id: string
          plan: string
          plan_expiry_date: string | null
          role: string | null
          updated_at: string | null
          username: string | null
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          full_name?: string | null
          id: string
          plan?: string
          plan_expiry_date?: string | null
          role?: string | null
          updated_at?: string | null
          username?: string | null
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          full_name?: string | null
          id?: string
          plan?: string
          plan_expiry_date?: string | null
          role?: string | null
          updated_at?: string | null
          username?: string | null
          website?: string | null
        }
        Relationships: []
      }
      study_materials: {
        Row: {
          chapter_id: string | null
          created_at: string
          description: string | null
          file_name: string
          file_size: number | null
          file_type: string
          file_url: string
          id: string
          subject_id: string | null
          title: string
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          chapter_id?: string | null
          created_at?: string
          description?: string | null
          file_name: string
          file_size?: number | null
          file_type: string
          file_url: string
          id?: string
          subject_id?: string | null
          title: string
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          chapter_id?: string | null
          created_at?: string
          description?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string
          file_url?: string
          id?: string
          subject_id?: string | null
          title?: string
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_materials_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_materials_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      teaching_ambassador_applications: {
        Row: {
          cnic_url: string
          contact_number: string
          created_at: string | null
          email: string
          gender: string
          id: string
          name: string
          profile_picture_url: string
          subjects: Json
          teaching_experience: string
          user_id: string | null
          why_join_medistics: string
        }
        Insert: {
          cnic_url: string
          contact_number: string
          created_at?: string | null
          email: string
          gender: string
          id?: string
          name: string
          profile_picture_url: string
          subjects: Json
          teaching_experience: string
          user_id?: string | null
          why_join_medistics: string
        }
        Update: {
          cnic_url?: string
          contact_number?: string
          created_at?: string | null
          email?: string
          gender?: string
          id?: string
          name?: string
          profile_picture_url?: string
          subjects?: Json
          teaching_experience?: string
          user_id?: string | null
          why_join_medistics?: string
        }
        Relationships: []
      }
      test_configs: {
        Row: {
          created_at: string | null
          end_time: string
          id: string
          test_name: string
          unlock_time: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          end_time: string
          id?: string
          test_name: string
          unlock_time: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          end_time?: string
          id?: string
          test_name?: string
          unlock_time?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_answers: {
        Row: {
          created_at: string
          id: string
          is_correct: boolean
          mcq_id: string | null
          selected_answer: string
          time_taken: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_correct: boolean
          mcq_id?: string | null
          selected_answer: string
          time_taken?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_correct?: boolean
          mcq_id?: string | null
          selected_answer?: string
          time_taken?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_answers_mcq_id_fkey"
            columns: ["mcq_id"]
            isOneToOne: false
            referencedRelation: "mcqs"
            referencedColumns: ["id"]
          },
        ]
      }
      user_progress: {
        Row: {
          accuracy_percentage: number | null
          chapter_id: string | null
          correct_answers: number | null
          created_at: string
          id: string
          last_attempted: string | null
          streak_days: number | null
          total_questions: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          accuracy_percentage?: number | null
          chapter_id?: string | null
          correct_answers?: number | null
          created_at?: string
          id?: string
          last_attempted?: string | null
          streak_days?: number | null
          total_questions?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          accuracy_percentage?: number | null
          chapter_id?: string | null
          correct_answers?: number | null
          created_at?: string
          id?: string
          last_attempted?: string | null
          streak_days?: number | null
          total_questions?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_progress_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      user_question_attempts: {
        Row: {
          attempted_at: string
          correct_answer: string
          id: string
          is_correct: boolean
          is_skipped: boolean
          question_id: number
          test_result_id: string
          user_answer: string | null
          user_id: string
        }
        Insert: {
          attempted_at?: string
          correct_answer: string
          id?: string
          is_correct?: boolean
          is_skipped?: boolean
          question_id: number
          test_result_id: string
          user_answer?: string | null
          user_id: string
        }
        Update: {
          attempted_at?: string
          correct_answer?: string
          id?: string
          is_correct?: boolean
          is_skipped?: boolean
          question_id?: number
          test_result_id?: string
          user_answer?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_question_attempts_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "mock_test_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_question_attempts_test_result_id_fkey"
            columns: ["test_result_id"]
            isOneToOne: false
            referencedRelation: "user_test_results"
            referencedColumns: ["id"]
          },
        ]
      }
      user_scores: {
        Row: {
          created_at: string | null
          id: string
          quiz_type: string
          score: number
          total_questions: number
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          quiz_type: string
          score: number
          total_questions: number
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          quiz_type?: string
          score?: number
          total_questions?: number
          user_id?: string
        }
        Relationships: []
      }
      user_test_results: {
        Row: {
          completed_at: string | null
          id: string
          score: number
          test_config_id: string | null
          total_questions: number
          user_id: string | null
          user_responses: Json | null
          username: string
        }
        Insert: {
          completed_at?: string | null
          id?: string
          score: number
          test_config_id?: string | null
          total_questions: number
          user_id?: string | null
          user_responses?: Json | null
          username: string
        }
        Update: {
          completed_at?: string | null
          id?: string
          score?: number
          test_config_id?: string | null
          total_questions?: number
          user_id?: string | null
          user_responses?: Json | null
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_test_results_test_config_id_fkey"
            columns: ["test_config_id"]
            isOneToOne: false
            referencedRelation: "test_configs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      expire_old_plans: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      get_user_classroom_memberships: {
        Args: { p_user_id: string }
        Returns: {
          classroom_id: string
          user_id: string
          role: string
        }[]
      }
      has_role_on_profiles: {
        Args: { user_id: string; required_role: string }
        Returns: boolean
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_group_member: {
        Args: { group_id_param: string }
        Returns: boolean
      }
    }
    Enums: {
      user_plan_status:
        | "free"
        | "iconic"
        | "premium"
        | "24_day"
        | "30_day"
        | "365_day"
        | "custom"
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
      user_plan_status: [
        "free",
        "iconic",
        "premium",
        "24_day",
        "30_day",
        "365_day",
        "custom",
      ],
    },
  },
} as const
