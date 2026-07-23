import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Course, CourseWithStats, Profile } from '@/lib/types';

export function useCourses() {
  return useQuery({
    queryKey: ['courses'],
    queryFn: async () => {
      // First, get active curricula
      const { data: activeCurricula, error: curriculaError } = await supabase
        .from('curricula')
        .select('id')
        .eq('is_active', true);
      
      if (curriculaError) throw curriculaError;
      const activeCurriculumIds = activeCurricula?.map(c => c.id) || [];

      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('code');
      
      if (error) throw error;
      
      return data?.map(course => ({
        ...course,
        is_active: !!course.curriculum_id && activeCurriculumIds.includes(course.curriculum_id)
      })) as Course[];
    },
  });
}

export function useCoursesWithStats() {
  return useQuery({
    queryKey: ['courses-with-stats'],
    queryFn: async () => {
      // First, get active curricula
      const { data: activeCurricula, error: curriculaError } = await supabase
        .from('curricula')
        .select('id')
        .eq('is_active', true);
      
      if (curriculaError) throw curriculaError;
      const activeCurriculumIds = activeCurricula?.map(c => c.id) || [];

      // Get all courses
      const { data: allCourses, error: coursesError } = await supabase
        .from('courses')
        .select('*')
        .order('code');
      
      if (coursesError) throw coursesError;
      
      // Filter courses: only those with active curriculum
      const activeCourses = allCourses?.filter(course => 
        course.curriculum_id && activeCurriculumIds.includes(course.curriculum_id)
      ) || [];

      // Compute is_active based on curriculum (true if no curriculum or curriculum is active)
      const courses = activeCourses.map(course => ({
        ...course,
        is_active: true
      }));

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

      if (instructorsError) throw instructorsError;

      // Get approved KRS and their items to count enrolled students
      const { data: approvedKrs, error: krsError } = await supabase
        .from('krs')
        .select(`
          id,
          student_id,
          krs_items(course_id)
        `)
        .eq('status', 'approved');
      
      if (krsError) throw krsError;

      // Calculate stats for each course
      const coursesWithStats: CourseWithStats[] = courses.map((course) => {
        const courseGrades = grades?.filter(g => g.course_id === course.id) || [];
        const courseInstructors = instructors
          ?.filter(i => i.course_id === course.id)
          .map(i => i.profiles as unknown as Profile)
          .filter(Boolean) || [];

        // Count students from approved KRS
        const enrolledStudents = new Set<string>();
        approvedKrs?.forEach(krs => {
          const hasCourse = krs.krs_items?.some((item: any) => item.course_id === course.id);
          if (hasCourse && krs.student_id) {
            enrolledStudents.add(krs.student_id);
          }
        });
        
        const totalStudents = enrolledStudents.size;

        const totalScore = courseGrades.reduce((sum, g) => sum + (g.final_score || 0), 0);
        const averageScore = courseGrades.length > 0 ? totalScore / courseGrades.length : 0;
        const passingCount = courseGrades.filter(g => (g.final_score || 0) >= course.passing_score).length;

        return {
          ...course,
          average_score: averageScore,
          total_students: totalStudents,
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
      // First, get active curricula
      const { data: activeCurricula, error: curriculaError } = await supabase
        .from('curricula')
        .select('id')
        .eq('is_active', true);
      
      if (curriculaError) throw curriculaError;
      const activeCurriculumIds = activeCurricula?.map(c => c.id) || [];

      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .maybeSingle();
      
      if (error) throw error;
      if (!data) return null;

      return {
        ...data,
        is_active: !!data.curriculum_id && activeCurriculumIds.includes(data.curriculum_id)
      } as Course;
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
          profiles:instructor_profile_id (*),
          class_groups:class_group_id (*)
        `)
        .eq('course_id', courseId);
      
      if (error) throw error;
      return data.map(d => ({
        ...d.profiles as unknown as Profile,
        classGroupId: d.class_group_id,
        classGroupName: (d.class_groups as unknown as { id: string; name: string } | null)?.name || null,
      }));
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
      // First get the course to find its semester
      const { data: course, error: courseError } = await supabase
        .from('courses')
        .select('semester')
        .eq('id', courseId)
        .maybeSingle();
      
      if (courseError) throw courseError;
      // Get enrolled students from approved KRS
      const { data: krsItems, error: krsError } = await supabase
        .from('krs_items')
        .select(`
          id,
          course_id,
          created_at,
          krs:krs_id!inner(
            status,
            student_id,
            profiles:student_id (*)
          )
        `)
        .eq('course_id', courseId)
        .eq('krs.status', 'approved');
      
      if (krsError) throw krsError;

      if (krsItems && krsItems.length > 0) {
        // Use unique students (in case of data duplication)
        const uniqueStudentMap = new Map();
        krsItems.forEach(item => {
          const krsData = item.krs as any;
          if (krsData && krsData.student_id && !uniqueStudentMap.has(krsData.student_id)) {
            uniqueStudentMap.set(krsData.student_id, {
              id: item.id,
              course_id: courseId,
              student_profile_id: krsData.student_id,
              created_at: item.created_at,
              student: krsData.profiles as unknown as Profile,
              class_group_id: null, // No longer bound to a physical Rombel in this context
              class_group_name: null,
            });
          }
        });
        return Array.from(uniqueStudentMap.values());
      }

      // Fallback to enrollments table if no class_students data
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

export function useCourseAssessments(courseId: string) {
  return useQuery({
    queryKey: ['course-assessments', courseId],
    queryFn: async () => {
      // Get assessments with their linked LLOs for weight calculation
      const { data: assessments, error: assessmentsError } = await supabase
        .from('assessments')
        .select('*')
        .eq('course_id', courseId)
        .order('code');
      
      if (assessmentsError) throw assessmentsError;
      
      if (!assessments || assessments.length === 0) return [];
      
      // Get assessment_llos with LLO weights
      const { data: assessmentLlos, error: llosError } = await supabase
        .from('assessment_llos')
        .select(`
          assessment_id,
          llos:llo_id (
            id,
            weight_percentage
          )
        `)
        .in('assessment_id', assessments.map(a => a.id));
      
      if (llosError) throw llosError;
      
      // Calculate total weight for each assessment
      return assessments.map(assessment => {
        const linkedLlos = assessmentLlos?.filter(al => al.assessment_id === assessment.id) || [];
        const totalWeight = linkedLlos.reduce((sum, al) => {
          const llo = al.llos as unknown as { id: string; weight_percentage: number } | null;
          return sum + (llo?.weight_percentage || 0);
        }, 0);
        
        return {
          ...assessment,
          weight: totalWeight,
        };
      });
    },
    enabled: !!courseId,
  });
}

export function useCourseAssessmentScores(courseId: string) {
  return useQuery({
    queryKey: ['course-assessment-scores', courseId],
    queryFn: async () => {
      // First get all assessments for this course
      const { data: assessments, error: assessmentsError } = await supabase
        .from('assessments')
        .select('id')
        .eq('course_id', courseId);
      
      if (assessmentsError) throw assessmentsError;
      
      if (!assessments || assessments.length === 0) return [];
      
      const assessmentIds = assessments.map(a => a.id);
      
      // Then get all scores for these assessments
      const { data, error } = await supabase
        .from('student_assessment_scores')
        .select('*')
        .in('assessment_id', assessmentIds);
      
      if (error) throw error;
      return data;
    },
    enabled: !!courseId,
  });
}
