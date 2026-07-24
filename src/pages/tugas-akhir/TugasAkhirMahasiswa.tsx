import React, { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { FileText, Clock, CheckCircle2, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function TugasAkhirMahasiswa() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [selectedType, setSelectedType] = useState('');
  const [title, setTitle] = useState('');
  const [documentLink, setDocumentLink] = useState('');
  const [comments, setComments] = useState('');
  
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [generalErrors, setGeneralErrors] = useState<string[]>([]);

  const { data: myProfile } = useQuery({
    queryKey: ['my_profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', user?.id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  const { data: mySubmission, isLoading: subLoading } = useQuery({
    queryKey: ['my_ta_submission', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ta_submissions')
        .select('*, ta_types(name), ta_advisors(profiles(full_name))')
        .eq('student_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!user?.id
  });

  const { data: taTypes, isLoading: typesLoading } = useQuery({
    queryKey: ['ta_types_student'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ta_types').select('*').order('name');
      if (error) throw error;
      return data;
    }
  });
  
  const { data: taRequirements } = useQuery({
    queryKey: ['ta_requirements_student'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ta_requirements').select('*').in('phase', ['umum', 'pengajuan_judul']);
      if (error) throw error;
      return data;
    }
  });

  const { data: instrumenPenilaian } = useQuery({
    queryKey: ['instrumen_penilaian_student'],
    queryFn: async () => {
      const { data, error } = await supabase.from('instrumen_penilaian').select('*').order('rentang_max', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const { data: myGrades } = useQuery({
    queryKey: ['my_grades_student', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('grades').select('*, courses(id, name, sks)').eq('student_profile_id', user?.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  const validateRequirements = (phase: string, typeId: string | null) => {
    if (!taRequirements || !instrumenPenilaian || !myGrades || !myProfile) return [];

    // Filter requirements
    const reqsToEval = taRequirements.filter(req => {
      if (req.phase !== phase) return false;
      if (req.is_general) return true;
      if (typeId && req.type_id === typeId) return true;
      return false;
    });

    const errors: string[] = [];
    const mySemester = myProfile.semester || 1;

    // Calculate SKS (only if grade > 0, assume passed for simple logic)
    const totalSKS = myGrades.reduce((sum, g) => sum + (g.final_score > 50 ? (g.courses?.sks || 0) : 0), 0);

    // Hitung jumlah nilai per predikat
    const predicateCounts: Record<string, number> = {};
    myGrades.forEach(grade => {
      const instrumen = instrumenPenilaian.find(i => grade.final_score >= i.rentang_min && grade.final_score <= i.rentang_max);
      if (instrumen) predicateCounts[instrumen.id] = (predicateCounts[instrumen.id] || 0) + 1;
    });

    const passedCourseIds = myGrades.filter(g => g.final_score > 50).map(g => g.courses?.id);

    reqsToEval.forEach(req => {
      if (req.req_type === 'min_semester') {
        const min = req.req_value?.min || 1;
        if (mySemester < min) {
          if (req.is_required) errors.push(`${req.name}: Minimal semester ${min} (Anda semester ${mySemester}).`);
        }
      } else if (req.req_type === 'min_sks') {
        const min = req.req_value?.min || 1;
        if (totalSKS < min) {
          if (req.is_required) errors.push(`${req.name}: Minimal SKS lulus ${min} (SKS Anda ${totalSKS}).`);
        }
      } else if (req.req_type === 'predicate') {
        const predId = req.req_value?.predicate_id;
        const maxLimit = req.req_value?.max_count || 0;
        const count = predicateCounts[predId] || 0;
        if (count > maxLimit) {
          const predName = instrumenPenilaian.find(i => i.id === predId)?.predikat || 'Unknown';
          if (req.is_required) errors.push(`${req.name}: Maksimal ${maxLimit} nilai ${predName} (Anda memiliki ${count}).`);
        }
      } else if (req.req_type === 'course') {
        const courseIds = req.req_value?.course_ids || [];
        const hasPassedAll = courseIds.every((id: string) => passedCourseIds.includes(id));
        if (!hasPassedAll && req.is_required) {
          errors.push(`${req.name}: Anda belum lulus mata kuliah prasyarat.`);
        }
      }
    });

    return errors;
  };

  useEffect(() => {
    // Validate General Phase
    const genErrs = validateRequirements('umum', null);
    setGeneralErrors(genErrs);

    // Validate Specific Phase if Type is selected
    if (selectedType) {
      const specErrs = validateRequirements('pengajuan_judul', selectedType);
      setValidationErrors(specErrs);
    } else {
      setValidationErrors([]);
    }
  }, [selectedType, taRequirements, instrumenPenilaian, myGrades, myProfile]);

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not logged in');
      
      const { data, error } = await supabase.from('ta_submissions').insert({
        student_id: user.id,
        type_id: selectedType,
        title,
        document_link: documentLink,
        comments
      }).select().single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my_ta_submission', user?.id] });
      toast.success('Berhasil mengajukan Tugas Akhir');
    },
    onError: (error: any) => {
      toast.error('Gagal mengajukan: ' + error.message);
    }
  });

  if (subLoading || typesLoading) return <Layout><div className="container py-8 text-center">Memuat data...</div></Layout>;

  return (
    <Layout>
      <div className="container py-8 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Tugas Akhir</h1>
        
        {generalErrors.length > 0 && !mySubmission && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Tidak Memenuhi Syarat Akademik Umum</AlertTitle>
            <AlertDescription>
              <ul className="list-disc list-inside mt-2">
                {generalErrors.map((err, i) => <li key={i}>{err}</li>)}
              </ul>
              <p className="mt-2 text-sm opacity-90">Hubungi akademik jika Anda merasa ada kesalahan pada data nilai/semester Anda.</p>
            </AlertDescription>
          </Alert>
        )}

        {mySubmission ? (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-2xl">{mySubmission.title}</CardTitle>
                    <CardDescription className="text-base mt-1">Jenis: {mySubmission.ta_types?.name}</CardDescription>
                  </div>
                  <Badge className="text-sm px-3 py-1" variant={
                    mySubmission.status === 'approved' ? 'default' :
                    mySubmission.status === 'rejected' ? 'destructive' :
                    mySubmission.status === 'revision' ? 'secondary' : 'outline'
                  }>
                    {mySubmission.status === 'approved' && <CheckCircle2 className="w-4 h-4 mr-2 inline" />}
                    {mySubmission.status === 'rejected' && <XCircle className="w-4 h-4 mr-2 inline" />}
                    {mySubmission.status === 'revision' && <RefreshCw className="w-4 h-4 mr-2 inline" />}
                    {mySubmission.status === 'pending' && <Clock className="w-4 h-4 mr-2 inline" />}
                    {mySubmission.status === 'approved' ? 'Disetujui' :
                     mySubmission.status === 'rejected' ? 'Ditolak' :
                     mySubmission.status === 'revision' ? 'Revisi' : 'Menunggu Review'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {mySubmission.status === 'rejected' && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Pengajuan Ditolak</AlertTitle>
                    <AlertDescription>
                      Mohon maaf, pengajuan judul Anda ditolak. Silakan ajukan judul baru dengan menghubungi Kaprodi.
                    </AlertDescription>
                  </Alert>
                )}
                
                {mySubmission.ta_advisors?.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Dosen Pembimbing</h3>
                    <ul className="list-disc list-inside">
                      {mySubmission.ta_advisors.map((adv: any, i: number) => (
                        <li key={i}>{adv.profiles?.full_name}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                <div>
                  <h3 className="font-semibold mb-1">Dokumen Pengajuan</h3>
                  <a href={mySubmission.document_link} target="_blank" rel="noreferrer" className="text-primary hover:underline flex items-center">
                    <FileText className="w-4 h-4 mr-2" /> Buka Dokumen
                  </a>
                </div>
              </CardContent>
              {mySubmission.status === 'approved' && (
                <CardFooter>
                  <Button className="w-full sm:w-auto">Buka Log Bimbingan</Button>
                </CardFooter>
              )}
            </Card>
          </div>
        ) : (
          <Card className={generalErrors.length > 0 ? "opacity-50 pointer-events-none" : ""}>
            <CardHeader>
              <CardTitle>Pengajuan Judul Tugas Akhir</CardTitle>
              <CardDescription>Pilih jenis tugas akhir dan masukkan judul yang akan diajukan.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Jenis Tugas Akhir</Label>
                <Select value={selectedType} onValueChange={setSelectedType} disabled={generalErrors.length > 0}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Jenis..." />
                  </SelectTrigger>
                  <SelectContent>
                    {taTypes?.map((type: any) => (
                      <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {validationErrors.length > 0 && (
                <Alert variant="destructive" className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Tidak Memenuhi Syarat Pengajuan {taTypes?.find((t:any) => t.id === selectedType)?.name}</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc list-inside mt-2">
                      {validationErrors.map((err, i) => <li key={i}>{err}</li>)}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label>Topik / Judul</Label>
                <Textarea 
                  placeholder="Ketikkan judul tugas akhir Anda..." 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)}
                  className="min-h-[80px]"
                  disabled={validationErrors.length > 0 || generalErrors.length > 0}
                />
              </div>
              
              {/* Check if there are any document requirements for 'pengajuan_judul' */}
              {taRequirements?.filter(r => r.phase === 'pengajuan_judul' && (r.is_general || r.type_id === selectedType) && r.req_type === 'document').map(req => (
                <div className="space-y-2" key={req.id}>
                  <Label>{req.name} {req.is_required && <span className="text-destructive">*</span>}</Label>
                  <Input 
                    placeholder="Link Dokumen / Google Drive..." 
                    value={documentLink} 
                    onChange={(e) => setDocumentLink(e.target.value)}
                    disabled={validationErrors.length > 0 || generalErrors.length > 0}
                  />
                  <p className="text-xs text-muted-foreground">Pastikan link dapat diakses oleh publik atau Dosen/Admin.</p>
                </div>
              ))}

              {/* If no dynamic document requirements but we still want a general one, we just show standard: */}
              {taRequirements?.filter(r => r.phase === 'pengajuan_judul' && (r.is_general || r.type_id === selectedType) && r.req_type === 'document').length === 0 && (
                 <div className="space-y-2">
                   <Label>Link Dokumen Proposal (Google Drive, dll)</Label>
                   <Input 
                     placeholder="https://..." 
                     value={documentLink} 
                     onChange={(e) => setDocumentLink(e.target.value)}
                     disabled={validationErrors.length > 0 || generalErrors.length > 0}
                   />
                   <p className="text-xs text-muted-foreground">Pastikan link dapat diakses oleh publik atau Dosen/Admin.</p>
                 </div>
              )}

              <div className="space-y-2">
                <Label>Catatan Tambahan (Opsional)</Label>
                <Textarea 
                  placeholder="Pesan untuk Kaprodi..." 
                  value={comments} 
                  onChange={(e) => setComments(e.target.value)}
                  disabled={validationErrors.length > 0 || generalErrors.length > 0}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={() => submitMutation.mutate()} 
                disabled={!selectedType || !title || !documentLink || submitMutation.isPending || validationErrors.length > 0 || generalErrors.length > 0}
                className="w-full"
              >
                Kirim Pengajuan
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>
    </Layout>
  );
}
