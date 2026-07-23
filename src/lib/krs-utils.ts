import { SupabaseClient } from '@supabase/supabase-js';

export async function syncStudentElearningClasses(supabase: SupabaseClient<any, "public", any>, studentId: string, krsId: string, action: 'approve' | 'reset') {
  try {
    // 1. Get student profile to get their class_group name (e.g. "Reguler Ikhwan")
    const { data: profile, error: pError } = await supabase
      .from('profiles')
      .select('class_group')
      .eq('id', studentId)
      .single();
      
    if (pError || !profile?.class_group) return;
    
    // 2. Fetch the krs_items to know which courses they are taking
    const { data: krsItems, error: kError } = await supabase
      .from('krs_items')
      .select('course_id')
      .eq('krs_id', krsId);
      
    if (kError || !krsItems || krsItems.length === 0) return;
    
    const courseIds = krsItems.map((item: any) => item.course_id);
    
    // 3. Find matching E-learning class_groups for these courses and the student's class_group name
    const { data: matchingClasses, error: mcError } = await supabase
      .from('class_groups')
      .select('id')
      .eq('name', profile.class_group)
      .in('course_id', courseIds);
      
    if (mcError) return;
    
    const matchedClassIds = matchingClasses.map((c: any) => c.id);
    
    // 4. Find all class_groups for these courses (regardless of name) to know which ones to remove from
    const { data: allCourseClasses, error: acError } = await supabase
      .from('class_groups')
      .select('id')
      .in('course_id', courseIds);
      
    if (acError) return;
    
    const allCourseClassIds = allCourseClasses.map((c: any) => c.id);
    
    // 5. Delete existing class_students records for this student in ANY class of these courses
    if (allCourseClassIds.length > 0) {
      await supabase
        .from('class_students')
        .delete()
        .eq('student_profile_id', studentId)
        .in('class_group_id', allCourseClassIds);
    }
    
    // 6. If action is 'approve' and we have matches, insert them!
    if (action === 'approve' && matchedClassIds.length > 0) {
      const inserts = matchedClassIds.map((classId: string) => ({
        class_group_id: classId,
        student_profile_id: studentId
      }));
      
      await supabase
        .from('class_students')
        .insert(inserts);
    }
    
  } catch (err) {
    console.error('Error syncing elearning classes:', err);
  }
}
