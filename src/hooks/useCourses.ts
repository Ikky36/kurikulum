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

      // Get enrollment counts from enrollments table
      const { data: enrollments, error: enrollmentsError } = await supabase
        .from('enrollments')
        .select('course_id');
      
      if (enrollmentsError) throw enrollmentsError;

      // Get class groups with semester to count students from class_students
      const { data: classGroups, error: classGroupsError } = await supabase
        .from('class_groups')
        .select('id, semester');
      
      if (classGroupsError) throw classGroupsError;

      // Get all class_students to count students per class
      const { data: classStudents, error: classStudentsError } = await supabase
        .from('class_students')
        .select('class_group_id, student_profile_id');
      
      if (classStudentsError) throw classStudentsError;

      // Calculate stats for each course
      const coursesWithStats: CourseWithStats[] = courses.map((course) => {
        const courseGrades = grades?.filter(g => g.course_id === course.id) || [];
        const courseEnrollments = enrollments?.filter(e => e.course_id === course.id) || [];
        const courseInstructors = instructors
          ?.filter(i => i.course_id === course.id)
          .map(i => i.profiles as unknown as Profile)
          .filter(Boolean) || [];

        // Count students from class_students (via class_groups with matching semester)
        // Match course semester with class_group semester
        const courseSemester = course.semester; // e.g., "Semester 1" or "1"
        const semesterClassGroups = classGroups?.filter(cg => {
          if (!courseSemester || !cg.semester) return false;
          // Normalize semester format for comparison
          const courseSemNum = courseSemester.replace(/\D/g, '');
          const classSemNum = cg.semester.replace(/\D/g, '');
          return courseSemNum === classSemNum;
        }) || [];
        const semesterClassGroupIds = semesterClassGroups.map(cg => cg.id);
        const classStudentProfiles = classStudents?.filter(cs => semesterClassGroupIds.includes(cs.class_group_id)) || [];
        // Use unique student IDs in case student is in multiple classes
        const uniqueClassStudents = new Set(classStudentProfiles.map(cs => cs.student_profile_id));
        
        // Total students = students from class_groups with matching semester
        const totalStudents = uniqueClassStudents.size;

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
      
      const courseSemester = course?.semester;
      
      if (courseSemester) {
        // Normalize semester for comparison
        const courseSemNum = courseSemester.replace(/\D/g, '');
        
        // Get class_groups with matching semester
        const { data: classGroups, error: cgError } = await supabase
          .from('class_groups')
          .select('id, name, semester');
        
        if (cgError) throw cgError;
        
        // Filter class groups with matching semester
        const matchingClassGroups = classGroups?.filter(cg => {
          if (!cg.semester) return false;
          const classSemNum = cg.semester.replace(/\D/g, '');
          return courseSemNum === classSemNum;
        }) || [];

        if (matchingClassGroups.length > 0) {
          const classGroupIds = matchingClassGroups.map(cg => cg.id);
          const classGroupMap = Object.fromEntries(matchingClassGroups.map(cg => [cg.id, cg.name]));
          
          // Get students from class_students
          const { data: classStudents, error: csError } = await supabase
            .from('class_students')
            .select(`
              *,
              profiles:student_profile_id (*)
            `)
            .in('class_group_id', classGroupIds);
          
          if (csError) throw csError;

          if (classStudents && classStudents.length > 0) {
            // Transform class_students to match enrollment format
            // Use unique students (in case same student is in multiple classes)
            const uniqueStudentMap = new Map();
            classStudents.forEach(cs => {
              if (!uniqueStudentMap.has(cs.student_profile_id)) {
                uniqueStudentMap.set(cs.student_profile_id, {
                  id: cs.id,
                  course_id: courseId,
                  student_profile_id: cs.student_profile_id,
                  created_at: cs.created_at,
                  student: cs.profiles as unknown as Profile,
                  class_group_id: cs.class_group_id,
                  class_group_name: classGroupMap[cs.class_group_id],
                });
              }
            });
            return Array.from(uniqueStudentMap.values());
          }
        }
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
