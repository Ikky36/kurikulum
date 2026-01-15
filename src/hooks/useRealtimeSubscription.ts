import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

type TableName = 
  | 'app_settings'
  | 'profiles'
  | 'courses'
  | 'grades'
  | 'enrollments'
  | 'course_instructors'
  | 'curricula'
  | 'plos'
  | 'clos'
  | 'llos'
  | 'assessments'
  | 'student_assessment_scores'
  | 'elearning_classes'
  | 'elearning_materials'
  | 'elearning_assignments'
  | 'elearning_submissions'
  | 'elearning_sessions'
  | 'elearning_attendance'
  | 'elearning_quiz_questions'
  | 'class_groups'
  | 'class_students';

interface UseRealtimeOptions {
  table: TableName;
  queryKeys: string[][];
  filter?: {
    column: string;
    value: string;
  };
  enabled?: boolean;
}

/**
 * Hook to subscribe to realtime changes on a table and invalidate related queries
 */
export function useRealtimeSubscription({
  table,
  queryKeys,
  filter,
  enabled = true,
}: UseRealtimeOptions) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;

    const channelName = filter 
      ? `${table}-${filter.column}-${filter.value}`
      : `${table}-changes`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          ...(filter ? { filter: `${filter.column}=eq.${filter.value}` } : {}),
        },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          console.log(`[Realtime] ${table} change:`, payload.eventType);
          
          // Invalidate all related query keys
          queryKeys.forEach((key) => {
            queryClient.invalidateQueries({ queryKey: key });
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, queryKeys, filter, enabled, queryClient]);
}

/**
 * Hook to subscribe to multiple tables at once
 */
export function useMultiTableRealtimeSubscription(
  subscriptions: Array<{
    table: TableName;
    queryKeys: string[][];
    filter?: { column: string; value: string };
  }>,
  enabled = true
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled || subscriptions.length === 0) return;

    const channelName = `multi-table-${subscriptions.map(s => s.table).join('-')}`;
    
    let channel = supabase.channel(channelName);

    subscriptions.forEach(({ table, queryKeys, filter }) => {
      channel = channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          ...(filter ? { filter: `${filter.column}=eq.${filter.value}` } : {}),
        },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          console.log(`[Realtime] ${table} change:`, payload.eventType);
          
          queryKeys.forEach((key) => {
            queryClient.invalidateQueries({ queryKey: key });
          });
        }
      );
    });

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [subscriptions, enabled, queryClient]);
}

/**
 * Global realtime subscription for app-wide data (settings, etc.)
 * Use this at the app level to keep global data in sync
 */
export function useGlobalRealtimeSubscription() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('global-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'app_settings' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['app-settings'] });
          queryClient.invalidateQueries({ queryKey: ['app-settings-all'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['admin-users'] });
          queryClient.invalidateQueries({ queryKey: ['profiles'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'courses' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['courses'] });
          queryClient.invalidateQueries({ queryKey: ['courses-with-stats'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'grades' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['courses-with-stats'] });
          queryClient.invalidateQueries({ queryKey: ['student-grades'] });
          queryClient.invalidateQueries({ queryKey: ['grades'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'enrollments' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['courses-with-stats'] });
          queryClient.invalidateQueries({ queryKey: ['enrollments'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'curricula' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['curricula'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'plos' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['plos'] });
          queryClient.invalidateQueries({ queryKey: ['plo-data'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'clos' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['clos'] });
          queryClient.invalidateQueries({ queryKey: ['course-clos'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'llos' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['llos'] });
          queryClient.invalidateQueries({ queryKey: ['clo-llos'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'assessments' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['assessments'] });
          queryClient.invalidateQueries({ queryKey: ['course-assessments'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'student_assessment_scores' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['assessment-scores'] });
          queryClient.invalidateQueries({ queryKey: ['student-assessment-scores'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'course_instructors' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['course-instructors'] });
          queryClient.invalidateQueries({ queryKey: ['courses-with-stats'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'class_groups' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['class-groups'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'class_students' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['class-students'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}

/**
 * E-Learning specific realtime subscription
 */
export function useElearningRealtimeSubscription(classId?: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!classId) return;

    const channel = supabase
      .channel(`elearning-${classId}`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'elearning_materials',
          filter: `elearning_class_id=eq.${classId}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['elearning-materials', classId] });
        }
      )
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'elearning_assignments',
          filter: `elearning_class_id=eq.${classId}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['elearning-assignments', classId] });
        }
      )
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'elearning_sessions',
          filter: `elearning_class_id=eq.${classId}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['elearning-sessions', classId] });
        }
      )
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'elearning_submissions'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['elearning-submissions'] });
          queryClient.invalidateQueries({ queryKey: ['student-submissions'] });
        }
      )
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'elearning_quiz_questions'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['quiz-questions'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [classId, queryClient]);
}

/**
 * Attendance-specific realtime subscription
 */
export function useAttendanceRealtimeSubscription(sessionId?: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!sessionId) return;

    const channel = supabase
      .channel(`attendance-${sessionId}`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'elearning_attendance',
          filter: `elearning_session_id=eq.${sessionId}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['elearning-attendance', sessionId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, queryClient]);
}
