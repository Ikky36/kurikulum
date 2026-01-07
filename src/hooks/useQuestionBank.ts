import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface QuestionBankItem {
  id: string;
  course_id: string;
  instructor_profile_id: string;
  question_code: string;
  question_type: string;
  question_text: string;
  question_image_url?: string | null;
  options?: any;
  correct_answer?: any;
  feedback?: string | null;
  points: number;
  tags: string[];
  is_shared: boolean;
  created_at: string;
  updated_at: string;
}

export interface QuestionBankInsert {
  course_id: string;
  instructor_profile_id: string;
  question_code: string;
  question_type: string;
  question_text: string;
  question_image_url?: string | null;
  options?: any;
  correct_answer?: any;
  feedback?: string | null;
  points?: number;
  tags?: string[];
  is_shared?: boolean;
}

// Fetch all questions in question bank for a course
export function useQuestionBank(courseId: string) {
  return useQuery({
    queryKey: ['question-bank', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('question_bank')
        .select('*')
        .eq('course_id', courseId)
        .order('question_code', { ascending: true });

      if (error) throw error;
      return data as QuestionBankItem[];
    },
    enabled: !!courseId,
  });
}

// Add question to bank
export function useAddToQuestionBank() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: QuestionBankInsert) => {
      const { data: result, error } = await supabase
        .from('question_bank')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['question-bank', variables.course_id] });
    },
  });
}

// Batch add questions to bank
export function useBatchAddToQuestionBank() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: QuestionBankInsert[]) => {
      const { data: result, error } = await supabase
        .from('question_bank')
        .insert(data)
        .select();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['question-bank'] });
    },
  });
}

// Update question in bank
export function useUpdateQuestionBank() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<QuestionBankInsert> & { id: string }) => {
      const { data: result, error } = await supabase
        .from('question_bank')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['question-bank'] });
    },
  });
}

// Delete question from bank
export function useDeleteFromQuestionBank() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('question_bank')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['question-bank'] });
    },
  });
}

// Generate next question code for a course
export function useGenerateQuestionCode(courseId: string, prefix: string = 'Q') {
  return useQuery({
    queryKey: ['question-code-next', courseId, prefix],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('question_bank')
        .select('question_code')
        .eq('course_id', courseId)
        .ilike('question_code', `${prefix}%`)
        .order('question_code', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (!data || data.length === 0) {
        return `${prefix}001`;
      }

      const lastCode = data[0].question_code;
      const numMatch = lastCode.match(/\d+$/);
      if (numMatch) {
        const nextNum = parseInt(numMatch[0]) + 1;
        return `${prefix}${nextNum.toString().padStart(3, '0')}`;
      }
      return `${prefix}001`;
    },
    enabled: !!courseId,
  });
}
