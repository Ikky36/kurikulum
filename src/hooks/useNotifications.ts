import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface NotificationItem {
  id: string;
  type: 'unread_material' | 'pending_assignment' | 'ungraded_submission';
  title: string;
  subtitle: string;
  classTitle: string;
  dueDate?: string | null;
  createdAt: string;
  classId: string;
}

async function fetchStudentNotifications(profileId: string): Promise<NotificationItem[]> {
  const notifications: NotificationItem[] = [];

  // 1. Get student's class group IDs
  const { data: classStudents } = await supabase
    .from('class_students')
    .select('class_group_id')
    .eq('student_profile_id', profileId);

  if (!classStudents || classStudents.length === 0) return notifications;

  const classGroupIds = classStudents.map(cs => cs.class_group_id);

  // 2. Get elearning classes for these groups
  const { data: eClasses } = await supabase
    .from('elearning_classes')
    .select('id, title, class_group_id, course_id')
    .in('class_group_id', classGroupIds)
    .eq('is_active', true);

  if (!eClasses || eClasses.length === 0) return notifications;

  const classIds = eClasses.map(c => c.id);
  const classMap = new Map(eClasses.map(c => [c.id, c]));

  // 3. Get published materials and student's progress in parallel
  const [materialsRes, progressRes, assignmentsRes, submissionsRes] = await Promise.all([
    supabase
      .from('elearning_materials')
      .select('id, title, elearning_class_id, created_at, content_type')
      .in('elearning_class_id', classIds)
      .eq('is_published', true)
      .order('created_at', { ascending: false }),
    supabase
      .from('elearning_material_progress')
      .select('material_id, completed_at')
      .eq('student_profile_id', profileId),
    supabase
      .from('elearning_assignments')
      .select('id, title, elearning_class_id, assignment_type, due_date, created_at')
      .in('elearning_class_id', classIds)
      .eq('is_published', true)
      .order('created_at', { ascending: false }),
    supabase
      .from('elearning_submissions')
      .select('assignment_id')
      .eq('student_profile_id', profileId),
  ]);

  const materials = materialsRes.data || [];
  const progress = progressRes.data || [];
  const assignments = assignmentsRes.data || [];
  const submissions = submissionsRes.data || [];

  // Find unread materials (no progress record or not completed)
  const completedMaterialIds = new Set(
    progress.filter(p => p.completed_at).map(p => p.material_id)
  );

  for (const mat of materials) {
    if (!completedMaterialIds.has(mat.id)) {
      const cls = classMap.get(mat.elearning_class_id);
      notifications.push({
        id: `mat-${mat.id}`,
        type: 'unread_material',
        title: mat.title,
        subtitle: `Materi ${mat.content_type === 'video' ? 'video' : ''} belum dibaca`,
        classTitle: cls?.title || '',
        createdAt: mat.created_at,
        classId: mat.elearning_class_id,
      });
    }
  }

  // Find pending assignments (no submission)
  const submittedAssignmentIds = new Set(submissions.map(s => s.assignment_id));

  for (const assg of assignments) {
    if (!submittedAssignmentIds.has(assg.id)) {
      const cls = classMap.get(assg.elearning_class_id);
      const isQuiz = assg.assignment_type === 'quiz';
      notifications.push({
        id: `assg-${assg.id}`,
        type: 'pending_assignment',
        title: assg.title,
        subtitle: isQuiz ? 'Quiz belum dikerjakan' : 'Tugas belum dikumpulkan',
        classTitle: cls?.title || '',
        dueDate: assg.due_date,
        createdAt: assg.created_at,
        classId: assg.elearning_class_id,
      });
    }
  }

  return notifications;
}

async function fetchDosenNotifications(profileId: string): Promise<NotificationItem[]> {
  const notifications: NotificationItem[] = [];

  // 1. Get classes taught by this instructor
  const { data: eClasses } = await supabase
    .from('elearning_classes')
    .select('id, title')
    .eq('instructor_profile_id', profileId)
    .eq('is_active', true);

  if (!eClasses || eClasses.length === 0) return notifications;

  const classIds = eClasses.map(c => c.id);
  const classMap = new Map(eClasses.map(c => [c.id, c]));

  // 2. Get assignments for these classes
  const { data: assignments } = await supabase
    .from('elearning_assignments')
    .select('id, title, elearning_class_id, assignment_type')
    .in('elearning_class_id', classIds)
    .eq('is_published', true);

  if (!assignments || assignments.length === 0) return notifications;

  const assignmentIds = assignments.map(a => a.id);
  const assignmentMap = new Map(assignments.map(a => [a.id, a]));

  // 3. Get ungraded submissions
  const { data: ungradedSubmissions } = await supabase
    .from('elearning_submissions')
    .select('id, assignment_id, student_profile_id, submitted_at, score')
    .in('assignment_id', assignmentIds)
    .is('graded_at', null)
    .order('submitted_at', { ascending: false });

  if (!ungradedSubmissions || ungradedSubmissions.length === 0) return notifications;

  // Get student names
  const studentIds = [...new Set(ungradedSubmissions.map(s => s.student_profile_id))];
  const { data: students } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', studentIds);

  const studentMap = new Map((students || []).map(s => [s.id, s.full_name]));

  // Group by assignment for cleaner notifications
  const ungradedByAssignment = new Map<string, typeof ungradedSubmissions>();
  for (const sub of ungradedSubmissions) {
    // Skip quiz submissions that already have auto-graded scores
    const assignment = assignmentMap.get(sub.assignment_id);
    if (assignment?.assignment_type === 'quiz' && sub.score !== null) continue;

    const existing = ungradedByAssignment.get(sub.assignment_id) || [];
    existing.push(sub);
    ungradedByAssignment.set(sub.assignment_id, existing);
  }

  for (const [assignmentId, subs] of ungradedByAssignment) {
    const assignment = assignmentMap.get(assignmentId);
    if (!assignment) continue;
    const cls = classMap.get(assignment.elearning_class_id);

    notifications.push({
      id: `ungraded-${assignmentId}`,
      type: 'ungraded_submission',
      title: assignment.title,
      subtitle: `${subs.length} pengumpulan belum diperiksa`,
      classTitle: cls?.title || '',
      createdAt: subs[0]?.submitted_at || '',
      classId: assignment.elearning_class_id,
    });
  }

  return notifications;
}

export function useNotifications() {
  const { profile, user } = useAuth();

  return useQuery({
    queryKey: ['notifications', user?.id, profile?.role],
    queryFn: async () => {
      if (!profile || !user) return [];

      const role = profile.role;

      if (role === 'mahasiswa') {
        return fetchStudentNotifications(profile.id);
      } else if (role === 'dosen' || role === 'admin' || role === 'sub_admin') {
        // Dosen, admin, sub_admin get ungraded submission notifications
        const dosenNotifs = await fetchDosenNotifications(profile.id);
        return dosenNotifs;
      }

      return [];
    },
    enabled: !!profile && !!user,
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
    staleTime: 2 * 60 * 1000,
  });
}
