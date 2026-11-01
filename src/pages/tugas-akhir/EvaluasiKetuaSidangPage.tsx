import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ShieldCheck,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Users,
  Award,
  Sparkles,
  Lock,
  Unlock,
  FileCheck,
  Send,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useTaRubricsConfig,
  determineGradeFromScore,
} from '@/lib/taAssessmentTypes';
import { DigitalSignatureBox } from '@/components/tugas-akhir/DigitalSignatureBox';
import { useAuth } from '@/contexts/AuthContext';

export const EvaluasiKetuaSidangPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Local state for decision & signature
  const [resultStatus, setResultStatus] = useState<string>('lulus_revisi_ringan');
  const [revisionDeadline, setRevisionDeadline] = useState<string>('');
  const [officialNotes, setOfficialNotes] = useState<string>('');
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);

  // 1. Fetch Seminar & Examiners by Chairperson Token
  const { data: seminarData, isLoading, error, refetch } = useQuery({
    queryKey: ['ta-chairperson-evaluation', token],
    queryFn: async () => {
      if (!token) throw new Error('Token akses Ketua Sidang tidak ditemukan.');

      const { data: seminar, error: semErr } = await supabase
        .from('ta_seminars')
        .select(`
          *,
          ta_submissions(
            id,
            title,
            profiles:student_id(full_name, nim, program)
          ),
          ta_examiners(*, profiles:dosen_id(full_name, nip))
        `)
        .eq('chairperson_access_token', token)
        .single();

      if (semErr || !seminar) {
        throw new Error('Tautan pengesahan Ketua Sidang tidak valid atau kedaluwarsa.');
      }

      return seminar;
    },
    enabled: !!token,
    staleTime: 1000 * 30,
  });

  // 2. Fetch User Profile Signature if logged in
  const { data: userProfile } = useQuery({
    queryKey: ['my-profile-signature', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('profiles')
        .select('signature_url, full_name, nip')
        .eq('id', user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  // 3. Rubric & Calculation
  const { getRubric } = useTaRubricsConfig();
  const seminarType = seminarData?.type || 'sempro';
  const rubric = getRubric(seminarType);

  // Initialize fields
  useEffect(() => {
    if (seminarData) {
      if (seminarData.result_status) setResultStatus(seminarData.result_status);
      if (seminarData.revision_deadline) setRevisionDeadline(seminarData.revision_deadline);
      if (seminarData.official_notes) setOfficialNotes(seminarData.official_notes);
      if (seminarData.chairperson_signature_url) {
        setSignatureUrl(seminarData.chairperson_signature_url);
      } else if (userProfile?.signature_url && seminarData.chairperson_id === user?.id) {
        setSignatureUrl(userProfile.signature_url);
      } else if (seminarData.chairperson_type === 'external' && seminarData.chairperson_name) {
        // Cek tanda tangan tersimpan di master ta_external_examiners
        supabase
          .from('ta_external_examiners')
          .select('signature_url')
          .eq('name', seminarData.chairperson_name.trim())
          .maybeSingle()
          .then(({ data }) => {
            if (data?.signature_url) {
              setSignatureUrl(data.signature_url);
            }
          });
      }

      // Default deadline to 14 days from now if empty
      if (!seminarData.revision_deadline) {
        const d = new Date();
        d.setDate(d.getDate() + 14);
        setRevisionDeadline(d.toISOString().split('T')[0]);
      }
    }
  }, [seminarData, userProfile]);

  // Calculate live average from examiners
  const examiners = seminarData?.ta_examiners || [];
  const scoredExaminers = examiners.filter(
    (e: any) => typeof e.score === 'number' && !isNaN(e.score)
  );

  const averageScore = scoredExaminers.length > 0
    ? Math.round((scoredExaminers.reduce((acc: number, curr: any) => acc + curr.score, 0) / scoredExaminers.length) * 100) / 100
    : null;

  const gradeResult = averageScore !== null
    ? determineGradeFromScore(averageScore, rubric.min_passing_score)
    : null;

  const allExaminersSubmitted = examiners.length > 0 && scoredExaminers.length === examiners.length;

  // Submit Mutation
  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!seminarData?.id) throw new Error('Data sidang tidak valid.');
      if (!signatureUrl) throw new Error('Silakan bubuhkan tanda tangan Ketua Sidang.');

      const signedAt = new Date().toISOString();

      const { error: semError } = await supabase
        .from('ta_seminars')
        .update({
          final_score: averageScore,
          final_grade: gradeResult?.grade || null,
          result_status: resultStatus,
          revision_deadline: revisionDeadline || null,
          official_notes: officialNotes.trim() || null,
          chairperson_signature_url: signatureUrl,
          chairperson_signed_at: signedAt,
          status: 'finished',
          is_locked: true,
          locked_at: signedAt,
        })
        .eq('id', seminarData.id);

      if (semError) throw semError;

      // Simpan / perbarui ke master ta_external_examiners jika Ketua Sidang Tamu
      if (seminarData.chairperson_type === 'external' && seminarData.chairperson_name) {
        await supabase
          .from('ta_external_examiners')
          .upsert({
            name: seminarData.chairperson_name.trim(),
            nip: seminarData.chairperson_nip?.trim() || null,
            institution: seminarData.chairperson_institution?.trim() || 'Luar Kampus',
            signature_url: signatureUrl,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'name' });
      }
    },
    onSuccess: () => {
      toast.success('Berita Acara sidang berhasil disahkan dan ditandatangani!');
      refetch();
    },
    onError: (err: any) => {
      toast.error('Gagal mengesahkan sidang: ' + err.message);
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/20 flex flex-col items-center justify-center p-4">
        <div className="text-center space-y-3">
          <ShieldCheck className="h-10 w-10 text-primary mx-auto animate-bounce" />
          <p className="text-sm text-muted-foreground font-medium">Memuat portal Ketua Sidang...</p>
        </div>
      </div>
    );
  }

  if (error || !seminarData) {
    return (
      <div className="min-h-screen bg-muted/20 flex flex-col items-center justify-center p-4">
        <Card className="max-w-md w-full border-destructive/20 shadow-lg">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-2" />
            <CardTitle className="text-lg">Tautan Ketua Sidang Tidak Valid</CardTitle>
            <CardDescription>
              Tautan token pengesahan ini tidak ditemukan pada sistem atau telah direset.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const submission = seminarData.ta_submissions;
  const student = submission?.profiles;
  const isAlreadySigned = !!seminarData.chairperson_signed_at;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950/40 py-6 px-3 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header Lembaga */}
        <div className="bg-background rounded-2xl border shadow-xs p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-6 w-6 text-primary" />
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
                  Portal Pengesahan Ketua Sidang Tugas Akhir
                </h1>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Sekolah Tinggi Ilmu Tarbiyah Madani (STITMA) Yogyakarta
              </p>
            </div>

            <Badge variant="outline" className="text-xs px-3 py-1 font-semibold self-start sm:self-auto bg-primary/5 text-primary border-primary/30">
              {seminarType === 'sempro' ? 'Seminar Proposal' : 'Sidang Munaqasyah'}
            </Badge>
          </div>

          {/* Banner Status Pengesahan */}
          {isAlreadySigned && (
            <div className="p-3.5 rounded-xl border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 flex items-start gap-2.5">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
              <div className="text-xs space-y-0.5">
                <p className="font-bold">Berita Acara Sidang Telah Disahkan & Dikunci</p>
                <p>
                  Ditandatangani oleh Ketua Sidang pada {new Date(seminarData.chairperson_signed_at).toLocaleString('id-ID')}. Status kelulusan dan nilai telah resmi terbit.
                </p>
              </div>
            </div>
          )}

          {/* Info Mahasiswa & Sidang */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sm:text-sm">
            <div className="p-3.5 rounded-xl border bg-muted/30 space-y-1.5">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                Data Mahasiswa Diuji
              </span>
              <p className="font-bold text-base text-foreground">
                {student?.full_name || 'Mahasiswa'}
              </p>
              <p className="text-muted-foreground">
                NIM: <strong className="text-foreground">{student?.nim || '-'}</strong> • Prodi: {student?.program || 'PBA'}
              </p>
              <div className="pt-1.5 border-t mt-1.5">
                <span className="text-[11px] font-semibold text-muted-foreground block">Judul Tugas Akhir:</span>
                <p className="text-xs font-medium text-foreground italic mt-0.5 leading-relaxed">
                  &ldquo;{submission?.title || '-'}&rdquo;
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border bg-muted/30 flex flex-col justify-between space-y-3">
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                  Ketua Sidang
                </span>
                <p className="font-bold text-base text-foreground">
                  {seminarData.chairperson_name || 'Bapak/Ibu Ketua Sidang'}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="text-xs font-semibold">
                    Ketua Sidang
                  </Badge>
                  {seminarData.chairperson_institution && (
                    <span className="text-xs text-muted-foreground">
                      • {seminarData.chairperson_institution}
                    </span>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t text-xs text-muted-foreground space-y-1">
                {seminarData.schedule_date && (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-primary" />
                    <span>
                      {new Date(seminarData.schedule_date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                )}
                {seminarData.room && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-primary" />
                    <span>Ruangan: {seminarData.room}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Papan Skor Real-Time Dewan Penguji */}
        <Card className="border shadow-xs">
          <CardHeader className="border-b bg-muted/20 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Perolehan Nilai Dewan Penguji ({scoredExaminers.length} / {examiners.length} Sudah Menilai)
                </CardTitle>
                <CardDescription className="text-xs">
                  Sesuai ketentuan akademik, Ketua Sidang mengawasi dan mengesahkan akumulasi nilai dari para penguji.
                </CardDescription>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                className="text-xs h-8 self-start sm:self-auto"
              >
                Refresh Nilai Masuk
              </Button>
            </div>
          </CardHeader>

          <CardContent className="pt-5 space-y-5">
            {/* Kartu Ringkasan Nilai Akhir */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-4 rounded-xl border bg-card text-center space-y-1">
                <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                  Nilai Rata-rata Akhir
                </span>
                <div className="text-3xl font-extrabold text-foreground">
                  {averageScore !== null ? averageScore : '-'}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Skala 0 - 100
                </p>
              </div>

              <div className="p-4 rounded-xl border bg-card text-center space-y-1">
                <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                  Predikat Akademik
                </span>
                <div className="text-2xl font-bold text-primary">
                  {gradeResult ? gradeResult.grade : '-'}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {gradeResult ? gradeResult.arabicLabel : 'Menunggu skor penguji'}
                </p>
              </div>

              <div className="p-4 rounded-xl border bg-card text-center space-y-1">
                <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                  Status Standar Kelulusan
                </span>
                <div>
                  {gradeResult ? (
                    <Badge className={`text-xs px-2.5 py-0.5 ${gradeResult.badgeClass}`}>
                      {gradeResult.statusLabel}
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">Menunggu Dewan Penguji</span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Passing grade: {rubric.min_passing_score}
                </p>
              </div>
            </div>

            {/* List Skor Dewan Penguji */}
            <div className="space-y-3">
              <Label className="text-xs font-bold text-foreground block">
                Rincian Evaluasi & Catatan Revisi Per Penguji:
              </Label>

              <div className="space-y-3">
                {examiners.map((ex: any, i: number) => {
                  const hasScore = typeof ex.score === 'number' && !isNaN(ex.score);
                  return (
                    <div
                      key={ex.id || i}
                      className="p-3.5 rounded-xl border bg-card/60 space-y-2"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b pb-2">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                            {i + 1}
                          </span>
                          <span className="font-bold text-sm text-foreground">
                            {ex.examiner_name || ex.profiles?.full_name || ex.role}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {ex.role}
                          </Badge>
                          {ex.examiner_institution && (
                            <span className="text-xs text-muted-foreground">
                              ({ex.examiner_institution})
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 self-start sm:self-auto">
                          {hasScore ? (
                            <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-300 font-bold text-xs">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Skor: {ex.score}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                              Menunggu Penilaian
                            </Badge>
                          )}
                          {ex.signature_url ? (
                            <Badge variant="secondary" className="text-[10px]">
                              TTD Siap
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] text-muted-foreground">
                              Belum TTD
                            </Badge>
                          )}
                        </div>
                      </div>

                      {ex.revision_notes ? (
                        <div className="text-xs bg-muted/40 p-2.5 rounded-lg space-y-0.5">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase">
                            Catatan Perbaikan / Masukan Penguji:
                          </span>
                          <p className="text-foreground whitespace-pre-line leading-relaxed">
                            {ex.revision_notes}
                          </p>
                        </div>
                      ) : (
                        <p className="text-[11px] text-muted-foreground italic pl-7">
                          {hasScore ? 'Tidak ada catatan perbaikan tertulis.' : 'Penguji belum mengisi formulir penilaian.'}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pengesahan Berita Acara oleh Ketua Sidang */}
        <Card className="border shadow-xs">
          <CardHeader className="border-b bg-muted/20 pb-4">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-primary" />
              Keputusan Sidang & Pengesahan Berita Acara
            </CardTitle>
            <CardDescription className="text-xs">
              Tetapkan status kelulusan akhir, batas waktu perbaikan revisi naskah, dan bubuhkan tanda tangan pengesahan Ketua Sidang.
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-bold text-foreground">
                  Keputusan Hasil Ujian
                </Label>
                <Select value={resultStatus} onValueChange={setResultStatus}>
                  <SelectTrigger className="mt-1 text-xs sm:text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lulus_tanpa_revisi">
                      Lulus Murni (Tanpa Revisi)
                    </SelectItem>
                    <SelectItem value="lulus_revisi_ringan">
                      Lulus dengan Revisi Ringan (Minor)
                    </SelectItem>
                    <SelectItem value="lulus_revisi_berat">
                      Lulus dengan Revisi Substansial (Mayor)
                    </SelectItem>
                    <SelectItem value="mengulang">
                      Tidak Lulus / Mengulang Sidang
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-bold text-foreground">
                  Batas Waktu Pengumpulan Revisi Naskah
                </Label>
                <Input
                  type="date"
                  value={revisionDeadline}
                  onChange={(e) => setRevisionDeadline(e.target.value)}
                  className="mt-1 text-xs sm:text-sm"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-bold text-foreground">
                Catatan Resmi Persidangan / Catatan Kelulusan
              </Label>
              <Textarea
                rows={3}
                placeholder="Contoh: Mahasiswa dinyatakan lulus dengan revisi minor, naskah wajib diserahkan kepada penguji paling lambat 2 pekan setelah sidang..."
                value={officialNotes}
                onChange={(e) => setOfficialNotes(e.target.value)}
                className="mt-1 text-xs sm:text-sm"
              />
            </div>

            {/* Tanda Tangan Ketua Sidang */}
            <div className="pt-2">
              <DigitalSignatureBox
                signatureUrl={signatureUrl}
                onSignatureChange={setSignatureUrl}
                title="Tanda Tangan Pengesahan Berita Acara (Ketua Sidang)"
                signerName={seminarData.chairperson_name || 'Ketua Sidang'}
                defaultAccountSignature={userProfile?.signature_url}
                folderPrefix="evaluasi_ketua_sidang"
              />
            </div>

            <div className="pt-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                {!allExaminersSubmitted && (
                  <span className="text-amber-600 dark:text-amber-400 font-medium">
                    Perhatian: Masih ada dewan penguji yang belum mengisi nilai.
                  </span>
                )}
              </p>

              <Button
                onClick={() => submitMutation.mutate()}
                disabled={submitMutation.isPending || !signatureUrl}
                className="w-full sm:w-auto gap-2 px-6 font-semibold"
              >
                <ShieldCheck className="h-4 w-4" />
                {submitMutation.isPending ? 'Mengesahkan...' : isAlreadySigned ? 'Perbarui Pengesahan Berita Acara' : 'Sahkan & Kunci Berita Acara'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
export default EvaluasiKetuaSidangPage;
