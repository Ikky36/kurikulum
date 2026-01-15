import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type AssessmentRubric = Tables<'assessment_rubrics'>;
export type RubricCriteria = Tables<'rubric_criteria'>;
export type RubricLevel = Tables<'rubric_levels'>;
export type StudentRubricScore = Tables<'student_rubric_scores'>;

// Fetch rubrics for a class
export function useRubrics(classId: string) {
  return useQuery({
    queryKey: ['rubrics', classId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assessment_rubrics')
        .select(`
          *,
          created_by:profiles!assessment_rubrics_created_by_profile_id_fkey(id, full_name),
          assignment:elearning_assignments(id, title),
          criteria:rubric_criteria(
            *,
            levels:rubric_levels(*)
          )
        `)
        .eq('elearning_class_id', classId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!classId,
  });
}

// Fetch single rubric with all details
export function useRubric(rubricId: string) {
  return useQuery({
    queryKey: ['rubric', rubricId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assessment_rubrics')
        .select(`
          *,
          created_by:profiles!assessment_rubrics_created_by_profile_id_fkey(id, full_name),
          assignment:elearning_assignments(id, title),
          criteria:rubric_criteria(
            *,
            levels:rubric_levels(*)
          )
        `)
        .eq('id', rubricId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!rubricId,
  });
}

// Create rubric
export function useCreateRubric() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: TablesInsert<'assessment_rubrics'>) => {
      const { data: result, error } = await supabase
        .from('assessment_rubrics')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['rubrics', variables.elearning_class_id] });
    },
  });
}

// Update rubric
export function useUpdateRubric() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: TablesUpdate<'assessment_rubrics'> & { id: string }) => {
      const { data: result, error } = await supabase
        .from('assessment_rubrics')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rubrics'] });
      queryClient.invalidateQueries({ queryKey: ['rubric'] });
    },
  });
}

// Delete rubric
export function useDeleteRubric() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('assessment_rubrics')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rubrics'] });
    },
  });
}

// Create criteria
export function useCreateCriteria() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: TablesInsert<'rubric_criteria'>) => {
      const { data: result, error } = await supabase
        .from('rubric_criteria')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rubrics'] });
      queryClient.invalidateQueries({ queryKey: ['rubric'] });
    },
  });
}

// Update criteria
export function useUpdateCriteria() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: TablesUpdate<'rubric_criteria'> & { id: string }) => {
      const { data: result, error } = await supabase
        .from('rubric_criteria')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rubrics'] });
      queryClient.invalidateQueries({ queryKey: ['rubric'] });
    },
  });
}

// Delete criteria
export function useDeleteCriteria() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('rubric_criteria')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rubrics'] });
      queryClient.invalidateQueries({ queryKey: ['rubric'] });
    },
  });
}

// Batch create criteria with levels
export function useBatchCreateCriteria() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { rubricId: string; criteria: Array<{
      criterion_name: string;
      description?: string;
      max_score: number;
      weight_percentage: number;
      order_index: number;
      levels: Array<{
        level_name: string;
        description?: string;
        score_range_min: number;
        score_range_max: number;
        order_index: number;
      }>;
    }> }) => {
      // Insert criteria first
      const criteriaToInsert = data.criteria.map(c => ({
        rubric_id: data.rubricId,
        criterion_name: c.criterion_name,
        description: c.description,
        max_score: c.max_score,
        weight_percentage: c.weight_percentage,
        order_index: c.order_index,
      }));

      const { data: insertedCriteria, error: criteriaError } = await supabase
        .from('rubric_criteria')
        .insert(criteriaToInsert)
        .select();

      if (criteriaError) throw criteriaError;

      // Insert levels for each criteria
      const levelsToInsert: TablesInsert<'rubric_levels'>[] = [];
      data.criteria.forEach((c, index) => {
        const criteriaId = insertedCriteria[index]?.id;
        if (criteriaId && c.levels) {
          c.levels.forEach(level => {
            levelsToInsert.push({
              criteria_id: criteriaId,
              level_name: level.level_name,
              description: level.description,
              score_range_min: level.score_range_min,
              score_range_max: level.score_range_max,
              order_index: level.order_index,
            });
          });
        }
      });

      if (levelsToInsert.length > 0) {
        const { error: levelsError } = await supabase
          .from('rubric_levels')
          .insert(levelsToInsert);

        if (levelsError) throw levelsError;
      }

      return insertedCriteria;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rubrics'] });
      queryClient.invalidateQueries({ queryKey: ['rubric'] });
    },
  });
}

// Fetch student scores for a rubric
export function useRubricScores(rubricId: string) {
  return useQuery({
    queryKey: ['rubric-scores', rubricId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_rubric_scores')
        .select(`
          *,
          student:profiles!student_rubric_scores_student_profile_id_fkey(id, full_name, nim),
          graded_by:profiles!student_rubric_scores_graded_by_profile_id_fkey(id, full_name),
          criteria:rubric_criteria(id, criterion_name)
        `)
        .eq('rubric_id', rubricId);

      if (error) throw error;
      return data;
    },
    enabled: !!rubricId,
  });
}

// Upsert student score
export function useUpsertRubricScore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      rubric_id: string;
      criteria_id: string;
      student_profile_id: string;
      score: number;
      notes?: string;
      graded_by_profile_id: string;
    }) => {
      const { data: result, error } = await supabase
        .from('student_rubric_scores')
        .upsert({
          ...data,
          graded_at: new Date().toISOString(),
        }, {
          onConflict: 'rubric_id,criteria_id,student_profile_id',
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rubric-scores'] });
    },
  });
}

// Batch upsert scores
export function useBatchUpsertRubricScores() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Array<{
      rubric_id: string;
      criteria_id: string;
      student_profile_id: string;
      score: number;
      notes?: string;
      graded_by_profile_id: string;
    }>) => {
      const { data: result, error } = await supabase
        .from('student_rubric_scores')
        .upsert(
          data.map(d => ({
            ...d,
            graded_at: new Date().toISOString(),
          })),
          { onConflict: 'rubric_id,criteria_id,student_profile_id' }
        )
        .select();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rubric-scores'] });
    },
  });
}
