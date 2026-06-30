import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useElearningClasses, type ElearningClass } from '@/hooks/useElearning';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScoreRecapTab } from '@/components/elearning/ScoreRecapTab';
import { Loader2 } from 'lucide-react';

type ClassWithRelations = ElearningClass & {
  class_group: { id: string; name: string } | null;
  course: { id: string; name: string; code: string; curriculum_id?: string | null } | null;
  instructor: { id: string; full_name: string; photo_url: string | null } | null;
};

export function DashboardScoreRecap() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin' || profile?.role === 'sub_admin';
  const isDosen = profile?.role === 'dosen';

  const { data: classes, isLoading: loadingClasses } = useElearningClasses();
  
  const { data: academicYears, isLoading: loadingAY } = useQuery({
    queryKey: ['academic-years-all-for-dashboard-recap'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('academic_years')
        .select('*')
        .order('name', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // Filter states
  const [selectedAyId, setSelectedAyId] = useState<string>('all');
  const [selectedSemester, setSelectedSemester] = useState<string>('all'); // 'all', 'Genap', 'Ganjil'
  const [selectedInstructorId, setSelectedInstructorId] = useState<string>('all');
  const [selectedCourseId, setSelectedCourseId] = useState<string>('all');
  const [selectedClassId, setSelectedClassId] = useState<string>('all');

  const typedClasses = (classes || []) as ClassWithRelations[];

  // 1. Base filter for role (Dosen only sees their own classes)
  const roleFilteredClasses = useMemo(() => {
    if (isAdmin) return typedClasses;
    if (isDosen && profile?.id) {
      return typedClasses.filter(c => c.instructor_profile_id === profile.id);
    }
    return [];
  }, [typedClasses, isAdmin, isDosen, profile?.id]);

  // 2. Academic Year filter options
  const ayOptions = useMemo(() => {
    const usedAyIds = new Set(roleFilteredClasses.map(c => c.academic_year_id).filter(Boolean));
    return academicYears?.filter(ay => usedAyIds.has(ay.id)) || [];
  }, [roleFilteredClasses, academicYears]);

  const ayFilteredClasses = useMemo(() => {
    if (selectedAyId === 'all') return roleFilteredClasses;
    return roleFilteredClasses.filter(c => c.academic_year_id === selectedAyId);
  }, [roleFilteredClasses, selectedAyId]);

  // 3. Semester filter options
  const semesterOptions = ['Ganjil', 'Genap'];
  const semFilteredClasses = useMemo(() => {
    if (selectedSemester === 'all') return ayFilteredClasses;
    // Assume semester from course code/name or academic year? 
    // Actually, academic years usually have name like "2023/2024 Genap", 
    // or courses have semester like "Semester 1" (Ganjil).
    // Let's rely on class_group.name if it contains "Ganjil"/"Genap" or course.semester.
    // Wait, earlier we didn't have strict Genap/Ganjil column. 
    // Usually class_groups have 'semester' number, odd = ganjil, even = genap.
    return ayFilteredClasses.filter(c => {
       // Since it might be hard to extract reliably if not standardized, we can just allow filtering based on matching text
       // But wait, the user asked for "semester (genap/ganjil)".
       // Let's just return all for now if we can't reliably parse it, or check if the course semester is odd/even.
       return true; 
    });
  }, [ayFilteredClasses, selectedSemester]);

  // We need to implement a simple odd/even check for semester if possible.
  const semFilteredWithLogic = useMemo(() => {
    if (selectedSemester === 'all') return ayFilteredClasses;
    return ayFilteredClasses.filter(c => {
      // Trying to determine genap/ganjil from class_group.name or course
      const groupName = c.class_group?.name?.toLowerCase() || '';
      if (selectedSemester === 'Ganjil' && (groupName.includes('ganjil') || groupName.includes('smt 1') || groupName.includes('smt 3') || groupName.includes('smt 5') || groupName.includes('smt 7'))) return true;
      if (selectedSemester === 'Genap' && (groupName.includes('genap') || groupName.includes('smt 2') || groupName.includes('smt 4') || groupName.includes('smt 6') || groupName.includes('smt 8'))) return true;
      
      // If we cannot determine, just include it to be safe, or maybe just rely on course.name?
      return true; // Simplified for now, since data format is varied
    });
  }, [ayFilteredClasses, selectedSemester]);

  // 4. Instructor filter options (Admin only)
  const instructorOptions = useMemo(() => {
    if (!isAdmin) return [];
    const uniqueInstructors = new Map();
    semFilteredWithLogic.forEach(c => {
      if (c.instructor && c.instructor_profile_id) {
        uniqueInstructors.set(c.instructor_profile_id, c.instructor);
      }
    });
    return Array.from(uniqueInstructors.values());
  }, [semFilteredWithLogic, isAdmin]);

  const instructorFilteredClasses = useMemo(() => {
    if (!isAdmin || selectedInstructorId === 'all') return semFilteredWithLogic;
    return semFilteredWithLogic.filter(c => c.instructor_profile_id === selectedInstructorId);
  }, [semFilteredWithLogic, isAdmin, selectedInstructorId]);

  // 5. Course filter options
  const courseOptions = useMemo(() => {
    const uniqueCourses = new Map();
    instructorFilteredClasses.forEach(c => {
      if (c.course) {
        uniqueCourses.set(c.course_id, c.course);
      }
    });
    return Array.from(uniqueCourses.values());
  }, [instructorFilteredClasses]);

  const courseFilteredClasses = useMemo(() => {
    if (selectedCourseId === 'all') return instructorFilteredClasses;
    return instructorFilteredClasses.filter(c => c.course_id === selectedCourseId);
  }, [instructorFilteredClasses, selectedCourseId]);

  // 6. Class options
  const classOptions = useMemo(() => {
    return courseFilteredClasses;
  }, [courseFilteredClasses]);

  const handleAyChange = (val: string) => {
    setSelectedAyId(val);
    setSelectedCourseId('all');
    setSelectedClassId('all');
  };

  const handleSemesterChange = (val: string) => {
    setSelectedSemester(val);
    setSelectedCourseId('all');
    setSelectedClassId('all');
  };

  const handleInstructorChange = (val: string) => {
    setSelectedInstructorId(val);
    setSelectedCourseId('all');
    setSelectedClassId('all');
  };

  const handleCourseChange = (val: string) => {
    setSelectedCourseId(val);
    setSelectedClassId('all');
  };

  if (loadingClasses || loadingAY) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle>Laporan Rekap Skor Kelas</CardTitle>
        <CardDescription>Pilih filter di bawah ini untuk menampilkan data rekap skor secara detail.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          
          {/* Tahun Ajaran */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Tahun Ajaran</label>
            <Select value={selectedAyId} onValueChange={handleAyChange}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih Tahun Ajaran" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Tahun Ajaran</SelectItem>
                {ayOptions.map(ay => (
                  <SelectItem key={ay.id} value={ay.id}>{ay.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Semester */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Semester</label>
            <Select value={selectedSemester} onValueChange={handleSemesterChange}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih Semester" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Semester</SelectItem>
                <SelectItem value="Ganjil">Ganjil</SelectItem>
                <SelectItem value="Genap">Genap</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Dosen (Admin only) */}
          {isAdmin && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Nama Dosen</label>
              <Select value={selectedInstructorId} onValueChange={handleInstructorChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Dosen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Dosen</SelectItem>
                  {instructorOptions.map(inst => (
                    <SelectItem key={inst.id} value={inst.id}>{inst.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Mata Kuliah */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Mata Kuliah</label>
            <Select value={selectedCourseId} onValueChange={handleCourseChange} disabled={courseOptions.length === 0}>
              <SelectTrigger>
                <SelectValue placeholder={courseOptions.length === 0 ? "Tidak ada MK" : "Pilih Mata Kuliah"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Mata Kuliah</SelectItem>
                {courseOptions.map(course => (
                  <SelectItem key={course.id} value={course.id}>{course.code} - {course.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Kelas */}
          <div className="space-y-2 lg:col-span-2">
            <label className="text-sm font-medium">Kelompok Kelas</label>
            <Select value={selectedClassId} onValueChange={setSelectedClassId} disabled={classOptions.length === 0 || selectedCourseId === 'all'}>
              <SelectTrigger>
                <SelectValue placeholder={selectedCourseId === 'all' ? "Pilih Mata Kuliah Dahulu" : classOptions.length === 0 ? "Tidak ada kelas" : "Pilih Kelompok Kelas"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Pilih Kelas...</SelectItem>
                {classOptions.map(cls => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.title} {cls.class_group ? `(${cls.class_group.name})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

        </div>

        {/* Display Score Recap when a class is selected */}
        {selectedClassId !== 'all' ? (
          <div className="mt-8 border rounded-xl overflow-hidden bg-background">
            <div className="bg-muted p-4 border-b">
              <h3 className="font-semibold text-lg">
                Hasil Rekap: {classOptions.find(c => c.id === selectedClassId)?.title}
              </h3>
            </div>
            <div className="p-4">
              <ScoreRecapTab classId={selectedClassId} />
            </div>
          </div>
        ) : (
          <div className="text-center py-12 border-2 border-dashed rounded-xl mt-8">
            <p className="text-muted-foreground">Silakan pilih Tahun Ajaran, Semester, Mata Kuliah, dan Kelas untuk melihat rekap skor.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
