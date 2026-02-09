import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Fetch classes for the same course (for import source selection)
// Uses a SECURITY DEFINER RPC function so lecturers can see source classes
// for import without having general browse access to other classes
export function useSameCourseClasses(courseId: string, excludeClassId: string) {
  return useQuery({
    queryKey: ['same-course-classes', courseId, excludeClassId],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_import_source_classes', {
          p_course_id: courseId,
          p_exclude_class_id: excludeClassId,
        });

      if (error) throw error;
      return data;
    },
    enabled: !!courseId && !!excludeClassId,
  });
}

// Fetch materials from a source class
export function useSourceMaterials(sourceClassId: string) {
  return useQuery({
    queryKey: ['source-materials', sourceClassId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('elearning_materials')
        .select('*')
        .eq('elearning_class_id', sourceClassId)
        .order('order_index', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!sourceClassId,
  });
}

// Fetch assignments from a source class
export function useSourceAssignments(sourceClassId: string) {
  return useQuery({
    queryKey: ['source-assignments', sourceClassId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('elearning_assignments')
        .select('*')
        .eq('elearning_class_id', sourceClassId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!sourceClassId,
  });
}

// Fetch quiz questions for an assignment
export function useSourceQuizQuestions(assignmentId: string) {
  return useQuery({
    queryKey: ['source-quiz-questions', assignmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('elearning_quiz_questions')
        .select('*')
        .eq('assignment_id', assignmentId)
        .order('order_index', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!assignmentId,
  });
}

// Import materials from source class to target class
export function useImportMaterials() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      sourceClassId: string;
      targetClassId: string;
      materialIds: string[];
    }) => {
      // Fetch source materials
      const { data: sourceMaterials, error: fetchError } = await supabase
        .from('elearning_materials')
        .select('*')
        .in('id', params.materialIds);

      if (fetchError) throw fetchError;
      if (!sourceMaterials?.length) throw new Error('No materials found');

      // Get max order_index in target class
      const { data: existingMaterials } = await supabase
        .from('elearning_materials')
        .select('order_index')
        .eq('elearning_class_id', params.targetClassId)
        .order('order_index', { ascending: false })
        .limit(1);

      const startIndex = (existingMaterials?.[0]?.order_index || 0) + 1;

      // Create new materials with target class id
      const newMaterials = sourceMaterials.map((m, idx) => ({
        elearning_class_id: params.targetClassId,
        title: m.title,
        content_type: m.content_type,
        content: m.content,
        file_url: m.file_url,
        llo_id: m.llo_id,
        is_published: false, // Start as draft
        order_index: startIndex + idx,
        // Don't copy prerequisites as they reference old class items
        prerequisite_material_id: null,
        prerequisite_assignment_id: null,
      }));

      const { data: insertedMaterials, error: insertError } = await supabase
        .from('elearning_materials')
        .insert(newMaterials)
        .select();

      if (insertError) throw insertError;
      return insertedMaterials;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['elearning-materials', variables.targetClassId] });
    },
  });
}

// Import assignments (including quiz questions) from source class to target class
export function useImportAssignments() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      sourceClassId: string;
      targetClassId: string;
      assignmentIds: string[];
      includeQuestions: boolean;
    }) => {
      // Fetch source assignments
      const { data: sourceAssignments, error: fetchError } = await supabase
        .from('elearning_assignments')
        .select('*')
        .in('id', params.assignmentIds);

      if (fetchError) throw fetchError;
      if (!sourceAssignments?.length) throw new Error('No assignments found');

      const results: Array<{ assignment: any; questions?: any[] }> = [];

      for (const assignment of sourceAssignments) {
        // Create new assignment
        const newAssignment = {
          elearning_class_id: params.targetClassId,
          title: assignment.title,
          description: assignment.description,
          assignment_type: assignment.assignment_type,
          due_date: null, // Clear due date
          max_attempts: assignment.max_attempts,
          time_limit_minutes: assignment.time_limit_minutes,
          is_safe_exam_mode: assignment.is_safe_exam_mode,
          seb_password: assignment.seb_password,
          seb_quit_password: assignment.seb_quit_password,
          seb_config_url: assignment.seb_config_url,
          show_answer_mode: assignment.show_answer_mode,
          submission_type: assignment.submission_type,
          assessment_id: assignment.assessment_id,
          llo_id: assignment.llo_id,
          is_published: false, // Start as draft
          // Don't copy prerequisites
          prerequisite_material_id: null,
          prerequisite_assignment_id: null,
        };

        const { data: insertedAssignment, error: assignmentError } = await supabase
          .from('elearning_assignments')
          .insert(newAssignment)
          .select()
          .single();

        if (assignmentError) throw assignmentError;

        const result: { assignment: any; questions?: any[] } = { assignment: insertedAssignment };

        // If quiz and includeQuestions, copy questions
        if (params.includeQuestions && assignment.assignment_type === 'quiz') {
          const { data: sourceQuestions, error: questionsError } = await supabase
            .from('elearning_quiz_questions')
            .select('*')
            .eq('assignment_id', assignment.id)
            .order('order_index', { ascending: true });

          if (questionsError) throw questionsError;

          if (sourceQuestions?.length) {
            const newQuestions = sourceQuestions.map(q => ({
              assignment_id: insertedAssignment.id,
              question_code: q.question_code,
              question_type: q.question_type,
              question_text: q.question_text,
              question_image_url: q.question_image_url,
              options: q.options,
              correct_answer: q.correct_answer,
              feedback: q.feedback,
              ai_feedback: q.ai_feedback,
              points: q.points,
              order_index: q.order_index,
            }));

            const { data: insertedQuestions, error: insertQError } = await supabase
              .from('elearning_quiz_questions')
              .insert(newQuestions)
              .select();

            if (insertQError) throw insertQError;
            result.questions = insertedQuestions;
          }
        }

        results.push(result);
      }

      return results;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['elearning-assignments', variables.targetClassId] });
    },
  });
}
