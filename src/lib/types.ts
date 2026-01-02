export type AppRole = 'mahasiswa' | 'dosen' | 'admin';

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
  created_at: string;
  updated_at: string;
}

export interface Course {
  id: string;
  code: string;
  name: string;
  semester?: string;
  passing_score: number;
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
