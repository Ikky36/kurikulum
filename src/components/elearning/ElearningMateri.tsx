import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useElearningClasses, type ElearningClass } from '@/hooks/useElearning';
import { useElearningRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, BookOpen, ClipboardCheck } from 'lucide-react';
import { MaterialList } from './MaterialList';
import { AssignmentList } from './AssignmentList';

type ClassWithRelations = ElearningClass & {
  class_group: { id: string; name: string } | null;
  course: { id: string; name: string; code: string } | null;
  instructor: { id: string; full_name: string; photo_url: string | null } | null;
};

export function ElearningMateri() {
  const { profile } = useAuth();
  const { data: classes, isLoading } = useElearningClasses();
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [studentClassGroupIds, setStudentClassGroupIds] = useState<string[]>([]);
  const [loadingStudentClasses, setLoadingStudentClasses] = useState(false);
  const [dosenCourseAssignments, setDosenCourseAssignments] = useState<{course_id: string, class_group_id: string | null}[]>([]);

  // Enable realtime subscription for selected class materials/assignments
  useElearningRealtimeSubscription(selectedClassId || undefined);

  const isAdmin = profile?.role === 'admin';
  const isSubAdmin = profile?.role === 'sub_admin';
  const isDosen = profile?.role === 'dosen';
  const isMahasiswa = profile?.role === 'mahasiswa';
  const typedClasses = (classes || []) as ClassWithRelations[];

  // Fetch student's enrolled class groups
  useEffect(() => {
    const fetchStudentClassGroups = async () => {
      if (!profile?.id || !isMahasiswa) return;
      
      setLoadingStudentClasses(true);
      try {
        const { data, error } = await supabase
          .from('class_students')
          .select('class_group_id')
          .eq('student_profile_id', profile.id);
        
        if (error) throw error;
        setStudentClassGroupIds(data?.map(cs => cs.class_group_id) || []);
      } catch (error) {
        console.error('Error fetching student class groups:', error);
      } finally {
        setLoadingStudentClasses(false);
      }
    };

    fetchStudentClassGroups();
  }, [profile?.id, isMahasiswa]);

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

  // Filter classes based on role
  const myClasses = typedClasses.filter((c) => {
    if (isAdmin || isSubAdmin) return true;
    if (isDosen) {
      // Show classes where dosen is the creator OR assigned via course_instructors
      const isCreator = c.instructor_profile_id === profile?.id;
      const isAssigned = dosenCourseAssignments.some(
        assignment => assignment.course_id === c.course_id && 
        (assignment.class_group_id === null || assignment.class_group_id === c.class_group_id)
      );
      return isCreator || isAssigned;
    }
    if (isMahasiswa) return studentClassGroupIds.includes(c.class_group_id);
    return false;
  });

  const selectedClass = myClasses.find(c => c.id === selectedClassId);
  
  // Check if dosen can edit: is creator OR assigned to this course
  const isCreator = selectedClass?.instructor_profile_id === profile?.id;
  const isAssignedDosen = isDosen && dosenCourseAssignments.some(
    assignment => selectedClass?.course_id === assignment.course_id &&
    (assignment.class_group_id === null || assignment.class_group_id === selectedClass?.class_group_id)
  );
  const canEdit = isAdmin || isSubAdmin || isCreator || isAssignedDosen;

  if (isLoading || loadingStudentClasses) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Pilih Kelas</CardTitle>
          <CardDescription>Pilih kelas untuk mengelola materi pembelajaran</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedClassId} onValueChange={setSelectedClassId}>
            <SelectTrigger className="max-w-md">
              <SelectValue placeholder="Pilih kelas..." />
            </SelectTrigger>
            <SelectContent>
              {myClasses.map((cls) => (
                <SelectItem key={cls.id} value={cls.id}>
                  {cls.title} - {cls.class_group?.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedClassId && selectedClass?.course?.id ? (
        <Tabs defaultValue="materials" className="space-y-4">
          <TabsList>
            <TabsTrigger value="materials" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Materi Pembelajaran
            </TabsTrigger>
            <TabsTrigger value="assignments" className="flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4" />
              Tugas & Quiz
            </TabsTrigger>
          </TabsList>

          <TabsContent value="materials">
            <MaterialList classId={selectedClassId} courseId={selectedClass.course.id} canEdit={canEdit} />
          </TabsContent>

          <TabsContent value="assignments">
            <AssignmentList classId={selectedClassId} courseId={selectedClass.course.id} canEdit={canEdit} />
          </TabsContent>
        </Tabs>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              Pilih kelas terlebih dahulu untuk mengelola materi pembelajaran
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}