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
          class_group_id: string | null
          course_id: string
          created_at: string
          id: string
          instructor_profile_id: string
        }
        Insert: {
          class_group_id?: string | null
          course_id: string
          created_at?: string
          id?: string
          instructor_profile_id: string
        }
        Update: {
          class_group_id?: string | null
          course_id?: string
          created_at?: string
          id?: string
          instructor_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_instructors_class_group_id_fkey"
            columns: ["class_group_id"]
            isOneToOne: false
            referencedRelation: "class_groups"
            referencedColumns: ["id"]
          },
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
      elearning_assignments: {
        Row: {
          assessment_id: string | null
          assignment_type: string
          created_at: string
          description: string | null
          due_date: string | null
          elearning_class_id: string
          id: string
          is_published: boolean
          is_safe_exam_mode: boolean
          llo_id: string | null
          max_attempts: number | null
          prerequisite_assignment_id: string | null
          prerequisite_material_id: string | null
          seb_config_url: string | null
          seb_password: string | null
          seb_quit_password: string | null
          show_answer_mode: string | null
          submission_type: string | null
          time_limit_minutes: number | null
          title: string
          updated_at: string
        }
        Insert: {
          assessment_id?: string | null
          assignment_type: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          elearning_class_id: string
          id?: string
          is_published?: boolean
          is_safe_exam_mode?: boolean
          llo_id?: string | null
          max_attempts?: number | null
          prerequisite_assignment_id?: string | null
          prerequisite_material_id?: string | null
          seb_config_url?: string | null
          seb_password?: string | null
          seb_quit_password?: string | null
          show_answer_mode?: string | null
          submission_type?: string | null
          time_limit_minutes?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          assessment_id?: string | null
          assignment_type?: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          elearning_class_id?: string
          id?: string
          is_published?: boolean
          is_safe_exam_mode?: boolean
          llo_id?: string | null
          max_attempts?: number | null
          prerequisite_assignment_id?: string | null
          prerequisite_material_id?: string | null
          seb_config_url?: string | null
          seb_password?: string | null
          seb_quit_password?: string | null
          show_answer_mode?: string | null
          submission_type?: string | null
          time_limit_minutes?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "elearning_assignments_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elearning_assignments_elearning_class_id_fkey"
            columns: ["elearning_class_id"]
            isOneToOne: false
            referencedRelation: "elearning_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elearning_assignments_llo_id_fkey"
            columns: ["llo_id"]
            isOneToOne: false
            referencedRelation: "llos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elearning_assignments_prerequisite_assignment_id_fkey"
            columns: ["prerequisite_assignment_id"]
            isOneToOne: false
            referencedRelation: "elearning_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elearning_assignments_prerequisite_material_id_fkey"
            columns: ["prerequisite_material_id"]
            isOneToOne: false
            referencedRelation: "elearning_materials"
            referencedColumns: ["id"]
          },
        ]
      }
      elearning_attendance: {
        Row: {
          checked_at: string | null
          created_at: string
          elearning_session_id: string
          id: string
          notes: string | null
          status: string
          student_profile_id: string
          updated_at: string
        }
        Insert: {
          checked_at?: string | null
          created_at?: string
          elearning_session_id: string
          id?: string
          notes?: string | null
          status?: string
          student_profile_id: string
          updated_at?: string
        }
        Update: {
          checked_at?: string | null
          created_at?: string
          elearning_session_id?: string
          id?: string
          notes?: string | null
          status?: string
          student_profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "elearning_attendance_elearning_session_id_fkey"
            columns: ["elearning_session_id"]
            isOneToOne: false
            referencedRelation: "elearning_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elearning_attendance_student_profile_id_fkey"
            columns: ["student_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      elearning_classes: {
        Row: {
          class_group_id: string
          course_id: string
          cover_image_url: string | null
          created_at: string
          description: string | null
          id: string
          instructor_profile_id: string
          is_active: boolean
          title: string
          updated_at: string
          visibility: string
        }
        Insert: {
          class_group_id: string
          course_id: string
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          instructor_profile_id: string
          is_active?: boolean
          title: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          class_group_id?: string
          course_id?: string
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          instructor_profile_id?: string
          is_active?: boolean
          title?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "elearning_classes_class_group_id_fkey"
            columns: ["class_group_id"]
            isOneToOne: false
            referencedRelation: "class_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elearning_classes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elearning_classes_instructor_profile_id_fkey"
            columns: ["instructor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      elearning_material_progress: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          material_id: string
          progress_percentage: number | null
          student_profile_id: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          material_id: string
          progress_percentage?: number | null
          student_profile_id: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          material_id?: string
          progress_percentage?: number | null
          student_profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "elearning_material_progress_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "elearning_materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elearning_material_progress_student_profile_id_fkey"
            columns: ["student_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      elearning_materials: {
        Row: {
          content: string | null
          content_type: string
          created_at: string
          elearning_class_id: string
          file_url: string | null
          id: string
          is_published: boolean
          llo_id: string | null
          order_index: number
          prerequisite_assignment_id: string | null
          prerequisite_material_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          content_type: string
          created_at?: string
          elearning_class_id: string
          file_url?: string | null
          id?: string
          is_published?: boolean
          llo_id?: string | null
          order_index?: number
          prerequisite_assignment_id?: string | null
          prerequisite_material_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          content_type?: string
          created_at?: string
          elearning_class_id?: string
          file_url?: string | null
          id?: string
          is_published?: boolean
          llo_id?: string | null
          order_index?: number
          prerequisite_assignment_id?: string | null
          prerequisite_material_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "elearning_materials_elearning_class_id_fkey"
            columns: ["elearning_class_id"]
            isOneToOne: false
            referencedRelation: "elearning_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elearning_materials_llo_id_fkey"
            columns: ["llo_id"]
            isOneToOne: false
            referencedRelation: "llos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elearning_materials_prerequisite_assignment_id_fkey"
            columns: ["prerequisite_assignment_id"]
            isOneToOne: false
            referencedRelation: "elearning_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elearning_materials_prerequisite_material_id_fkey"
            columns: ["prerequisite_material_id"]
            isOneToOne: false
            referencedRelation: "elearning_materials"
            referencedColumns: ["id"]
          },
        ]
      }
      elearning_quiz_questions: {
        Row: {
          ai_feedback: string | null
          assignment_id: string
          correct_answer: Json | null
          created_at: string
          feedback: string | null
          id: string
          options: Json | null
          order_index: number
          points: number
          question_code: string | null
          question_image_url: string | null
          question_text: string
          question_type: string
          updated_at: string
        }
        Insert: {
          ai_feedback?: string | null
          assignment_id: string
          correct_answer?: Json | null
          created_at?: string
          feedback?: string | null
          id?: string
          options?: Json | null
          order_index?: number
          points?: number
          question_code?: string | null
          question_image_url?: string | null
          question_text: string
          question_type: string
          updated_at?: string
        }
        Update: {
          ai_feedback?: string | null
          assignment_id?: string
          correct_answer?: Json | null
          created_at?: string
          feedback?: string | null
          id?: string
          options?: Json | null
          order_index?: number
          points?: number
          question_code?: string | null
          question_image_url?: string | null
          question_text?: string
          question_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "elearning_quiz_questions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "elearning_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      elearning_sessions: {
        Row: {
          created_at: string
          elearning_class_id: string
          end_time: string | null
          id: string
          notes: string | null
          session_date: string
          session_number: number
          start_time: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          elearning_class_id: string
          end_time?: string | null
          id?: string
          notes?: string | null
          session_date: string
          session_number: number
          start_time?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          elearning_class_id?: string
          end_time?: string | null
          id?: string
          notes?: string | null
          session_date?: string
          session_number?: number
          start_time?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "elearning_sessions_elearning_class_id_fkey"
            columns: ["elearning_class_id"]
            isOneToOne: false
            referencedRelation: "elearning_classes"
            referencedColumns: ["id"]
          },
        ]
      }
      elearning_submissions: {
        Row: {
          answers: Json | null
          assignment_id: string
          attempt_number: number
          created_at: string
          feedback: string | null
          graded_at: string | null
          graded_by_profile_id: string | null
          id: string
          score: number | null
          student_profile_id: string
          submission_content: string | null
          submission_url: string | null
          submitted_at: string
          updated_at: string
        }
        Insert: {
          answers?: Json | null
          assignment_id: string
          attempt_number?: number
          created_at?: string
          feedback?: string | null
          graded_at?: string | null
          graded_by_profile_id?: string | null
          id?: string
          score?: number | null
          student_profile_id: string
          submission_content?: string | null
          submission_url?: string | null
          submitted_at?: string
          updated_at?: string
        }
        Update: {
          answers?: Json | null
          assignment_id?: string
          attempt_number?: number
          created_at?: string
          feedback?: string | null
          graded_at?: string | null
          graded_by_profile_id?: string | null
          id?: string
          score?: number | null
          student_profile_id?: string
          submission_content?: string | null
          submission_url?: string | null
          submitted_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "elearning_submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "elearning_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elearning_submissions_graded_by_profile_id_fkey"
            columns: ["graded_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elearning_submissions_student_profile_id_fkey"
            columns: ["student_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
          color: string | null
          created_at: string
          id: string
          predikat: string
          rentang_max: number
          rentang_min: number
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          predikat: string
          rentang_max: number
          rentang_min: number
          updated_at?: string
        }
        Update: {
          color?: string | null
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
          pertemuan: string | null
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
          pertemuan?: string | null
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
          pertemuan?: string | null
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
          sistem_kuliah_id: string | null
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
          sistem_kuliah_id?: string | null
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
          sistem_kuliah_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_sistem_kuliah_id_fkey"
            columns: ["sistem_kuliah_id"]
            isOneToOne: false
            referencedRelation: "sistem_kuliah"
            referencedColumns: ["id"]
          },
        ]
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
      question_bank: {
        Row: {
          correct_answer: Json | null
          course_id: string
          created_at: string
          feedback: string | null
          id: string
          instructor_profile_id: string
          is_shared: boolean
          options: Json | null
          points: number
          question_code: string
          question_image_url: string | null
          question_text: string
          question_type: string
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          correct_answer?: Json | null
          course_id: string
          created_at?: string
          feedback?: string | null
          id?: string
          instructor_profile_id: string
          is_shared?: boolean
          options?: Json | null
          points?: number
          question_code: string
          question_image_url?: string | null
          question_text: string
          question_type: string
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          correct_answer?: Json | null
          course_id?: string
          created_at?: string
          feedback?: string | null
          id?: string
          instructor_profile_id?: string
          is_shared?: boolean
          options?: Json | null
          points?: number
          question_code?: string
          question_image_url?: string | null
          question_text?: string
          question_type?: string
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_bank_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_bank_instructor_profile_id_fkey"
            columns: ["instructor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      sistem_kuliah: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
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
      get_quiz_questions_for_student: {
        Args: { p_assignment_id: string }
        Returns: {
          ai_feedback: string
          assignment_id: string
          correct_answer: Json
          created_at: string
          feedback: string
          id: string
          options: Json
          order_index: number
          points: number
          question_code: string
          question_image_url: string
          question_text: string
          question_type: string
          updated_at: string
        }[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      grade_quiz_submission:
        | { Args: { p_answers: Json; p_assignment_id: string }; Returns: Json }
        | { Args: { p_answers: Json; p_assignment_id: string }; Returns: Json }
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
