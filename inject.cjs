const fs = require('fs');
const file = 'src/integrations/supabase/types.ts';
let content = fs.readFileSync(file, 'utf8');
const newTables = `
        ta_types: {
          Row: {
            id: string
            name: string
            description: string | null
            created_at: string
            updated_at: string
          }
          Insert: {
            id?: string
            name: string
            description?: string | null
            created_at?: string
            updated_at?: string
          }
          Update: {
            id?: string
            name?: string
            description?: string | null
            created_at?: string
            updated_at?: string
          }
          Relationships: []
        }
        ta_settings: {
          Row: {
            id: string
            type_id: string
            min_semester: number
            required_course_ids: string[]
            max_bad_grades_count: number
            created_at: string
            updated_at: string
          }
          Insert: {
            id?: string
            type_id: string
            min_semester?: number
            required_course_ids?: string[]
            max_bad_grades_count?: number
            created_at?: string
            updated_at?: string
          }
          Update: {
            id?: string
            type_id?: string
            min_semester?: number
            required_course_ids?: string[]
            max_bad_grades_count?: number
            created_at?: string
            updated_at?: string
          }
          Relationships: [
            {
              foreignKeyName: 'ta_settings_type_id_fkey'
              columns: ['type_id']
              isOneToOne: false
              referencedRelation: 'ta_types'
              referencedColumns: ['id']
            }
          ]
        }
        ta_seminar_requirements: {
          Row: {
            id: string
            type: string
            name: string
            is_required: boolean
            created_at: string
            updated_at: string
          }
          Insert: {
            id?: string
            type: string
            name: string
            is_required?: boolean
            created_at?: string
            updated_at?: string
          }
          Update: {
            id?: string
            type?: string
            name?: string
            is_required?: boolean
            created_at?: string
            updated_at?: string
          }
          Relationships: []
        }
        ta_submissions: {
          Row: {
            id: string
            student_id: string
            type_id: string
            title: string
            document_link: string | null
            comments: string | null
            status: string
            created_at: string
            updated_at: string
          }
          Insert: {
            id?: string
            student_id: string
            type_id: string
            title: string
            document_link?: string | null
            comments?: string | null
            status?: string
            created_at?: string
            updated_at?: string
          }
          Update: {
            id?: string
            student_id?: string
            type_id?: string
            title?: string
            document_link?: string | null
            comments?: string | null
            status?: string
            created_at?: string
            updated_at?: string
          }
          Relationships: [
            {
              foreignKeyName: 'ta_submissions_student_id_fkey'
              columns: ['student_id']
              isOneToOne: false
              referencedRelation: 'profiles'
              referencedColumns: ['id']
            },
            {
              foreignKeyName: 'ta_submissions_type_id_fkey'
              columns: ['type_id']
              isOneToOne: false
              referencedRelation: 'ta_types'
              referencedColumns: ['id']
            }
          ]
        }
        ta_revisions: {
          Row: {
            id: string
            submission_id: string
            title: string
            document_link: string | null
            comments: string | null
            created_at: string
          }
          Insert: {
            id?: string
            submission_id: string
            title: string
            document_link?: string | null
            comments?: string | null
            created_at?: string
          }
          Update: {
            id?: string
            submission_id?: string
            title?: string
            document_link?: string | null
            comments?: string | null
            created_at?: string
          }
          Relationships: [
            {
              foreignKeyName: 'ta_revisions_submission_id_fkey'
              columns: ['submission_id']
              isOneToOne: false
              referencedRelation: 'ta_submissions'
              referencedColumns: ['id']
            }
          ]
        }
        ta_advisors: {
          Row: {
            id: string
            submission_id: string
            dosen_id: string
            role: string
            created_at: string
          }
          Insert: {
            id?: string
            submission_id: string
            dosen_id: string
            role?: string
            created_at?: string
          }
          Update: {
            id?: string
            submission_id?: string
            dosen_id?: string
            role?: string
            created_at?: string
          }
          Relationships: [
            {
              foreignKeyName: 'ta_advisors_submission_id_fkey'
              columns: ['submission_id']
              isOneToOne: false
              referencedRelation: 'ta_submissions'
              referencedColumns: ['id']
            },
            {
              foreignKeyName: 'ta_advisors_dosen_id_fkey'
              columns: ['dosen_id']
              isOneToOne: false
              referencedRelation: 'profiles'
              referencedColumns: ['id']
            }
          ]
        }
        ta_consultation_logs: {
          Row: {
            id: string
            submission_id: string
            dosen_id: string
            date: string
            problem: string
            solution: string | null
            status: string
            created_at: string
            updated_at: string
          }
          Insert: {
            id?: string
            submission_id: string
            dosen_id: string
            date: string
            problem: string
            solution?: string | null
            status?: string
            created_at?: string
            updated_at?: string
          }
          Update: {
            id?: string
            submission_id?: string
            dosen_id?: string
            date?: string
            problem?: string
            solution?: string | null
            status?: string
            created_at?: string
            updated_at?: string
          }
          Relationships: [
            {
              foreignKeyName: 'ta_consultation_logs_submission_id_fkey'
              columns: ['submission_id']
              isOneToOne: false
              referencedRelation: 'ta_submissions'
              referencedColumns: ['id']
            },
            {
              foreignKeyName: 'ta_consultation_logs_dosen_id_fkey'
              columns: ['dosen_id']
              isOneToOne: false
              referencedRelation: 'profiles'
              referencedColumns: ['id']
            }
          ]
        }
        ta_milestones: {
          Row: {
            id: string
            submission_id: string
            title: string
            target_date: string | null
            status: string
            created_by: string | null
            created_at: string
            updated_at: string
          }
          Insert: {
            id?: string
            submission_id: string
            title: string
            target_date?: string | null
            status?: string
            created_by?: string | null
            created_at?: string
            updated_at?: string
          }
          Update: {
            id?: string
            submission_id?: string
            title?: string
            target_date?: string | null
            status?: string
            created_by?: string | null
            created_at?: string
            updated_at?: string
          }
          Relationships: [
            {
              foreignKeyName: 'ta_milestones_submission_id_fkey'
              columns: ['submission_id']
              isOneToOne: false
              referencedRelation: 'ta_submissions'
              referencedColumns: ['id']
            },
            {
              foreignKeyName: 'ta_milestones_created_by_fkey'
              columns: ['created_by']
              isOneToOne: false
              referencedRelation: 'profiles'
              referencedColumns: ['id']
            }
          ]
        }
        ta_seminars: {
          Row: {
            id: string
            submission_id: string
            type: string
            schedule_date: string | null
            room: string | null
            chairperson_id: string | null
            status: string
            created_at: string
            updated_at: string
          }
          Insert: {
            id?: string
            submission_id: string
            type: string
            schedule_date?: string | null
            room?: string | null
            chairperson_id?: string | null
            status?: string
            created_at?: string
            updated_at?: string
          }
          Update: {
            id?: string
            submission_id?: string
            type?: string
            schedule_date?: string | null
            room?: string | null
            chairperson_id?: string | null
            status?: string
            created_at?: string
            updated_at?: string
          }
          Relationships: [
            {
              foreignKeyName: 'ta_seminars_submission_id_fkey'
              columns: ['submission_id']
              isOneToOne: false
              referencedRelation: 'ta_submissions'
              referencedColumns: ['id']
            },
            {
              foreignKeyName: 'ta_seminars_chairperson_id_fkey'
              columns: ['chairperson_id']
              isOneToOne: false
              referencedRelation: 'profiles'
              referencedColumns: ['id']
            }
          ]
        }
        ta_seminar_registrations: {
          Row: {
            id: string
            seminar_id: string
            student_id: string
            requirements_data: Json | null
            created_at: string
            updated_at: string
          }
          Insert: {
            id?: string
            seminar_id: string
            student_id: string
            requirements_data?: Json | null
            created_at?: string
            updated_at?: string
          }
          Update: {
            id?: string
            seminar_id?: string
            student_id?: string
            requirements_data?: Json | null
            created_at?: string
            updated_at?: string
          }
          Relationships: [
            {
              foreignKeyName: 'ta_seminar_registrations_seminar_id_fkey'
              columns: ['seminar_id']
              isOneToOne: false
              referencedRelation: 'ta_seminars'
              referencedColumns: ['id']
            },
            {
              foreignKeyName: 'ta_seminar_registrations_student_id_fkey'
              columns: ['student_id']
              isOneToOne: false
              referencedRelation: 'profiles'
              referencedColumns: ['id']
            }
          ]
        }
        ta_examiners: {
          Row: {
            id: string
            seminar_id: string
            dosen_id: string
            role: string
            score: number | null
            notes: string | null
            created_at: string
            updated_at: string
          }
          Insert: {
            id?: string
            seminar_id: string
            dosen_id: string
            role?: string
            score?: number | null
            notes?: string | null
            created_at?: string
            updated_at?: string
          }
          Update: {
            id?: string
            seminar_id?: string
            dosen_id?: string
            role?: string
            score?: number | null
            notes?: string | null
            created_at?: string
            updated_at?: string
          }
          Relationships: [
            {
              foreignKeyName: 'ta_examiners_seminar_id_fkey'
              columns: ['seminar_id']
              isOneToOne: false
              referencedRelation: 'ta_seminars'
              referencedColumns: ['id']
            },
            {
              foreignKeyName: 'ta_examiners_dosen_id_fkey'
              columns: ['dosen_id']
              isOneToOne: false
              referencedRelation: 'profiles'
              referencedColumns: ['id']
            }
          ]
        }
`;
content = content.replace(/Tables: \{/, 'Tables: {' + newTables);
fs.writeFileSync(file, content, 'utf8');
console.log('Types injected!');
