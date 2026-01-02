import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Profile, Grade, Course } from '@/lib/types';

export function useStudent(studentId: string) {
  return useQuery({
    queryKey: ['student', studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', studentId)
        .maybeSingle();
      
      if (error) throw error;
      return data as Profile | null;
    },
    enabled: !!studentId,
  });
}

export function useStudentGrades(studentId: string) {
  return useQuery({
    queryKey: ['student-grades', studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('grades')
        .select(`
          *,
          courses:course_id (*)
        `)
        .eq('student_profile_id', studentId);
      
      if (error) throw error;
      return data.map(d => ({
        ...d,
        course: d.courses as unknown as Course,
      })) as (Grade & { course: Course })[];
    },
    enabled: !!studentId,
  });
}

export function useAllStudents() {
  return useQuery({
    queryKey: ['all-students'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'mahasiswa')
        .order('full_name');
      
      if (error) throw error;
      return data as Profile[];
    },
  });
}

export function useAllInstructors() {
  return useQuery({
    queryKey: ['all-instructors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'dosen')
        .order('full_name');
      
      if (error) throw error;
      return data as Profile[];
    },
  });
}
