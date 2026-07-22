import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout } from '@/components/layout/Layout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { AlertCircle, CheckCircle2, Clock, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function KrsMahasiswa() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  // Ambil semester aktif berdasarkan angkatan mahasiswa dan tahun akademik aktif
  const { data: activeSemester, isLoading: isLoadingSemester } = useQuery({
    queryKey: ['semesters', 'calculated_active_semester', profile?.enrollment_year],
    enabled: !!profile,
    queryFn: async () => {
      // Fetch active academic year
      const { data: academicYear } = await supabase
        .from('academic_years')
        .select('*')
        .eq('is_active', true)
        .maybeSingle();

      // Fetch active semester type (ganjil/genap)
      const { data: setting } = await supabase
        .from('app_settings')
        .select('setting_value')
        .eq('setting_key', 'active_semester_type')
        .maybeSingle();

      const activeSemesterType = setting?.setting_value || 'ganjil';

      // Calculate student's current semester
      const { calculateSemester } = await import('@/utils/academicHelpers');
      let calculatedSemesterNum = 1;
      if (academicYear && profile?.enrollment_year) {
        calculatedSemesterNum = calculateSemester(profile.enrollment_year, academicYear.name, activeSemesterType) || 1;
      }

      // Fetch the corresponding semester row
      const { data: semester, error } = await supabase
        .from('semesters')
        .select('*')
        .eq('order_index', calculatedSemesterNum)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') throw error; // ignore no rows
      
      // Attach academic_year_id to be used when creating KRS
      if (semester && academicYear) {
         (semester as any).academic_year_id = academicYear.id;
      }

      return semester;
    },
  });

  // Ambil KRS milik mahasiswa untuk semester aktif
  const { data: krs, isLoading: isLoadingKrs } = useQuery({
    queryKey: ['krs', user?.id, activeSemester?.id],
    enabled: !!user?.id && !!activeSemester?.id,
    queryFn: async () => {
      let query = supabase
        .from('krs')
        .select('*, krs_items(*)')
        .eq('student_id', user!.id)
        .eq('semester_id', activeSemester!.id);
        
      if ((activeSemester as any).academic_year_id) {
         query = query.eq('academic_year_id', (activeSemester as any).academic_year_id);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false }).limit(1).maybeSingle();
      
      if (error) throw error;
      return data;
    },
  });

  // Ambil riwayat nilai (student_grades) untuk mengecek kelulusan prasyarat dan mengulang
  const { data: grades = [] } = useQuery({
    queryKey: ['student_grades', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_grades')
        .select('course_id, final_score, grade, courses(passing_score)')
        .eq('student_id', user!.id);
      
      if (error) throw error;
      return data;
    },
  });

  // Ambil daftar mata kuliah kurikulum yang sesuai dengan paritas semester aktif
  const { data: availableCourses = [], isLoading: isLoadingCourses } = useQuery({
    queryKey: ['courses_available', activeSemester?.id],
    enabled: !!activeSemester?.id,
    queryFn: async () => {
      // Ambil semua courses yang punya semester yang ganjil/genapnya sama dengan activeSemester
      const { data, error } = await supabase
        .from('courses')
        .select(`
          *,
          curricula!inner(name, is_active),
          course_prerequisites!course_prerequisites_course_id_fkey(prerequisite_course_id)
        `)
        .eq('curricula.is_active', true)
        .order('semester', { ascending: true })
        .order('name', { ascending: true });
        
      if (error) throw error;
      return data;
    },
  });

  // Tentukan apakah semester aktif ini ganjil atau genap dari order_index atau nama
  // Kita asumsikan format standar atau fallback ke paritas order_index jika ada
  const isActiveSemesterEven = activeSemester ? 
    (activeSemester.name.toLowerCase().includes('genap') || activeSemester.order_index % 2 === 0) : false;

  // Proses mata kuliah yang bisa diambil (filter ganjil/genap)
  const processedCourses = useMemo(() => {
    if (!activeSemester) return [];
    
    // Filter mata kuliah yang paritasnya sama dengan semester aktif
    // Semester 1,3,5 = Ganjil. Semester 2,4,6 = Genap
    const filtered = availableCourses.filter(course => {
      if (!course.semester) return true; // jika tidak ditentukan semesternya, anggap bisa diambil
      
      // Deteksi semester mata kuliah
      const courseSemNum = parseInt(course.semester.replace(/[^0-9]/g, ''));
      if (isNaN(courseSemNum)) return true;
      
      // Jangan tampilkan mata kuliah yang belum saatnya diambil (misal semester 7 padahal mahasiswa masih semester 5)
      if (activeSemester.order_index && courseSemNum > activeSemester.order_index) return false;
      
      const isCourseEven = courseSemNum % 2 === 0;
      return isCourseEven === isActiveSemesterEven;
    });

    // Klasifikasikan status setiap mata kuliah (Bisa diambil, Prasyarat belum lulus, Sudah lulus)
    return filtered.map(course => {
      // Cek apakah mahasiswa sudah lulus matkul ini
      const gradeRecord = grades.find(g => g.course_id === course.id);
      const isPassed = gradeRecord && gradeRecord.final_score !== null && 
        gradeRecord.final_score >= (gradeRecord.courses?.passing_score || 60);

      // Cek apakah prasyarat terpenuhi
      const prerequisites = course.course_prerequisites || [];
      const unmetPrerequisites = prerequisites.filter((prq: any) => {
        const prqRecord = grades.find(g => g.course_id === prq.prerequisite_course_id);
        const prqPassed = prqRecord && prqRecord.final_score !== null && 
          prqRecord.final_score >= (prqRecord.courses?.passing_score || 60);
        return !prqPassed;
      });

      return {
        ...course,
        isPassed,
        isRetake: gradeRecord && !isPassed,
        unmetPrerequisites,
        canTake: !isPassed && unmetPrerequisites.length === 0,
      };
    });
  }, [availableCourses, activeSemester, isActiveSemesterEven, grades]);

  // Group courses by semester
  const groupedCourses = useMemo(() => {
    const groups: { [key: string]: any[] } = {};
    processedCourses.forEach(course => {
      if (course.isPassed) return; // Sembunyikan yang sudah lulus
      const sem = course.semester || 'Lainnya';
      if (!groups[sem]) groups[sem] = [];
      groups[sem].push(course);
    });
    return groups;
  }, [processedCourses]);

  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  
  // Set initial selected courses if KRS exists
  useMemo(() => {
    if (krs && krs.krs_items) {
      setSelectedCourseIds(krs.krs_items.map((item: any) => item.course_id));
    }
  }, [krs]);

  const maxSks = activeSemester?.max_sks || 24;
  const currentSks = selectedCourseIds.reduce((total, id) => {
    const course = processedCourses.find(c => c.id === id);
    return total + (course?.sks || 0);
  }, 0);

  const toggleCourse = (courseId: string) => {
    setSelectedCourseIds(prev => {
      if (prev.includes(courseId)) {
        return prev.filter(id => id !== courseId);
      } else {
        const course = processedCourses.find(c => c.id === courseId);
        if (currentSks + (course?.sks || 0) > maxSks) {
          toast.error('Gagal mengambil mata kuliah: Melebihi batas maksimal SKS.');
          return prev;
        }
        return [...prev, courseId];
      }
    });
  };

  const submitKrsMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !activeSemester?.id) throw new Error('Data tidak lengkap');

      // Update atau Insert KRS header
      let krsId = krs?.id;
      if (!krsId) {
        // Kita butuh academic_year_id dari suatu tempat, atau activeSemester sudah cukup (tapi krs butuh academic_year_id)
        // Jika krs tabel butuh academic_year_id, kita cari dari activeSemester (asumsi ada)
        const academic_year_id = activeSemester.academic_year_id;
        
        const { data: newKrs, error: krsError } = await supabase
          .from('krs')
          .insert({
            student_id: user.id,
            semester_id: activeSemester.id,
            academic_year_id: academic_year_id || null, // Pastikan ini tidak null jika required
            status: 'pending'
          })
          .select()
          .single();
          
        if (krsError) throw krsError;
        krsId = newKrs.id;
      } else {
        const { error: krsError } = await supabase
          .from('krs')
          .update({ status: 'pending' })
          .eq('id', krsId);
        if (krsError) throw krsError;
      }

      // Hapus item lama dan insert yang baru
      await supabase.from('krs_items').delete().eq('krs_id', krsId);
      
      if (selectedCourseIds.length > 0) {
        const items = selectedCourseIds.map(course_id => ({
          krs_id: krsId,
          course_id
        }));
        const { error: itemsError } = await supabase.from('krs_items').insert(items);
        if (itemsError) throw itemsError;
      }
    },
    onSuccess: () => {
      toast.success('KRS berhasil diajukan dan sedang menunggu persetujuan.');
      queryClient.invalidateQueries({ queryKey: ['krs'] });
    },
    onError: (error: any) => {
      toast.error('Terjadi kesalahan: ' + error.message);
    }
  });

  const cancelKrsMutation = useMutation({
    mutationFn: async () => {
      if (!krs?.id) return;
      const { error } = await supabase
        .from('krs')
        .update({ status: 'draft' }) // atau delete record
        .eq('id', krs.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Pengajuan KRS berhasil dibatalkan.');
      queryClient.invalidateQueries({ queryKey: ['krs'] });
    },
    onError: (error: any) => {
      toast.error('Terjadi kesalahan: ' + error.message);
    }
  });

  if (isLoadingSemester || isLoadingCourses || isLoadingKrs) {
    return (
      <Layout>
        <div className="container py-8 text-center">Memuat data KRS...</div>
      </Layout>
    );
  }

  if (!activeSemester) {
    return (
      <Layout>
        <div className="container py-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Tidak ada semester aktif</AlertTitle>
            <AlertDescription>
              Belum ada semester yang diaktifkan oleh admin. Anda tidak dapat mengisi KRS saat ini.
            </AlertDescription>
          </Alert>
        </div>
      </Layout>
    );
  }

  const isPending = krs?.status === 'pending';
  const isApproved = krs?.status === 'approved';
  const isLocked = isPending || isApproved;

  return (
    <Layout>
      <div className="container py-8 max-w-6xl">
        <div className="flex flex-col md:flex-row gap-6 mb-8 items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">Kartu Rencana Studi (KRS)</h1>
            <p className="text-muted-foreground">
              Semester: <span className="font-semibold text-foreground">{activeSemester.name}</span>
            </p>
          </div>
          <Card className="w-full md:w-auto min-w-[250px]">
            <CardContent className="p-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Status Pengajuan</p>
                {isApproved ? (
                  <Badge className="bg-green-500"><CheckCircle2 className="w-3 h-3 mr-1"/> Disetujui</Badge>
                ) : isPending ? (
                  <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-700 dark:text-yellow-400">
                    <Clock className="w-3 h-3 mr-1"/> Menunggu Persetujuan
                  </Badge>
                ) : (
                  <Badge variant="outline">Belum Diajukan (Draft)</Badge>
                )}
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground mb-1">Total SKS</p>
                <p className="text-2xl font-bold">
                  <span className={currentSks > maxSks ? "text-red-500" : "text-primary"}>{currentSks}</span>
                  <span className="text-muted-foreground text-sm font-normal"> / {maxSks}</span>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {isApproved && (
          <Alert className="mb-6 bg-green-500/10 text-green-700 border-green-500/20">
            <CheckCircle2 className="h-4 w-4" color="green" />
            <AlertTitle>KRS Disetujui</AlertTitle>
            <AlertDescription>
              KRS Anda telah disetujui oleh Dosen Pembimbing / Admin. Fitur cetak KRS akan tersedia segera.
            </AlertDescription>
          </Alert>
        )}

        {isPending && (
          <Alert className="mb-6 bg-yellow-500/10 text-yellow-700 border-yellow-500/20">
            <Info className="h-4 w-4" color="#a16207" />
            <AlertTitle>KRS Sedang Diproses</AlertTitle>
            <AlertDescription className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2">
              <span>Menunggu persetujuan Dosen Pembimbing Akademik / Admin. Anda masih bisa membatalkan pengajuan jika ingin mengubah mata kuliah.</span>
              <Button variant="outline" size="sm" onClick={() => cancelKrsMutation.mutate()} disabled={cancelKrsMutation.isPending}>
                Tarik/Batal Ajukan
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {(krs?.status === 'draft' || krs?.status === 'rejected') && krs?.notes && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>KRS Dikembalikan / Ditolak</AlertTitle>
            <AlertDescription className="mt-2 font-medium">
              Catatan Admin: "{krs.notes}"
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-xl font-semibold">Mata Kuliah Tersedia</h2>
            
            {Object.keys(groupedCourses).sort().map(semesterName => (
              <Card key={semesterName}>
                <CardHeader className="py-4">
                  <CardTitle className="text-lg">Semester {semesterName}</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {groupedCourses[semesterName].map(course => {
                      const isSelected = selectedCourseIds.includes(course.id);
                      return (
                        <div key={course.id} className={`p-4 flex items-center justify-between hover:bg-muted/50 transition-colors ${isSelected ? 'bg-primary/5' : ''}`}>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-medium">{course.code} - {course.name}</h3>
                              {course.isRetake && (
                                <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Mengulang</Badge>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground flex gap-4">
                              <span>SKS: <strong className="text-foreground">{course.sks}</strong></span>
                              <span>Prasyarat: {course.course_prerequisites?.length > 0 ? (
                                course.canTake ? (
                                  <span className="text-green-600 dark:text-green-400">Terpenuhi</span>
                                ) : (
                                  <span className="text-red-500">Belum Terpenuhi</span>
                                )
                              ) : '-'}</span>
                            </div>
                            
                            {!course.canTake && course.unmetPrerequisites?.length > 0 && (
                              <p className="text-xs text-red-500 mt-1">
                                * Anda belum lulus prasyarat untuk mata kuliah ini.
                              </p>
                            )}
                          </div>
                          <div className="ml-4">
                            <Button
                              variant={isSelected ? "destructive" : "default"}
                              size="sm"
                              disabled={isLocked || (!isSelected && !course.canTake) || (!isSelected && currentSks + course.sks > maxSks)}
                              onClick={() => toggleCourse(course.id)}
                            >
                              {isSelected ? "Batal Ambil" : "Ambil"}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}

            {Object.keys(groupedCourses).length === 0 && (
              <div className="text-center py-12 border rounded-lg text-muted-foreground">
                Tidak ada mata kuliah yang tersedia untuk diambil pada paritas semester ini.
              </div>
            )}
          </div>

          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>Ringkasan KRS</CardTitle>
                <CardDescription>Mata kuliah yang Anda pilih</CardDescription>
              </CardHeader>
              <CardContent>
                {selectedCourseIds.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Belum ada mata kuliah yang diambil.</p>
                ) : (
                  <ul className="space-y-3">
                    {selectedCourseIds.map(id => {
                      const course = processedCourses.find(c => c.id === id);
                      if (!course) return null;
                      return (
                        <li key={id} className="flex justify-between items-start text-sm border-b pb-2">
                          <div>
                            <p className="font-medium">{course.name}</p>
                            <p className="text-muted-foreground text-xs">{course.code}</p>
                          </div>
                          <span className="font-semibold">{course.sks} SKS</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
                <div className="mt-4 pt-4 border-t flex justify-between items-center font-bold">
                  <span>Total SKS</span>
                  <span className={currentSks > maxSks ? "text-red-500" : ""}>{currentSks}</span>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  className="w-full" 
                  disabled={isLocked || selectedCourseIds.length === 0 || currentSks > maxSks || submitKrsMutation.isPending}
                  onClick={() => submitKrsMutation.mutate()}
                >
                  {submitKrsMutation.isPending ? "Memproses..." : "Ajukan KRS"}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
