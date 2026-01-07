import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useElearningClasses, type ElearningClass } from '@/hooks/useElearning';
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

  const isAdmin = profile?.role === 'admin';
  const typedClasses = (classes || []) as ClassWithRelations[];
  const myClasses = typedClasses.filter(
    (c) => isAdmin || c.instructor_profile_id === profile?.id
  );
  const selectedClass = myClasses.find(c => c.id === selectedClassId);
  const canEdit = isAdmin || selectedClass?.instructor_profile_id === profile?.id;

  if (isLoading) {
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