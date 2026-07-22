import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Layout } from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { useStudentGrades } from '@/hooks/useStudents';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { User, Mail, BookOpen, Camera, Loader2, CheckCircle2, XCircle, Calendar, GraduationCap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link, Navigate } from 'react-router-dom';
import { TableFilterHeader } from '@/components/ui/table-column-filter';
import { BimbinganAkademikTab } from '@/components/mahasiswa/BimbinganAkademikTab';

export default function DashboardMahasiswa() {
  const { user, profile, role, refreshProfile, loading } = useAuth();
  const { data: grades, isLoading: gradesLoading } = useStudentGrades(user?.id || '');
  const { toast } = useToast();

  // Enable realtime for student grades
  useRealtimeSubscription({
    table: 'grades',
    queryKeys: [['student-grades', user?.id || '']],
    enabled: !!user?.id,
  });
  
  const [editMode, setEditMode] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [nim, setNim] = useState(profile?.nim || '');
  const [program, setProgram] = useState(profile?.program || '');
  const [gender, setGender] = useState(profile?.gender || '');
  const [enrollmentYear, setEnrollmentYear] = useState(profile?.enrollment_year?.toString() || '');
  const [sistemKuliahId, setSistemKuliahId] = useState((profile as any)?.sistem_kuliah_id || '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Grade table filter state
  const [gradeCodeFilter, setGradeCodeFilter] = useState('');
  const [gradeCourseFilter, setGradeCourseFilter] = useState('');
  const [gradeStatusFilter, setGradeStatusFilter] = useState('');
  
  const { data: sistemKuliahOptions } = useQuery({
    queryKey: ['sistem-kuliah'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sistem_kuliah')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Query unread guidance logs
  const { data: unreadGuidanceCount = 0 } = useQuery({
    queryKey: ['student_unread_guidance', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      const { count, error } = await supabase
        .from('academic_guidance_logs')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', user.id)
        .eq('status', 'completed')
        .eq('is_read_by_student', false);
      
      if (error) {
        console.error("Error fetching unread guidance:", error);
        return 0;
      }
      return count || 0;
    },
    enabled: !!user?.id,
    refetchInterval: 30000 // Poll every 30s just in case
  });

  if (loading) {
    return <Layout><div className="container py-8 flex justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div></Layout>;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (role && role !== 'mahasiswa') {
    return <Navigate to={`/dashboard/${role}`} replace />;
  }

  const averageScore = grades && grades.length > 0
    ? grades.reduce((sum, g) => sum + g.final_score, 0) / grades.length
    : 0;

  const chartData = grades?.map(g => ({
    name: g.course?.name?.split(' ')[0] || 'Unknown',
    fullName: g.course?.name || 'Unknown',
    code: g.course?.code || '',
    score: g.final_score,
    passingScore: g.course?.passing_score || 60,
    isPassing: g.final_score >= (g.course?.passing_score || 60),
  })) || [];

  const radarData = chartData.map(d => ({
    subject: d.name,
    score: d.score,
    fullMark: 100,
  }));

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName,
        nim: nim,
        program: program,
        gender: gender || null,
        enrollment_year: enrollmentYear ? parseInt(enrollmentYear) : null,
        sistem_kuliah_id: sistemKuliahId || null,
      })
      .eq('id', user.id);

    setSaving(false);
    
    if (error) {
      toast({ title: 'Gagal menyimpan', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Berhasil', description: 'Profil berhasil diperbarui' });
      refreshProfile();
      setEditMode(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    const fileExt = file.name.split('.').pop();
    const filePath = `${user.id}/avatar.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      toast({ title: 'Gagal upload', description: uploadError.message, variant: 'destructive' });
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
    
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ photo_url: urlData.publicUrl })
      .eq('id', user.id);

    setUploading(false);

    if (updateError) {
      toast({ title: 'Gagal update profil', description: updateError.message, variant: 'destructive' });
    } else {
      toast({ title: 'Berhasil', description: 'Foto profil berhasil diperbarui' });
      refreshProfile();
    }
  };

  return (
    <Layout>
      <div className="container py-8 lg:py-12 px-4 sm:px-6 lg:px-10 xl:px-16">
        <div className="mb-8 animate-fade-in">
          <h1 className="font-display text-3xl font-bold lg:text-4xl mb-2">
            Dashboard Mahasiswa
          </h1>
          <p className="text-muted-foreground">
            Selamat datang, {profile?.full_name}
          </p>
        </div>

        <Tabs defaultValue="akademik" className="space-y-6">
          <TabsList className="bg-muted/50 p-1 mb-2">
            <TabsTrigger value="akademik" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <BookOpen className="h-4 w-4 mr-2" />
              Akademik & KRS
            </TabsTrigger>
            <TabsTrigger value="bimbingan" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground relative">
              <User className="h-4 w-4 mr-2" />
              Bimbingan Akademik
              {unreadGuidanceCount > 0 && (
                <Badge variant="destructive" className="absolute -top-2 -right-2 px-1.5 min-w-[20px] h-5 flex items-center justify-center animate-pulse">
                  {unreadGuidanceCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="akademik" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-3 mb-8">
              {/* Profile Card */}
              <Card className="animate-slide-up">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Profil Saya</CardTitle>
                    <Button 
                      variant={editMode ? 'secondary' : 'outline'} 
                      size="sm"
                      onClick={() => {
                        if (editMode) {
                          setFullName(profile?.full_name || '');
                          setNim(profile?.nim || '');
                          setProgram(profile?.program || '');
                          setGender(profile?.gender || '');
                          setEnrollmentYear(profile?.enrollment_year?.toString() || '');
                          setSistemKuliahId((profile as any)?.sistem_kuliah_id || '');
                        }
                        setEditMode(!editMode);
                      }}
                    >
                      {editMode ? 'Batal' : 'Edit'}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center text-center mb-6">
                    <div className="relative">
                      <Avatar className="h-24 w-24 ring-4 ring-primary/20 mb-2">
                        <AvatarImage src={profile?.photo_url || undefined} />
                        <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                          {profile?.full_name?.charAt(0) || 'M'}
                        </AvatarFallback>
                      </Avatar>
                      <label className="absolute -bottom-1 -right-1 cursor-pointer">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md hover:bg-primary/90 transition-colors">
                          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                        </div>
                        <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploading} />
                      </label>
                    </div>
                    {!editMode && (
                      <>
                        <h3 className="font-bold text-xl mt-2">{profile?.full_name}</h3>
                        <Badge variant="secondary" className="mt-2">Mahasiswa</Badge>
                      </>
                    )}
                  </div>
                  
                  {editMode ? (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Nama Lengkap</Label>
                        <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>NIM</Label>
                        <Input value={nim} onChange={(e) => setNim(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Program Studi</Label>
                        <Input value={program} onChange={(e) => setProgram(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Tahun Angkatan</Label>
                        <Input 
                          type="number" 
                          value={enrollmentYear} 
                          onChange={(e) => setEnrollmentYear(e.target.value)}
                          placeholder="Contoh: 2024"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Sistem Kuliah</Label>
                        <Select value={sistemKuliahId} onValueChange={setSistemKuliahId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih sistem kuliah..." />
                          </SelectTrigger>
                          <SelectContent>
                            {sistemKuliahOptions?.map((sk) => (
                              <SelectItem key={sk.id} value={sk.id}>{sk.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Gender</Label>
                        <Select value={gender} onValueChange={setGender}>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih gender..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pria">Pria</SelectItem>
                            <SelectItem value="wanita">Wanita</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button onClick={handleSaveProfile} className="w-full" disabled={saving}>
                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Simpan
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {profile?.nim && (
                        <div className="flex items-center gap-3 text-sm">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">NIM:</span>
                          <span className="font-mono font-medium">{profile.nim}</span>
                        </div>
                      )}
                      {profile?.program && (
                        <div className="flex items-center gap-3 text-sm">
                          <BookOpen className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Prodi:</span>
                          <span className="font-medium">{profile.program}</span>
                        </div>
                      )}
                      {profile?.enrollment_year && (
                        <div className="flex items-center gap-3 text-sm">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Angkatan:</span>
                          <span className="font-medium">{profile.enrollment_year}</span>
                        </div>
                      )}
                      {(profile as any)?.sistem_kuliah_id && sistemKuliahOptions && (
                        <div className="flex items-center gap-3 text-sm">
                          <GraduationCap className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Sistem Kuliah:</span>
                          <span className="font-medium">
                            {sistemKuliahOptions.find(sk => sk.id === (profile as any).sistem_kuliah_id)?.name || '-'}
                          </span>
                        </div>
                      )}
                      {profile?.gender && (
                        <div className="flex items-center gap-3 text-sm">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Gender:</span>
                          <span className="font-medium capitalize">{profile.gender}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-3 text-sm">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="truncate">{profile?.email}</span>
                      </div>
                    </div>
                  )}

                  {!editMode && (
                    <div className="mt-6 pt-6 border-t">
                      <p className="text-sm text-muted-foreground mb-2">Rata-rata Nilai</p>
                      <div className="flex items-center gap-3">
                        <Progress 
                          value={averageScore} 
                          className={cn(
                            "flex-1 h-3",
                            averageScore >= 60 ? "[&>div]:bg-success" : "[&>div]:bg-destructive"
                          )}
                        />
                        <span className={cn(
                          "font-bold text-xl",
                          averageScore >= 60 ? "text-success" : "text-destructive"
                        )}>
                          {averageScore.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Charts Card */}
              <Card className="lg:col-span-2 animate-slide-up" style={{ animationDelay: '100ms' }}>
                <CardHeader>
                  <CardTitle className="text-lg">Visualisasi Nilai</CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="bar" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-4">
                      <TabsTrigger value="bar" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Bar Chart</TabsTrigger>
                      <TabsTrigger value="radar" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Radar Chart</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="bar">
                      {chartData.length > 0 ? (
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                              <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                              <Tooltip 
                                content={({ active, payload }) => {
                                  if (active && payload && payload.length) {
                                    const data = payload[0].payload;
                                    return (
                                      <div className="bg-popover border rounded-lg p-3 shadow-lg">
                                        <p className="font-semibold">{data.fullName}</p>
                                        <p className="text-xs text-muted-foreground">{data.code}</p>
                                        <p className={cn("font-bold mt-1", data.isPassing ? "text-success" : "text-destructive")}>
                                          Nilai: {data.score}
                                        </p>
                                      </div>
                                    );
                                  }
                                  return null;
                                }}
                              />
                              <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                                {chartData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.isPassing ? 'hsl(var(--success))' : 'hsl(var(--destructive))'} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className="h-64 flex items-center justify-center text-muted-foreground">
                          Belum ada data nilai
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="radar">
                      {radarData.length > 0 ? (
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <RadarChart data={radarData}>
                              <PolarGrid className="stroke-muted" />
                              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12 }} />
                              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                              <Radar name="Nilai" dataKey="score" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} strokeWidth={2} />
                            </RadarChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className="h-64 flex items-center justify-center text-muted-foreground">
                          Belum ada data nilai
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>

            {/* Grades Table */}
            <Card className="animate-slide-up" style={{ animationDelay: '200ms' }}>
              <CardHeader>
                <CardTitle className="text-lg">Detail Nilai Per Mata Kuliah</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-primary hover:bg-primary">
                        <TableHead className="w-12 text-primary-foreground font-semibold">No</TableHead>
                        <TableHead className="text-primary-foreground font-semibold">
                          <TableFilterHeader
                            filterValue={gradeCodeFilter}
                            onFilterChange={setGradeCodeFilter}
                            placeholder="Filter kode..."
                          >
                            Kode
                          </TableFilterHeader>
                        </TableHead>
                        <TableHead className="text-primary-foreground font-semibold">
                          <TableFilterHeader
                            filterValue={gradeCourseFilter}
                            onFilterChange={setGradeCourseFilter}
                            placeholder="Filter mata kuliah..."
                          >
                            Mata Kuliah
                          </TableFilterHeader>
                        </TableHead>
                        <TableHead className="text-primary-foreground font-semibold text-center">Passing Score</TableHead>
                        <TableHead className="text-primary-foreground font-semibold text-center">Nilai Akhir</TableHead>
                        <TableHead className="text-primary-foreground font-semibold text-center">
                          <TableFilterHeader
                            filterValue={gradeStatusFilter}
                            onFilterChange={setGradeStatusFilter}
                            placeholder="lulus/belum..."
                          >
                            Status
                          </TableFilterHeader>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(() => {
                        let filteredGrades = grades || [];
                        
                        if (gradeCodeFilter) {
                          const query = gradeCodeFilter.toLowerCase();
                          filteredGrades = filteredGrades.filter(g => 
                            g.course?.code?.toLowerCase().includes(query)
                          );
                        }
                        
                        if (gradeCourseFilter) {
                          const query = gradeCourseFilter.toLowerCase();
                          filteredGrades = filteredGrades.filter(g => 
                            g.course?.name?.toLowerCase().includes(query)
                          );
                        }
                        
                        if (gradeStatusFilter) {
                          const query = gradeStatusFilter.toLowerCase();
                          filteredGrades = filteredGrades.filter(g => {
                            const isPassing = g.final_score >= (g.course?.passing_score || 60);
                            if (query.includes('lulus') && !query.includes('belum')) {
                              return isPassing;
                            } else if (query.includes('belum')) {
                              return !isPassing;
                            }
                            return true;
                          });
                        }
                        
                        if (filteredGrades.length === 0) {
                          return (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                {gradeCodeFilter || gradeCourseFilter || gradeStatusFilter 
                                  ? 'Tidak ada nilai yang sesuai dengan filter' 
                                  : (gradesLoading ? 'Memuat...' : 'Belum ada nilai')}
                              </TableCell>
                            </TableRow>
                          );
                        }
                        
                        return filteredGrades.map((grade, index) => (
                          <TableRow key={grade.id} className="hover:bg-muted/30">
                            <TableCell className="text-center">{index + 1}</TableCell>
                            <TableCell>
                              <TooltipProvider>
                                <UITooltip>
                                  <TooltipTrigger asChild>
                                    <Badge variant="secondary" className="font-mono cursor-help">{grade.course?.code}</Badge>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-sm">
                                    <p>{grade.course?.name}</p>
                                  </TooltipContent>
                                </UITooltip>
                              </TooltipProvider>
                            </TableCell>
                            <TableCell>
                              <Link to={`/mata-kuliah/${grade.course_id}`} className="font-medium hover:text-primary transition-colors">
                                {grade.course?.name}
                              </Link>
                            </TableCell>
                            <TableCell className="text-center">{grade.course?.passing_score || 60}</TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-2">
                                <Progress 
                                  value={grade.final_score} 
                                  className={cn("w-16 h-2", grade.final_score >= (grade.course?.passing_score || 60) ? "[&>div]:bg-success" : "[&>div]:bg-destructive")}
                                />
                                <span className={cn("font-bold", grade.final_score >= (grade.course?.passing_score || 60) ? "text-success" : "text-destructive")}>
                                  {grade.final_score}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              {grade.final_score >= (grade.course?.passing_score || 60) ? (
                                <Badge className="bg-success/10 text-success border-success/20">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />Lulus
                                </Badge>
                              ) : (
                                <Badge variant="destructive" className="bg-destructive/10 text-destructive border-destructive/20">
                                  <XCircle className="h-3 w-3 mr-1" />Belum Lulus
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ));
                      })()}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bimbingan">
            <BimbinganAkademikTab />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
