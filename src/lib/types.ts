export type AppRole = 'mahasiswa' | 'dosen' | 'admin' | 'sub_admin';

export interface Profile {
  id: string;
  role: AppRole;
  full_name: string;
  email: string;
  nim?: string;
  nip?: string;
  program?: string;
  class_group?: string;
  photo_url?: string;
  enrollment_year?: number;
  gender?: 'pria' | 'wanita' | null;
  created_at: string;
  updated_at: string;
}

export interface ClassGroup {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface ClassStudent {
  id: string;
  class_group_id: string;
  student_profile_id: string;
  created_at?: string;
}

export interface Course {
  id: string;
  code: string;
  name: string;
  semester?: string;
  passing_score: number;
  curriculum_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CourseInstructor {
  id: string;
  course_id: string;
  instructor_profile_id: string;
  created_at: string;
  course?: Course;
  instructor?: Profile;
}

export interface Enrollment {
  id: string;
  course_id: string;
  student_profile_id: string;
  created_at: string;
  course?: Course;
  student?: Profile;
}

export interface Grade {
  id: string;
  course_id: string;
  student_profile_id: string;
  final_score: number;
  notes?: string;
  updated_by_profile_id?: string;
  created_at: string;
  updated_at: string;
  course?: Course;
  student?: Profile;
}

export interface CourseWithStats extends Course {
  average_score: number;
  total_students: number;
  passing_count: number;
  instructors: Profile[];
}

export interface StudentWithGrades extends Profile {
  grades: Grade[];
  average_score: number;
}

// Program Learning Outcomes (CPL/PLO)
export interface PLO {
  id: string;
  code: string;
  description: string;
  created_at: string;
  updated_at: string;
}

// Course-PLO relationship
export interface CoursePLO {
  id: string;
  course_id: string;
  plo_id: string;
  created_at: string;
  course?: Course;
  plo?: PLO;
}

// Course Learning Outcomes (CPMK/CLO)
export interface CLO {
  id: string;
  course_id: string;
  code: string;
  description: string;
  created_at: string;
  updated_at: string;
  course?: Course;
  llos?: LLO[];
}

// Lesson Learning Outcomes (SUB-CPMK/LLO)
export interface LLO {
  id: string;
  clo_id: string;
  code: string;
  description: string;
  weight_percentage: number;
  created_at: string;
  updated_at: string;
  clo?: CLO;
}

// Assessment (Tugas/Quiz)
export interface Assessment {
  id: string;
  course_id: string;
  code: string;
  name: string;
  description?: string;
  indikator?: string[];
  teknik?: string[];
  pertemuan?: string | null;
  created_at: string;
  updated_at: string;
  course?: Course;
  llos?: LLO[];
}

// Instrumen Penilaian (Grading Scale)
export interface InstrumenPenilaian {
  id: string;
  rentang_min: number;
  rentang_max: number;
  predikat: string;
  color?: string | null;
  created_at?: string;
  updated_at?: string;
}

// Assessment-LLO relationship
export interface AssessmentLLO {
  id: string;
  assessment_id: string;
  llo_id: string;
  created_at: string;
  assessment?: Assessment;
  llo?: LLO;
}

// CLO-PLO relationship with weights
export interface CLOPLO {
  id: string;
  clo_id: string;
  plo_id: string;
  weight_percentage: number;
  created_at: string;
  clo?: CLO;
  plo?: PLO;
}

// Curriculum
export interface Curriculum {
  id: string;
  name: string;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
}

// Program (Prodi)
export interface Program {
  id: string;
  code?: string | null;
  name: string;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
}

// App Settings
export interface AppSetting {
  id: string;
  setting_key: string;
  setting_value?: string | null;
  created_at?: string;
  updated_at?: string;
}
