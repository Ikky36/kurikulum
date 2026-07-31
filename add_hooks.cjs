const fs = require('fs');

const codeToAppend = `
export type ElearningQuizPart = Tables<'elearning_quiz_parts'>;

// Quiz Parts Hooks
export function useQuizParts(assignmentId: string) {
  return useQuery({
    queryKey: ['quiz-parts', assignmentId],
    queryFn: async () => {
      if (!assignmentId) return [];
      const { data, error } = await supabase
        .from('elearning_quiz_parts')
        .select('*')
        .eq('assignment_id', assignmentId)
        .order('order_index', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!assignmentId,
  });
}

export function useCreateQuizPart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: TablesInsert<'elearning_quiz_parts'>) => {
      const { data: result, error } = await supabase
        .from('elearning_quiz_parts')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['quiz-parts', variables.assignment_id] });
    },
  });
}

export function useUpdateQuizPart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: TablesUpdate<'elearning_quiz_parts'> & { id: string }) => {
      const { data: result, error } = await supabase
        .from('elearning_quiz_parts')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (data) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: ['quiz-parts', data.assignment_id] });
      }
    },
  });
}

export function useDeleteQuizPart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, assignmentId }: { id: string; assignmentId: string }) => {
      const { error } = await supabase
        .from('elearning_quiz_parts')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['quiz-parts', variables.assignmentId] });
      queryClient.invalidateQueries({ queryKey: ['quiz-questions-instructor', variables.assignmentId] });
    },
  });
}

export function useUpdateAssignmentWeight() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, weight_percentage }: { id: string, weight_percentage: number }) => {
      const { data, error } = await supabase
        .from('elearning_assignments')
        .update({ weight_percentage })
        .eq('id', id)
        .select()
        .single();
        
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: ['elearning-assignments', data.elearning_class_id] });
        queryClient.invalidateQueries({ queryKey: ['assignment-detail', data.id] });
      }
    }
  });
}
`;

fs.appendFileSync('src/hooks/useElearningMaterials.ts', codeToAppend);
