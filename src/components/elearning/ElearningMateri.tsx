import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useElearningClasses, type ElearningClass } from '@/hooks/useElearning';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FileText, BookOpen, ClipboardCheck, Construction } from 'lucide-react';

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Class Selection */}
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

      {selectedClassId ? (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Materials Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Materi Pembelajaran
              </CardTitle>
              <CardDescription>
                Buat dan kelola materi berdasarkan Sub-CPMK
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Construction className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                Fitur materi pembelajaran sedang dalam pengembangan
              </p>
              <p className="text-xs text-muted-foreground max-w-sm">
                Akan mencakup: pembuatan materi teks/gambar/video, integrasi AI untuk generate konten,
                dan penghubungan dengan Sub-CPMK
              </p>
            </CardContent>
          </Card>

          {/* Assignments Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5" />
                Tugas & Quiz
              </CardTitle>
              <CardDescription>
                Buat dan kelola tugas serta quiz
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Construction className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                Fitur tugas dan quiz sedang dalam pengembangan
              </p>
              <p className="text-xs text-muted-foreground max-w-sm">
                Akan mencakup: berbagai jenis soal quiz, Safe Exam Browser, 
                feedback AI, dan instrumen penilaian
              </p>
            </CardContent>
          </Card>
        </div>
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
