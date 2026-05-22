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
      // ── users ────────────────────────────────────────────────────────────
      users: {
        Row: {
          id:            string
          email:         string
          full_name:     string
          class_level:   number
          role:          "student" | "teacher" | "admin"
          xp:            number
          streak_count:  number
          avatar_url:    string | null
          is_banned:     boolean
          ban_reason:    string | null
          created_at:    string
          updated_at:    string
        }
        Insert: {
          id?:           string
          email:         string
          full_name:     string
          class_level:   number
          role?:         "student" | "teacher" | "admin"
          xp?:           number
          streak_count?: number
          avatar_url?:   string | null
          is_banned?:    boolean
          ban_reason?:   string | null
          created_at?:   string
          updated_at?:   string
        }
        Update: {
          id?:           string
          email?:        string
          full_name?:    string
          class_level?:  number
          role?:         "student" | "teacher" | "admin"
          xp?:           number
          streak_count?: number
          avatar_url?:   string | null
          is_banned?:    boolean
          ban_reason?:   string | null
          created_at?:   string
          updated_at?:   string
        }
        Relationships: []
      }

      // ── subjects ──────────────────────────────────────────────────────────
      subjects: {
        Row: {
          id:          string
          name:        string
          class_level: number
          color:       string
          icon:        string
          order_index: number
          is_active:   boolean
          created_at:  string
        }
        Insert: {
          id?:          string
          name:         string
          class_level:  number
          color?:       string
          icon?:        string
          order_index?: number
          is_active?:   boolean
          created_at?:  string
        }
        Update: {
          id?:          string
          name?:        string
          class_level?: number
          color?:       string
          icon?:        string
          order_index?: number
          is_active?:   boolean
          created_at?:  string
        }
        Relationships: []
      }

      // ── chapters ──────────────────────────────────────────────────────────
      chapters: {
        Row: {
          id:          string
          subject_id:  string
          name:        string
          order_index: number
          is_active:   boolean
          created_at:  string
        }
        Insert: {
          id?:          string
          subject_id:   string
          name:         string
          order_index?: number
          is_active?:   boolean
          created_at?:  string
        }
        Update: {
          id?:          string
          subject_id?:  string
          name?:        string
          order_index?: number
          is_active?:   boolean
          created_at?:  string
        }
        Relationships: [
          {
            foreignKeyName: "chapters_subject_id_fkey"
            columns: ["subject_id"]
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          }
        ]
      }

      // ── flashcards ────────────────────────────────────────────────────────
      flashcards: {
        Row: {
          id:         string
          chapter_id: string
          question:   string
          answer:     string
          difficulty: "easy" | "medium" | "hard"
          hint:       string
          is_active:  boolean
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?:         string
          chapter_id:  string
          question:    string
          answer:      string
          difficulty?: "easy" | "medium" | "hard"
          hint?:       string
          is_active?:  boolean
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?:         string
          chapter_id?: string
          question?:   string
          answer?:     string
          difficulty?: "easy" | "medium" | "hard"
          hint?:       string
          is_active?:  boolean
          created_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "flashcards_chapter_id_fkey"
            columns: ["chapter_id"]
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flashcards_created_by_fkey"
            columns: ["created_by"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }

      // ── flashcard_reviews ─────────────────────────────────────────────────
      flashcard_reviews: {
        Row: {
          id:             string
          user_id:        string
          flashcard_id:   string
          quality:        number
          ease_factor:    number
          interval:       number
          repetitions:    number
          next_review_at: string
          reviewed_at:    string
          created_at:     string
        }
        Insert: {
          id?:             string
          user_id:         string
          flashcard_id:    string
          quality:         number
          ease_factor?:    number
          interval?:       number
          repetitions?:    number
          next_review_at:  string
          reviewed_at?:    string
          created_at?:     string
        }
        Update: {
          id?:             string
          user_id?:        string
          flashcard_id?:   string
          quality?:        number
          ease_factor?:    number
          interval?:       number
          repetitions?:    number
          next_review_at?: string
          reviewed_at?:    string
          created_at?:     string
        }
        Relationships: [
          {
            foreignKeyName: "flashcard_reviews_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flashcard_reviews_flashcard_id_fkey"
            columns: ["flashcard_id"]
            referencedRelation: "flashcards"
            referencedColumns: ["id"]
          }
        ]
      }

      // ── quiz_sessions ─────────────────────────────────────────────────────
      quiz_sessions: {
        Row: {
          id:             string
          user_id:        string
          chapter_id:     string
          mode:           "scholar" | "storm" | "sovereign"
          score:          number
          question_count: number
          xp_earned:      number
          completed_at:   string | null
          created_at:     string
        }
        Insert: {
          id?:             string
          user_id:         string
          chapter_id:      string
          mode:            "scholar" | "storm" | "sovereign"
          score?:          number
          question_count?: number
          xp_earned?:      number
          completed_at?:   string | null
          created_at?:     string
        }
        Update: {
          id?:             string
          user_id?:        string
          chapter_id?:     string
          mode?:           "scholar" | "storm" | "sovereign"
          score?:          number
          question_count?: number
          xp_earned?:      number
          completed_at?:   string | null
          created_at?:     string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_sessions_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_sessions_chapter_id_fkey"
            columns: ["chapter_id"]
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          }
        ]
      }

      // ── quiz_questions ────────────────────────────────────────────────────
      quiz_questions: {
        Row: {
          id:            string
          session_id:    string
          flashcard_id:  string
          user_answer:   string | null
          is_correct:    boolean
          time_taken_ms: number
          created_at:    string
        }
        Insert: {
          id?:            string
          session_id:     string
          flashcard_id:   string
          user_answer?:   string | null
          is_correct?:    boolean
          time_taken_ms?: number
          created_at?:    string
        }
        Update: {
          id?:            string
          session_id?:    string
          flashcard_id?:  string
          user_answer?:   string | null
          is_correct?:    boolean
          time_taken_ms?: number
          created_at?:    string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_session_id_fkey"
            columns: ["session_id"]
            referencedRelation: "quiz_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_questions_flashcard_id_fkey"
            columns: ["flashcard_id"]
            referencedRelation: "flashcards"
            referencedColumns: ["id"]
          }
        ]
      }

      // ── streaks ───────────────────────────────────────────────────────────
      streaks: {
        Row: {
          id:                 string
          user_id:            string
          current_streak:     number
          longest_streak:     number
          last_activity_date: string | null
          created_at:         string
          updated_at:         string
        }
        Insert: {
          id?:                 string
          user_id:             string
          current_streak?:     number
          longest_streak?:     number
          last_activity_date?: string | null
          created_at?:         string
          updated_at?:         string
        }
        Update: {
          id?:                 string
          user_id?:            string
          current_streak?:     number
          longest_streak?:     number
          last_activity_date?: string | null
          created_at?:         string
          updated_at?:         string
        }
        Relationships: [
          {
            foreignKeyName: "streaks_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }

      // ── leaderboard ───────────────────────────────────────────────────────
      leaderboard: {
        Row: {
          id:          string
          user_id:     string
          period:      "weekly" | "monthly" | "all_time"
          xp:          number
          rank:        number
          computed_at: string
          created_at:  string
        }
        Insert: {
          id?:          string
          user_id:      string
          period:       "weekly" | "monthly" | "all_time"
          xp?:          number
          rank?:        number
          computed_at?: string
          created_at?:  string
        }
        Update: {
          id?:          string
          user_id?:     string
          period?:      "weekly" | "monthly" | "all_time"
          xp?:          number
          rank?:        number
          computed_at?: string
          created_at?:  string
        }
        Relationships: [
          {
            foreignKeyName: "leaderboard_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }

      // ── progress ──────────────────────────────────────────────────────────
      progress: {
        Row: {
          id:                    string
          user_id:               string
          subject_id:            string | null
          chapter_id:            string | null
          completion_percentage: number
          created_at:            string
          updated_at:            string
        }
        Insert: {
          id?:                    string
          user_id:                string
          subject_id?:            string | null
          chapter_id?:            string | null
          completion_percentage?: number
          created_at?:            string
          updated_at?:            string
        }
        Update: {
          id?:                    string
          user_id?:               string
          subject_id?:            string | null
          chapter_id?:            string | null
          completion_percentage?: number
          created_at?:            string
          updated_at?:            string
        }
        Relationships: [
          {
            foreignKeyName: "progress_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }

      // ── notes ─────────────────────────────────────────────────────────────
      notes: {
        Row: {
          id:         string
          user_id:    string
          chapter_id: string
          content:    string
          word_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?:         string
          user_id:     string
          chapter_id:  string
          content:     string
          word_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?:         string
          user_id?:    string
          chapter_id?: string
          content?:    string
          word_count?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_chapter_id_fkey"
            columns: ["chapter_id"]
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          }
        ]
      }

      // ── bookmarks ─────────────────────────────────────────────────────────
      bookmarks: {
        Row: {
          id:         string
          user_id:    string
          chapter_id: string
          created_at: string
        }
        Insert: {
          id?:         string
          user_id:     string
          chapter_id:  string
          created_at?: string
        }
        Update: {
          id?:         string
          user_id?:    string
          chapter_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookmarks_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookmarks_chapter_id_fkey"
            columns: ["chapter_id"]
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          }
        ]
      }

      // ── ai_sessions ───────────────────────────────────────────────────────
      ai_sessions: {
        Row: {
          id:                string
          user_id:           string
          provider:          "kimi" | "groq" | "gemini"
          session_type:      "flashcard_generate" | "quiz_generate" | "explanation" | "doubt" | "summary"
          chapter_id:        string | null
          subject_id:        string | null
          prompt_tokens:     number
          completion_tokens: number
          total_tokens:      number
          duration_ms:       number
          success:           boolean
          error_code:        string | null
          created_at:        string
        }
        Insert: {
          id?:                string
          user_id:            string
          provider:           "kimi" | "groq" | "gemini"
          session_type:       "flashcard_generate" | "quiz_generate" | "explanation" | "doubt" | "summary"
          chapter_id?:        string | null
          subject_id?:        string | null
          prompt_tokens?:     number
          completion_tokens?: number
          total_tokens?:      number
          duration_ms?:       number
          success?:           boolean
          error_code?:        string | null
          created_at?:        string
        }
        Update: {
          id?:                string
          user_id?:           string
          provider?:          "kimi" | "groq" | "gemini"
          session_type?:      "flashcard_generate" | "quiz_generate" | "explanation" | "doubt" | "summary"
          chapter_id?:        string | null
          subject_id?:        string | null
          prompt_tokens?:     number
          completion_tokens?: number
          total_tokens?:      number
          duration_ms?:       number
          success?:           boolean
          error_code?:        string | null
          created_at?:        string
        }
        Relationships: [
          {
            foreignKeyName: "ai_sessions_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }

      // ── teacher_classes ───────────────────────────────────────────────────
      teacher_classes: {
        Row: {
          id:          string
          teacher_id:  string
          name:        string
          class_level: number
          description: string
          join_code:   string
          is_active:   boolean
          created_at:  string
          updated_at:  string
        }
        Insert: {
          id?:          string
          teacher_id:   string
          name:         string
          class_level:  number
          description?: string
          join_code:    string
          is_active?:   boolean
          created_at?:  string
          updated_at?:  string
        }
        Update: {
          id?:          string
          teacher_id?:  string
          name?:        string
          class_level?: number
          description?: string
          join_code?:   string
          is_active?:   boolean
          created_at?:  string
          updated_at?:  string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_classes_teacher_id_fkey"
            columns: ["teacher_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }

      // ── class_students ────────────────────────────────────────────────────
      class_students: {
        Row: {
          id:         string
          class_id:   string
          student_id: string
          joined_at:  string
        }
        Insert: {
          id?:         string
          class_id:    string
          student_id:  string
          joined_at?:  string
        }
        Update: {
          id?:         string
          class_id?:   string
          student_id?: string
          joined_at?:  string
        }
        Relationships: [
          {
            foreignKeyName: "class_students_class_id_fkey"
            columns: ["class_id"]
            referencedRelation: "teacher_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_students_student_id_fkey"
            columns: ["student_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }

      // ── admin_logs ────────────────────────────────────────────────────────
      admin_logs: {
        Row: {
          id:             string
          admin_id:       string
          action:         string
          target_user_id: string | null
          metadata:       Json
          created_at:     string
        }
        Insert: {
          id?:             string
          admin_id:        string
          action:          string
          target_user_id?: string | null
          metadata?:       Json
          created_at?:     string
        }
        Update: {
          id?:             string
          admin_id?:       string
          action?:         string
          target_user_id?: string | null
          metadata?:       Json
          created_at?:     string
        }
        Relationships: [
          {
            foreignKeyName: "admin_logs_admin_id_fkey"
            columns: ["admin_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }

    Views: {
      [_ in never]: never
    }

    Functions: {
      increment_user_xp: {
        Args: { p_user_id: string; p_xp: number }
        Returns: undefined
      }
    }

    Enums: {
      user_role:    "student" | "teacher" | "admin"
      quiz_mode:    "scholar" | "storm" | "sovereign"
      ai_provider:  "kimi" | "groq" | "gemini"
      difficulty:   "easy" | "medium" | "hard"
      ai_session_type: "flashcard_generate" | "quiz_generate" | "explanation" | "doubt" | "summary"
      leaderboard_period: "weekly" | "monthly" | "all_time"
    }

    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// ─── Convenience type aliases ─────────────────────────────────────────────────

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"]

export type InsertTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"]

export type UpdateTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"]

export type Enums<T extends keyof Database["public"]["Enums"]> =
  Database["public"]["Enums"][T]

// ─── Row type shortcuts ───────────────────────────────────────────────────────

export type UserRow             = Tables<"users">
export type SubjectRow          = Tables<"subjects">
export type ChapterRow          = Tables<"chapters">
export type FlashcardRow        = Tables<"flashcards">
export type FlashcardReviewRow  = Tables<"flashcard_reviews">
export type QuizSessionRow      = Tables<"quiz_sessions">
export type QuizQuestionRow     = Tables<"quiz_questions">
export type StreakRow            = Tables<"streaks">
export type LeaderboardRow      = Tables<"leaderboard">
export type ProgressRow         = Tables<"progress">
export type NoteRow             = Tables<"notes">
export type BookmarkRow         = Tables<"bookmarks">
export type AISessionRow        = Tables<"ai_sessions">
export type TeacherClassRow     = Tables<"teacher_classes">
export type ClassStudentRow     = Tables<"class_students">
export type AdminLogRow         = Tables<"admin_logs">