import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Course, CourseWithStats, Profile } from '@/lib/types';

export function useCourses() {
  return useQuery({
    queryKey: ['courses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('code');
      
      if (error) throw error;
      return data as Course[];
    },
  });
}

export function useCoursesWithStats() {
  return useQuery({
    queryKey: ['courses-with-stats'],
    queryFn: async () => {
      // Get all courses
      const { data: courses, error: coursesError } = await supabase
        .from('courses')
        .select('*')
        .order('code');
      
      if (coursesError) throw coursesError;

      // Get all grades
      const { data: grades, error: gradesError } = await supabase
        .from('grades')
        .select('*');
      
      if (gradesError) throw gradesError;

      // Get all instructors with their profiles
      const { data: instructors, error: instructorsError } = await supabase
        .from('course_instructors')
        .select(`
          course_id,
          profiles:instructor_profile_id (*)
        `);
      
      if (instructorsError) throw instructorsError;

      // Get enrollment counts
      const { data: enrollments, error: enrollmentsError } = await supabase
        .from('enrollments')
        .select('course_id');
      
      if (enrollmentsError) throw enrollmentsError;

      // Calculate stats for each course
      const coursesWithStats: CourseWithStats[] = courses.map((course) => {
        const courseGrades = grades?.filter(g => g.course_id === course.id) || [];
        const courseEnrollments = enrollments?.filter(e => e.course_id === course.id) || [];
        const courseInstructors = instructors
          ?.filter(i => i.course_id === course.id)
          .map(i => i.profiles as unknown as Profile)
          .filter(Boolean) || [];

        const totalScore = courseGrades.reduce((sum, g) => sum + (g.final_score || 0), 0);
        const averageScore = courseGrades.length > 0 ? totalScore / courseGrades.length : 0;
        const passingCount = courseGrades.filter(g => (g.final_score || 0) >= course.passing_score).length;

        return {
          ...course,
          average_score: averageScore,
          total_students: courseEnrollments.length,
          passing_count: passingCount,
          instructors: courseInstructors,
        };
      });

      return coursesWithStats;
    },
  });
}

export function useCourse(courseId: string) {
  return useQuery({
    queryKey: ['course', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .maybeSingle();
      
      if (error) throw error;
      return data as Course | null;
    },
    enabled: !!courseId,
  });
}

export function useCourseInstructors(courseId: string) {
  return useQuery({
    queryKey: ['course-instructors', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course_instructors')
        .select(`
          *,
          profiles:instructor_profile_id (*)
        `)
        .eq('course_id', courseId);
      
      if (error) throw error;
      return data.map(d => d.profiles as unknown as Profile).filter(Boolean);
    },
    enabled: !!courseId,
  });
}

export function useCourseGrades(courseId: string) {
  return useQuery({
    queryKey: ['course-grades', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('grades')
        .select(`
          *,
          profiles:student_profile_id (*)
        `)
        .eq('course_id', courseId);
      
      if (error) throw error;
      return data.map(d => ({
        ...d,
        student: d.profiles as unknown as Profile,
      }));
    },
    enabled: !!courseId,
  });
}

export function useCourseEnrollments(courseId: string) {
  return useQuery({
    queryKey: ['course-enrollments', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('enrollments')
        .select(`
          *,
          profiles:student_profile_id (*)
        `)
        .eq('course_id', courseId);
      
      if (error) throw error;
      return data.map(d => ({
        ...d,
        student: d.profiles as unknown as Profile,
      }));
    },
    enabled: !!courseId,
  });
}
