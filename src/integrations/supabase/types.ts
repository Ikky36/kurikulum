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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          created_at: string
          id: string
          setting_key: string
          setting_value: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          setting_key: string
          setting_value?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          setting_key?: string
          setting_value?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      assessment_llos: {
        Row: {
          assessment_id: string
          created_at: string
          id: string
          llo_id: string
        }
        Insert: {
          assessment_id: string
          created_at?: string
          id?: string
          llo_id: string
        }
        Update: {
          assessment_id?: string
          created_at?: string
          id?: string
          llo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_llos_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_llos_llo_id_fkey"
            columns: ["llo_id"]
            isOneToOne: false
            referencedRelation: "llos"
            referencedColumns: ["id"]
          },
        ]
      }
      assessments: {
        Row: {
          code: string
          course_id: string
          created_at: string
          description: string | null
          id: string
          indikator: string[] | null
          name: string
          pertemuan: string | null
          teknik: string[] | null
          updated_at: string
        }
        Insert: {
          code: string
          course_id: string
          created_at?: string
          description?: string | null
          id?: string
          indikator?: string[] | null
          name: string
          pertemuan?: string | null
          teknik?: string[] | null
          updated_at?: string
        }
        Update: {
          code?: string
          course_id?: string
          created_at?: string
          description?: string | null
          id?: string
          indikator?: string[] | null
          name?: string
          pertemuan?: string | null
          teknik?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      bahan_kajian_kelompok: {
        Row: {
          bahan_kajian: string
          created_at: string
          id: string
          kelompok: string
          updated_at: string
        }
        Insert: {
          bahan_kajian: string
          created_at?: string
          id?: string
          kelompok: string
          updated_at?: string
        }
        Update: {
          bahan_kajian?: string
          created_at?: string
          id?: string
          kelompok?: string
          updated_at?: string
        }
        Relationships: []
      }
      class_groups: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      class_students: {
        Row: {
          class_group_id: string
          created_at: string
          id: string
          student_profile_id: string
        }
        Insert: {
          class_group_id: string
          created_at?: string
          id?: string
          student_profile_id: string
        }
        Update: {
          class_group_id?: string
          created_at?: string
          id?: string
          student_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_students_class_group_id_fkey"
            columns: ["class_group_id"]
            isOneToOne: false
            referencedRelation: "class_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_students_student_profile_id_fkey"
            columns: ["student_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clo_plos: {
        Row: {
          clo_id: string
          created_at: string
          id: string
          plo_id: string
          weight_percentage: number
        }
        Insert: {
          clo_id: string
          created_at?: string
          id?: string
          plo_id: string
          weight_percentage?: number
        }
        Update: {
          clo_id?: string
          created_at?: string
          id?: string
          plo_id?: string
          weight_percentage?: number
        }
        Relationships: [
          {
            foreignKeyName: "clo_plos_clo_id_fkey"
            columns: ["clo_id"]
            isOneToOne: false
            referencedRelation: "clos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clo_plos_plo_id_fkey"
            columns: ["plo_id"]
            isOneToOne: false
            referencedRelation: "plos"
            referencedColumns: ["id"]
          },
        ]
      }
      clos: {
        Row: {
          code: string
          course_id: string
          created_at: string
          description: string
          id: string
          updated_at: string
        }
        Insert: {
          code: string
          course_id: string
          created_at?: string
          description: string
          id?: string
          updated_at?: string
        }
        Update: {
          code?: string
          course_id?: string
          created_at?: string
          description?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clos_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_instructors: {
        Row: {
          course_id: string
          created_at: string
          id: string
          instructor_profile_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          instructor_profile_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          instructor_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_instructors_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_instructors_instructor_profile_id_fkey"
            columns: ["instructor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      course_plos: {
        Row: {
          course_id: string
          created_at: string
          id: string
          plo_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          plo_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          plo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_plos_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_plos_plo_id_fkey"
            columns: ["plo_id"]
            isOneToOne: false
            referencedRelation: "plos"
            referencedColumns: ["id"]
          },
        ]
      }
      course_profil_lulusan: {
        Row: {
          course_id: string
          created_at: string
          id: string
          profil_lulusan_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          profil_lulusan_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          profil_lulusan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_profil_lulusan_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_profil_lulusan_profil_lulusan_id_fkey"
            columns: ["profil_lulusan_id"]
            isOneToOne: false
            referencedRelation: "profil_lulusan"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          code: string
          created_at: string
          curriculum_id: string | null
          id: string
          name: string
          passing_score: number
          semester: string | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          curriculum_id?: string | null
          id?: string
          name: string
          passing_score?: number
          semester?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          curriculum_id?: string | null
          id?: string
          name?: string
          passing_score?: number
          semester?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_curriculum_id_fkey"
            columns: ["curriculum_id"]
            isOneToOne: false
            referencedRelation: "curricula"
            referencedColumns: ["id"]
          },
        ]
      }
      curricula: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      enrollments: {
        Row: {
          course_id: string
          created_at: string
          id: string
          student_profile_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          student_profile_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          student_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_student_profile_id_fkey"
            columns: ["student_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      grades: {
        Row: {
          course_id: string
          created_at: string
          final_score: number
          id: string
          notes: string | null
          student_profile_id: string
          updated_at: string
          updated_by_profile_id: string | null
        }
        Insert: {
          course_id: string
          created_at?: string
          final_score: number
          id?: string
          notes?: string | null
          student_profile_id: string
          updated_at?: string
          updated_by_profile_id?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string
          final_score?: number
          id?: string
          notes?: string | null
          student_profile_id?: string
          updated_at?: string
          updated_by_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "grades_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grades_student_profile_id_fkey"
            columns: ["student_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      instrumen_penilaian: {
        Row: {
          created_at: string
          id: string
          predikat: string
          rentang_max: number
          rentang_min: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          predikat: string
          rentang_max: number
          rentang_min: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          predikat?: string
          rentang_max?: number
          rentang_min?: number
          updated_at?: string
        }
        Relationships: []
      }
      llos: {
        Row: {
          bahan_kajian: string[] | null
          clo_id: string
          code: string
          created_at: string
          description: string
          id: string
          indikator: string[] | null
          metode: string[] | null
          referensi: string[] | null
          updated_at: string
          weight_percentage: number
        }
        Insert: {
          bahan_kajian?: string[] | null
          clo_id: string
          code: string
          created_at?: string
          description: string
          id?: string
          indikator?: string[] | null
          metode?: string[] | null
          referensi?: string[] | null
          updated_at?: string
          weight_percentage: number
        }
        Update: {
          bahan_kajian?: string[] | null
          clo_id?: string
          code?: string
          created_at?: string
          description?: string
          id?: string
          indikator?: string[] | null
          metode?: string[] | null
          referensi?: string[] | null
          updated_at?: string
          weight_percentage?: number
        }
        Relationships: [
          {
            foreignKeyName: "llos_clo_id_fkey"
            columns: ["clo_id"]
            isOneToOne: false
            referencedRelation: "clos"
            referencedColumns: ["id"]
          },
        ]
      }
      plo_profil_lulusan: {
        Row: {
          created_at: string
          id: string
          plo_id: string
          profil_lulusan_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          plo_id: string
          profil_lulusan_id: string
        }
        Update: {
          created_at?: string
          id?: string
          plo_id?: string
          profil_lulusan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plo_profil_lulusan_plo_id_fkey"
            columns: ["plo_id"]
            isOneToOne: false
            referencedRelation: "plos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plo_profil_lulusan_profil_lulusan_id_fkey"
            columns: ["profil_lulusan_id"]
            isOneToOne: false
            referencedRelation: "profil_lulusan"
            referencedColumns: ["id"]
          },
        ]
      }
      plos: {
        Row: {
          code: string
          created_at: string
          description: string
          id: string
          profil_lulusan_id: string | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description: string
          id?: string
          profil_lulusan_id?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string
          id?: string
          profil_lulusan_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plos_profil_lulusan_id_fkey"
            columns: ["profil_lulusan_id"]
            isOneToOne: false
            referencedRelation: "profil_lulusan"
            referencedColumns: ["id"]
          },
        ]
      }
      profil_lulusan: {
        Row: {
          code: string
          created_at: string
          deskripsi: string | null
          id: string
          profil: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          deskripsi?: string | null
          id?: string
          profil: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          deskripsi?: string | null
          id?: string
          profil?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          class_group: string | null
          created_at: string
          email: string
          enrollment_year: number | null
          full_name: string
          gender: string | null
          id: string
          nim: string | null
          nip: string | null
          photo_url: string | null
          program: string | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          class_group?: string | null
          created_at?: string
          email: string
          enrollment_year?: number | null
          full_name: string
          gender?: string | null
          id: string
          nim?: string | null
          nip?: string | null
          photo_url?: string | null
          program?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          class_group?: string | null
          created_at?: string
          email?: string
          enrollment_year?: number | null
          full_name?: string
          gender?: string | null
          id?: string
          nim?: string | null
          nip?: string | null
          photo_url?: string | null
          program?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
      programs: {
        Row: {
          code: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          can_edit: boolean
          can_view: boolean
          created_at: string
          id: string
          permission_key: string
          role: string
          scope: string
          updated_at: string
        }
        Insert: {
          can_edit?: boolean
          can_view?: boolean
          created_at?: string
          id?: string
          permission_key: string
          role: string
          scope?: string
          updated_at?: string
        }
        Update: {
          can_edit?: boolean
          can_view?: boolean
          created_at?: string
          id?: string
          permission_key?: string
          role?: string
          scope?: string
          updated_at?: string
        }
        Relationships: []
      }
      student_assessment_scores: {
        Row: {
          assessment_id: string
          created_at: string
          id: string
          notes: string | null
          score: number
          student_profile_id: string
          updated_at: string
          updated_by_profile_id: string | null
        }
        Insert: {
          assessment_id: string
          created_at?: string
          id?: string
          notes?: string | null
          score: number
          student_profile_id: string
          updated_at?: string
          updated_by_profile_id?: string | null
        }
        Update: {
          assessment_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          score?: number
          student_profile_id?: string
          updated_at?: string
          updated_by_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_assessment_scores_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_assessment_scores_student_profile_id_fkey"
            columns: ["student_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_assessment_scores_updated_by_profile_id_fkey"
            columns: ["updated_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vmts_ps_misi: {
        Row: {
          code: string
          created_at: string
          id: string
          misi: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          misi: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          misi?: string
          updated_at?: string
        }
        Relationships: []
      }
      vmts_ps_strategi: {
        Row: {
          code: string
          created_at: string
          id: string
          strategi: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          strategi: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          strategi?: string
          updated_at?: string
        }
        Relationships: []
      }
      vmts_ps_tujuan: {
        Row: {
          code: string
          created_at: string
          id: string
          tujuan: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          tujuan: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          tujuan?: string
          updated_at?: string
        }
        Relationships: []
      }
      vmts_ps_visi: {
        Row: {
          created_at: string
          id: string
          updated_at: string
          visi: string
        }
        Insert: {
          created_at?: string
          id?: string
          updated_at?: string
          visi: string
        }
        Update: {
          created_at?: string
          id?: string
          updated_at?: string
          visi?: string
        }
        Relationships: []
      }
      vmts_pt_misi: {
        Row: {
          code: string
          created_at: string
          id: string
          misi: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          misi: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          misi?: string
          updated_at?: string
        }
        Relationships: []
      }
      vmts_pt_strategi: {
        Row: {
          code: string
          created_at: string
          id: string
          strategi: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          strategi: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          strategi?: string
          updated_at?: string
        }
        Relationships: []
      }
      vmts_pt_tujuan: {
        Row: {
          code: string
          created_at: string
          id: string
          tujuan: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          tujuan: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          tujuan?: string
          updated_at?: string
        }
        Relationships: []
      }
      vmts_pt_visi: {
        Row: {
          created_at: string
          id: string
          updated_at: string
          visi: string
        }
        Insert: {
          created_at?: string
          id?: string
          updated_at?: string
          visi: string
        }
        Update: {
          created_at?: string
          id?: string
          updated_at?: string
          visi?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_course_instructor: {
        Args: { _course_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "mahasiswa" | "dosen" | "admin" | "sub_admin"
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
      app_role: ["mahasiswa", "dosen", "admin", "sub_admin"],
    },
  },
} as const
