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

      // Fetch krs data to determine academic year for passing score
      const { data: krsItems } = await supabase
        .from('krs_items')
        .select('course_id, krs:krs_id(academic_year_id, status)')
        .eq('krs.student_id', studentId)
        .order('created_at', { ascending: false });

      // Create a map of course_id -> latest approved academic_year_id
      const academicYearMap = new Map<string, string>();
      if (krsItems) {
        krsItems.forEach(item => {
          const krs = item.krs as any;
          if (krs && krs.status === 'approved' && !academicYearMap.has(item.course_id)) {
            academicYearMap.set(item.course_id, krs.academic_year_id);
          }
        });
      }

      return data.map(d => ({
        ...d,
        course: d.courses as unknown as Course,
        academic_year_id: academicYearMap.get(d.course_id) || null,
      })) as (Grade & { course: Course, academic_year_id?: string | null })[];
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
