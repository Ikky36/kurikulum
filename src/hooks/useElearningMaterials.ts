import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type ElearningMaterial = Tables<'elearning_materials'>;
export type ElearningAssignment = Tables<'elearning_assignments'>;
export type ElearningQuizQuestion = Tables<'elearning_quiz_questions'>;
export type ElearningSubmission = Tables<'elearning_submissions'>;

// Fetch materials for a class
export function useElearningMaterials(classId: string) {
  return useQuery({
    queryKey: ['elearning-materials', classId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('elearning_materials')
        .select(`
          *,
          llo:llos(*)
        `)
        .eq('elearning_class_id', classId)
        .order('order_index', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!classId,
  });
}

// Create material
export function useCreateMaterial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: TablesInsert<'elearning_materials'>) => {
      const { data: result, error } = await supabase
        .from('elearning_materials')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['elearning-materials', variables.elearning_class_id] });
    },
  });
}

// Update material
export function useUpdateMaterial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: TablesUpdate<'elearning_materials'> & { id: string }) => {
      const { data: result, error } = await supabase
        .from('elearning_materials')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['elearning-materials'] });
    },
  });
}

// Delete material
export function useDeleteMaterial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('elearning_materials')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['elearning-materials'] });
    },
  });
}

// Fetch assignments for a class
export function useElearningAssignments(classId: string) {
  return useQuery({
    queryKey: ['elearning-assignments', classId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('elearning_assignments')
        .select(`
          *,
          llo:llos(*),
          assessment:assessments(*)
        `)
        .eq('elearning_class_id', classId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!classId,
  });
}

// Create assignment
export function useCreateAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: TablesInsert<'elearning_assignments'>) => {
      const { data: result, error } = await supabase
        .from('elearning_assignments')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['elearning-assignments', variables.elearning_class_id] });
    },
  });
}

// Update assignment
export function useUpdateAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: TablesUpdate<'elearning_assignments'> & { id: string }) => {
      const { data: result, error } = await supabase
        .from('elearning_assignments')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['elearning-assignments'] });
    },
  });
}

// Delete assignment
export function useDeleteAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('elearning_assignments')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['elearning-assignments'] });
    },
  });
}

// Fetch quiz questions for an assignment
// Fetch quiz questions using secure function that hides correct_answer for students
export function useQuizQuestions(assignmentId: string) {
  return useQuery({
    queryKey: ['quiz-questions', assignmentId],
    queryFn: async () => {
      // Use the secure RPC function that hides correct_answer based on permissions
      const { data, error } = await supabase
        .rpc('get_quiz_questions_for_student', { p_assignment_id: assignmentId });

      if (error) throw error;
      return data;
    },
    enabled: !!assignmentId,
  });
}

// Fetch quiz questions directly for instructors (admin/dosen) who need to manage questions
export function useQuizQuestionsForInstructor(assignmentId: string) {
  return useQuery({
    queryKey: ['quiz-questions-instructor', assignmentId],
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

// Server-side quiz grading function
export function useGradeQuiz() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ assignmentId, answers }: { assignmentId: string; answers: Record<string, any> }) => {
      const { data, error } = await supabase
        .rpc('grade_quiz_submission', { 
          p_assignment_id: assignmentId, 
          p_answers: answers 
        });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quiz-questions'] });
      queryClient.invalidateQueries({ queryKey: ['quiz-submissions'] });
    },
  });
}

// Batch create quiz questions
export function useBatchCreateQuestions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: TablesInsert<'elearning_quiz_questions'>[]) => {
      const { data: result, error } = await supabase
        .from('elearning_quiz_questions')
        .insert(data)
        .select();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quiz-questions'] });
    },
  });
}

// Update quiz question
export function useUpdateQuizQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: TablesUpdate<'elearning_quiz_questions'> & { id: string }) => {
      const { data: result, error } = await supabase
        .from('elearning_quiz_questions')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quiz-questions'] });
    },
  });
}

// Delete quiz question
export function useDeleteQuizQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('elearning_quiz_questions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quiz-questions'] });
    },
  });
}

// Fetch submissions for an assignment
export function useAssignmentSubmissions(assignmentId: string) {
  return useQuery({
    queryKey: ['assignment-submissions', assignmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('elearning_submissions')
        .select(`
          *,
          student:profiles!elearning_submissions_student_profile_id_fkey(*)
        `)
        .eq('assignment_id', assignmentId)
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!assignmentId,
  });
}

// Create submission
export function useCreateSubmission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: TablesInsert<'elearning_submissions'>) => {
      const { data: result, error } = await supabase
        .from('elearning_submissions')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['assignment-submissions', variables.assignment_id] });
    },
  });
}

// Grade submission
export function useGradeSubmission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, score, feedback, graded_by_profile_id }: { 
      id: string; 
      score: number; 
      feedback?: string;
      graded_by_profile_id: string;
    }) => {
      const { data: result, error } = await supabase
        .from('elearning_submissions')
        .update({ 
          score, 
          feedback, 
          graded_at: new Date().toISOString(),
          graded_by_profile_id 
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignment-submissions'] });
    },
  });
}

// Fetch LLOs for a course
export function useCourseLLOs(courseId: string) {
  return useQuery({
    queryKey: ['course-llos', courseId],
    queryFn: async () => {
      // First get CLOs for the course
      const { data: clos, error: closError } = await supabase
        .from('clos')
        .select('id')
        .eq('course_id', courseId);

      if (closError) throw closError;
      if (!clos?.length) return [];

      // Then get LLOs for those CLOs
      const { data: llos, error: llosError } = await supabase
        .from('llos')
        .select(`
          *,
          clo:clos(*)
        `)
        .in('clo_id', clos.map(c => c.id))
        .order('code');

      if (llosError) throw llosError;
      return llos;
    },
    enabled: !!courseId,
  });
}

// AI Generation hook
export type AIGenerationResult = {
  content?: string;
  type?: string;
  error?: string;
  code?: number;
  retry_after_seconds?: number;
};

export function useAIGeneration() {
  return useMutation({
    mutationFn: async (params: {
      type: "generate_material" | "generate_quiz" | "grade_answer" | "generate_feedback";
      context?: string;
      topic?: string;
      indicators?: string[];
      questionType?: string;
      questionCount?: number;
      studentAnswer?: string;
      correctAnswer?: string;
      questionText?: string;
      languageMode?: 'arabic' | 'indonesian' | 'mixed';
    }): Promise<AIGenerationResult> => {
      const { data, error } = await supabase.functions.invoke('elearning-ai', {
        body: params,
      });

      // If the function responded with a non-2xx status, Supabase returns an `error` object.
      // Convert it into a safe payload so callers won't crash on uncaught throws.
      if (error) {
        const status = (error as any)?.context?.status as number | undefined;

        if (status === 429) {
          return {
            error: 'Terlalu banyak permintaan AI. Silakan tunggu sebentar lalu coba lagi.',
            code: 429,
          };
        }

        if (status === 402) {
          return {
            error: 'Kuota/limit AI sudah habis. Silakan tambah kuota penggunaan lalu coba lagi.',
            code: 402,
          };
        }

        return {
          error: (error as any)?.message || 'Gagal memanggil layanan AI.',
          code: status || 500,
        };
      }

      // Function may still return a JSON error payload
      const result = (data || {}) as AIGenerationResult;
      return result;
    },
  });
}
