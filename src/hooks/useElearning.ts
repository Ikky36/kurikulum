import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

// Types
export type ElearningClass = Tables<'elearning_classes'>;
export type ElearningSession = Tables<'elearning_sessions'>;
export type ElearningAttendance = Tables<'elearning_attendance'>;
export type ElearningMaterial = Tables<'elearning_materials'>;
export type ElearningAssignment = Tables<'elearning_assignments'>;
export type ElearningQuizQuestion = Tables<'elearning_quiz_questions'>;
export type ElearningSubmission = Tables<'elearning_submissions'>;

// Fetch all elearning classes with related data
export function useElearningClasses() {
  return useQuery({
    queryKey: ['elearning-classes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('elearning_classes')
        .select(`
          *,
          class_group:class_groups(*),
          course:courses(*),
          instructor:profiles!elearning_classes_instructor_profile_id_fkey(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });
}

// Fetch a single elearning class
export function useElearningClass(classId: string) {
  return useQuery({
    queryKey: ['elearning-class', classId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('elearning_classes')
        .select(`
          *,
          class_group:class_groups(*),
          course:courses(*),
          instructor:profiles!elearning_classes_instructor_profile_id_fkey(*)
        `)
        .eq('id', classId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!classId,
  });
}

// Create elearning class
export function useCreateElearningClass() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: TablesInsert<'elearning_classes'>) => {
      const { data: result, error } = await supabase
        .from('elearning_classes')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['elearning-classes'] });
    },
  });
}

// Update elearning class
export function useUpdateElearningClass() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: TablesUpdate<'elearning_classes'> & { id: string }) => {
      const { data: result, error } = await supabase
        .from('elearning_classes')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['elearning-classes'] });
    },
  });
}

// Delete elearning class
export function useDeleteElearningClass() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('elearning_classes')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['elearning-classes'] });
    },
  });
}

// Fetch sessions for a class
export function useElearningSessions(classId: string) {
  return useQuery({
    queryKey: ['elearning-sessions', classId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('elearning_sessions')
        .select('*')
        .eq('elearning_class_id', classId)
        .order('session_number', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!classId,
  });
}

// Create session
export function useCreateElearningSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: TablesInsert<'elearning_sessions'>) => {
      const { data: result, error } = await supabase
        .from('elearning_sessions')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['elearning-sessions', variables.elearning_class_id] });
    },
  });
}

// Update session
export function useUpdateElearningSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: TablesUpdate<'elearning_sessions'> & { id: string }) => {
      const { data: result, error } = await supabase
        .from('elearning_sessions')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['elearning-sessions'] });
    },
  });
}

// Delete session
export function useDeleteElearningSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('elearning_sessions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['elearning-sessions'] });
    },
  });
}

// Fetch attendance for a session
export function useElearningAttendance(sessionId: string) {
  return useQuery({
    queryKey: ['elearning-attendance', sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('elearning_attendance')
        .select(`
          *,
          student:profiles!elearning_attendance_student_profile_id_fkey(*)
        `)
        .eq('elearning_session_id', sessionId);

      if (error) throw error;
      return data;
    },
    enabled: !!sessionId,
  });
}

// Upsert attendance (create or update)
export function useUpsertAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: TablesInsert<'elearning_attendance'>) => {
      const { data: result, error } = await supabase
        .from('elearning_attendance')
        .upsert(data, { onConflict: 'elearning_session_id,student_profile_id' })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['elearning-attendance', variables.elearning_session_id] });
    },
  });
}

// Batch upsert attendance
export function useBatchUpsertAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: TablesInsert<'elearning_attendance'>[]) => {
      const { data: result, error } = await supabase
        .from('elearning_attendance')
        .upsert(data, { onConflict: 'elearning_session_id,student_profile_id' })
        .select();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['elearning-attendance'] });
    },
  });
}

// Fetch students in a class group
export function useClassStudents(classGroupId: string) {
  return useQuery({
    queryKey: ['class-students', classGroupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('class_students')
        .select(`
          *,
          student:profiles!class_students_student_profile_id_fkey(*)
        `)
        .eq('class_group_id', classGroupId);

      if (error) throw error;
      return data;
    },
    enabled: !!classGroupId,
  });
}

// Fetch class groups
export function useClassGroups() {
  return useQuery({
    queryKey: ['class-groups'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('class_groups')
        .select('*')
        .order('name');

      if (error) throw error;
      return data;
    },
  });
}
