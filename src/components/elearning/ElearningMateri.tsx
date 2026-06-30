import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useElearningClasses, type ElearningClass } from '@/hooks/useElearning';
import { useElearningRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText } from 'lucide-react';
import { MaterialList } from './MaterialList';
import { AssignmentList } from './AssignmentList';
import { RubricManager } from './RubricManager';
import { ContentImportDialog } from './ContentImportDialog';

type ClassWithRelations = ElearningClass & {
  class_group: { id: string; name: string } | null;
  course: { id: string; name: string; code: string } | null;
  instructor: { id: string; full_name: string; photo_url: string | null } | null;
};

interface ElearningMateriProps {
  selectedClassId: string;
  courseId: string;
  tabView: 'materials' | 'assignments' | 'rubrics';
  isActive?: boolean;
}

export function ElearningMateri({ selectedClassId, courseId, tabView, isActive = true }: ElearningMateriProps) {
  const { profile } = useAuth();
  const { data: classes, isLoading } = useElearningClasses();
  const [dosenCourseAssignments, setDosenCourseAssignments] = useState<{course_id: string, class_group_id: string | null}[]>([]);

  // Enable realtime subscription for selected class materials/assignments
  useElearningRealtimeSubscription(selectedClassId || undefined);

  const isAdmin = profile?.role === 'admin';
  const isSubAdmin = profile?.role === 'sub_admin';
  const isDosen = profile?.role === 'dosen';
  const typedClasses = (classes || []) as ClassWithRelations[];

  // Fetch dosen course assignments
  useEffect(() => {
    const fetchDosenAssignments = async () => {
      if (!profile?.id || !isDosen) return;
      
      try {
        const { data, error } = await supabase
          .from('course_instructors')
          .select('course_id, class_group_id')
          .eq('instructor_profile_id', profile.id);
        
        if (error) throw error;
        setDosenCourseAssignments(data || []);
      } catch (error) {
        console.error('Error fetching dosen assignments:', error);
      }
    };

    fetchDosenAssignments();
  }, [profile?.id, isDosen]);

  const selectedClass = typedClasses.find(c => c.id === selectedClassId);
  
  const canEdit = useMemo(() => {
    const isCreator = selectedClass?.instructor_profile_id === profile?.id;
    const hasDosenAccess = isDosen && dosenCourseAssignments.some(
      assignment => selectedClass?.course_id === assignment.course_id &&
      (assignment.class_group_id === null || assignment.class_group_id === selectedClass.class_group_id)
    );
    
    return (isAdmin || isSubAdmin || isCreator || hasDosenAccess) && isActive;
  }, [isAdmin, isSubAdmin, isDosen, dosenCourseAssignments, selectedClass, profile?.id, isActive]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!selectedClassId || !courseId) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-center">
            Tidak ada kelas yang dipilih
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {canEdit && (tabView === 'materials' || tabView === 'assignments') && (
        <div className="flex justify-end">
          <ContentImportDialog 
            courseId={courseId} 
            targetClassId={selectedClassId}
            defaultTab={tabView === 'assignments' ? 'assignments' : 'materials'}
          />
        </div>
      )}

      {tabView === 'materials' && (
        <MaterialList classId={selectedClassId} courseId={courseId} canEdit={canEdit} />
      )}

      {tabView === 'assignments' && (
        <AssignmentList classId={selectedClassId} courseId={courseId} canEdit={canEdit} />
      )}

      {tabView === 'rubrics' && (
        <RubricManager classId={selectedClassId} courseId={courseId} canEdit={canEdit} />
      )}
    </div>
  );
}
