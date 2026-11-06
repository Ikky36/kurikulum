import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  GraduationCap,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Save,
  Send,
  FileCheck,
  UserCheck,
  Award,
  Sparkles,
  ExternalLink,
  Printer,
} from 'lucide-react';
import { toast } from 'sonner';
import { SeminarDocumentViewerModal } from '@/components/document/SeminarDocumentViewerModal';
import {
  useTaRubricsConfig,
  calculateExaminerScore,
  determineGradeFromScore,
  TaExaminerScoreItem,
} from '@/lib/taAssessmentTypes';
import { DigitalSignatureBox } from '@/components/tugas-akhir/DigitalSignatureBox';
import { useAuth } from '@/contexts/AuthContext';

export const EvaluasiPengujiPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Local state for scores, notes, signature
  const [rawScores, setRawScores] = useState<Record<string, any>>({});
  const [revisionNotes, setRevisionNotes] = useState<string>('');
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [isSubmittedSuccess, setIsSubmittedSuccess] = useState(false);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);

  // Helper pengisian nilai kolom secara langsung (tanpa slider)
  const handleScoreChange = (critId: string, valStr: string) => {
    if (valStr === '') {
      setRawScores((prev) => ({ ...prev, [critId]: '' }));
      return;
    }
    let num = parseFloat(valStr);
    if (isNaN(num)) return;
    if (num > 100) num = 100;
    if (num < 0) num = 0;
    setRawScores((prev) => ({ ...prev, [critId]: num }));
  };

  const handleScoreBlur = (critId: string) => {
    setRawScores((prev) => {
      const curr = prev[critId];
      if (curr === '' || curr === undefined || curr === null || isNaN(Number(curr))) {
        return { ...prev, [critId]: 0 };
      }
      return prev;
    });
  };

  // 1. Fetch Examiner & Seminar Data by Token
  const { data: examinerData, isLoading, error, refetch } = useQuery({
    queryKey: ['ta-examiner-evaluation', token],
    queryFn: async () => {
      if (!token) throw new Error('Token akses tidak ditemukan pada URL.');

      // Fetch examiner
      const { data: examiner, error: exErr } = await supabase
        .from('ta_examiners')
        .select(`
          *,
          ta_seminars:seminar_id(
            *,
            ta_submissions(
              id,
              title,
              profiles:student_id(full_name, nim, program)
            ),
            ta_examiners(*, profiles:dosen_id(full_name, nip))
          )
        `)
        .eq('access_token', token)
        .single();

      if (exErr || !examiner) {
        throw new Error('Tautan evaluasi tidak valid atau telah kedaluwarsa.');
      }

      return examiner;
    },
    enabled: !!token,
    staleTime: 1000 * 60,
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

  // 3. Fetch Rubric
  const { getRubric } = useTaRubricsConfig();
  const seminarType = examinerData?.ta_seminars?.type || 'sempro';
  const rubric = getRubric(seminarType);
  const criteria = rubric.criteria || [];

  // Initialize state when examiner data loads
  useEffect(() => {
    if (examinerData) {
      // Notes
      if (examinerData.revision_notes) {
        setRevisionNotes(examinerData.revision_notes);
      }
      // Signature
      if (examinerData.signature_url) {
        setSignatureUrl(examinerData.signature_url);
      } else if (userProfile?.signature_url && examinerData.dosen_id === user?.id) {
        setSignatureUrl(userProfile.signature_url);
      } else if (examinerData.examiner_type === 'external' && examinerData.examiner_name) {
        // Cek tanda tangan tersimpan di master ta_external_examiners
        supabase
          .from('ta_external_examiners')
          .select('signature_url')
          .eq('name', examinerData.examiner_name.trim())
          .maybeSingle()
          .then(({ data }) => {
            if (data?.signature_url) {
              setSignatureUrl(data.signature_url);
            }
          });
      }

      // Existing scores from scores_detail
      const scoresMap: Record<string, number> = {};
      if (Array.isArray(examinerData.scores_detail) && examinerData.scores_detail.length > 0) {
        examinerData.scores_detail.forEach((item: any) => {
          scoresMap[item.criterion_id] = item.raw_score ?? 80;
        });
      } else {
        criteria.forEach((crit) => {
          scoresMap[crit.id] = 80; // default initial score
        });
      }
      setRawScores(scoresMap);
    }
  }, [examinerData, userProfile]);

  // Calculate live scores
  const scoreResult = calculateExaminerScore(criteria, rawScores);
  const gradeResult = determineGradeFromScore(scoreResult.finalScore, rubric.min_passing_score);

  // Submit Mutation
  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!examinerData?.id) throw new Error('Data penguji tidak valid.');

      if (!signatureUrl) {
        throw new Error('Silakan bubuhkan tanda tangan Anda terlebih dahulu.');
      }

      const signedAt = new Date().toISOString();

      // 1. Update Examiner
      const { error: exError } = await supabase
        .from('ta_examiners')
        .update({
          score: scoreResult.finalScore,
          scores_detail: scoreResult.details,
          revision_notes: revisionNotes.trim(),
          signature_url: signatureUrl,
          signed_at: signedAt,
        })
        .eq('id', examinerData.id);

      if (exError) throw exError;

      // 1b. Jika Penguji Tamu (Eksternal), simpan/perbarui TTD ke master ta_external_examiners
      if (examinerData.examiner_type === 'external' && examinerData.examiner_name) {
        await supabase
          .from('ta_external_examiners')
          .upsert({
            name: examinerData.examiner_name.trim(),
            nip: examinerData.examiner_nip?.trim() || null,
            institution: examinerData.examiner_institution?.trim() || 'Luar Kampus',
            signature_url: signatureUrl,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'name' });
      }

      // 2. Trigger calculation of seminar final score if all examiners have graded
      const seminarId = examinerData.seminar_id;
      const { data: allExaminers } = await supabase
        .from('ta_examiners')
        .select('score')
        .eq('seminar_id', seminarId);

      if (allExaminers && allExaminers.length > 0) {
        const scoredList = allExaminers.filter((e) => typeof e.score === 'number' && !isNaN(e.score));
        if (scoredList.length > 0) {
          const avg = Math.round((scoredList.reduce((acc, curr) => acc + (curr.score || 0), 0) / scoredList.length) * 100) / 100;
          const { grade } = determineGradeFromScore(avg, rubric.min_passing_score);
          await supabase
            .from('ta_seminars')
            .update({
              final_score: avg,
              final_grade: grade,
            })
            .eq('id', seminarId);
        }
      }
    },
    onSuccess: () => {
      toast.success('Nilai dan tanda tangan evaluasi berhasil dikirim!');
      setIsSubmittedSuccess(true);
      refetch();
    },
    onError: (err: any) => {
      toast.error('Gagal mengirim penilaian: ' + err.message);
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/20 flex flex-col items-center justify-center p-4">
        <div className="text-center space-y-3">
          <GraduationCap className="h-10 w-10 text-primary mx-auto animate-bounce" />
          <p className="text-sm text-muted-foreground font-medium">Memuat lembar penilaian ujian...</p>
        </div>
      </div>
    );
  }

  if (error || !examinerData) {
    return (
      <div className="min-h-screen bg-muted/20 flex flex-col items-center justify-center p-4">
        <Card className="max-w-md w-full border-destructive/20 shadow-lg">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-2" />
            <CardTitle className="text-lg">Tautan Evaluasi Tidak Valid</CardTitle>
            <CardDescription>
              Tautan token penilaian ini salah atau tidak ditemukan pada sistem. Pastikan Anda membuka tautan yang dikirimkan oleh Panitia Ujian Tugas Akhir.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const seminar = examinerData.ta_seminars;
  const submission = seminar?.ta_submissions;
  const student = submission?.profiles;
  const isLocked = seminar?.is_locked;
  const isAlreadySigned = !!examinerData.signed_at;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950/40 py-6 px-3 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header Lembaga */}
        <div className="bg-background rounded-2xl border shadow-xs p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
            <div>
              <div className="flex items-center gap-2">
                <GraduationCap className="h-6 w-6 text-primary" />
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
                  Portal Evaluasi Penguji Tugas Akhir
                </h1>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Sekolah Tinggi Ilmu Tarbiyah Madani (STITMA) Yogyakarta
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDocModalOpen(true)}
                className="text-xs h-8 gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                Lihat Format Dokumen
              </Button>
              <Badge variant="outline" className="text-xs px-3 py-1 font-semibold bg-primary/5 text-primary border-primary/30">
                {seminarType === 'sempro' ? 'Seminar Proposal' : 'Sidang Munaqasyah'}
              </Badge>
            </div>
          </div>

          {/* Banner Status Pengiriman */}
          {isAlreadySigned && (
            <div className="p-3.5 rounded-xl border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 flex items-start gap-2.5">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
              <div className="text-xs space-y-0.5">
                <p className="font-bold">Penilaian & Tanda Tangan Anda Telah Tercatat</p>
                <p>
                  Dikirimkan pada: {new Date(examinerData.signed_at).toLocaleString('id-ID')}. Anda masih dapat memperbarui nilai selama sidang belum dikunci oleh Ketua Sidang.
                </p>
                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsDocModalOpen(true)}
                    className="h-7 text-xs gap-1.5 bg-white text-emerald-800 border-emerald-300 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-200"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Cetak / Simpan PDF Lembar Nilai
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Profil Mahasiswa & Ujian */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sm:text-sm">
            <div className="p-3.5 rounded-xl border bg-muted/30 space-y-1.5">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                Data Mahasiswa
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
                  Identitas Penguji
                </span>
                <p className="font-bold text-base text-foreground">
                  {examinerData.examiner_name || examinerData.profiles?.full_name || 'Bapak/Ibu Penguji'}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="text-xs font-semibold">
                    {examinerData.role}
                  </Badge>
                  {examinerData.examiner_institution && (
                    <span className="text-xs text-muted-foreground">
                      • {examinerData.examiner_institution}
                    </span>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t text-xs text-muted-foreground space-y-1">
                {seminar?.schedule_date && (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-primary" />
                    <span>
                      {new Date(seminar.schedule_date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                )}
                {seminar?.room && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-primary" />
                    <span>Ruangan: {seminar.room}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Formulir Rubrik Penilaian */}
        <Card className="border shadow-xs">
          <CardHeader className="border-b bg-muted/20 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <Award className="h-5 w-5 text-primary" />
                  Formulir Penilaian Rubrik ({criteria.length} Kriteria)
                </CardTitle>
                <CardDescription className="text-xs">
                  Isi kolom skor penilaian (rentang 0 - 100) pada setiap butir kriteria di bawah ini. Nilai akhir dihitung otomatis.
                </CardDescription>
              </div>

              {/* Skor Akhir Mengambang */}
              <div className="flex items-center gap-3 p-2 px-3 rounded-xl border bg-background shadow-xs self-start sm:self-auto">
                <div className="text-right">
                  <span className="text-[10px] text-muted-foreground block font-semibold uppercase">Nilai Anda:</span>
                  <span className="text-xl font-black text-primary leading-none">
                    {scoreResult.finalScore}
                  </span>
                </div>
                <Badge className={`text-xs ${gradeResult.badgeClass}`}>
                  {gradeResult.grade}
                </Badge>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-6 space-y-6">
            {/* Indikator Rata-rata Subtotal Kategori jika rubrik terbagi A & B */}
            {scoreResult.avgA !== undefined && scoreResult.avgB !== undefined && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl border bg-muted/20">
                <div className="flex items-center justify-between p-2.5 rounded-lg border bg-background">
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase block">
                      A. Rata-rata Dokumen
                    </span>
                    <span className="text-lg font-black text-primary font-mono">
                      {scoreResult.avgA}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-xs">7 Kriteria</Badge>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-lg border bg-background">
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase block">
                      B. Rata-rata Ujian Lisan
                    </span>
                    <span className="text-lg font-black text-primary font-mono">
                      {scoreResult.avgB}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-xs">6 Kriteria</Badge>
                </div>
              </div>
            )}

            {/* Skala Penilaian Standar Kampus */}
            <div className="p-3 rounded-lg border bg-slate-50 dark:bg-slate-900/50 text-xs flex flex-wrap items-center justify-between gap-2">
              <span className="font-bold text-slate-700 dark:text-slate-300">Skala Kelulusan:</span>
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono">
                <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">A: 91-100</span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">A-: 81-90,99</span>
                <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-bold">B+: 71-80,99</span>
                <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-bold">B: 66-70,99</span>
                <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">C+: 61-65,99</span>
                <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 font-bold">D: 46-60,99</span>
                <span className="px-1.5 py-0.5 rounded bg-rose-200 text-rose-900 font-bold">E: 0-45,99</span>
              </div>
            </div>

            {/* Loop Kriteria per Kategori atau Flat */}
            {(() => {
              const categories = [
                { key: 'A', title: 'A. PENILAIAN DOKUMEN', list: criteria.filter((c) => c.category === 'A' || (!c.category && c.order_index <= 7)) },
                { key: 'B', title: 'B. PENILAIAN UJIAN LISAN', list: criteria.filter((c) => c.category === 'B' || (!c.category && c.order_index > 7)) },
              ];

              const isCategorized = categories[0].list.length > 0 && categories[1].list.length > 0;

              if (isCategorized) {
                return categories.map((cat) => (
                  <div key={cat.key} className="space-y-4 pt-2">
                    <div className="flex items-center justify-between border-b pb-2">
                      <h3 className="font-extrabold text-sm text-foreground uppercase tracking-wide">
                        {cat.title}
                      </h3>
                      <Badge variant="secondary" className="text-xs font-semibold">
                        {cat.key === 'A' ? `Rata-rata: ${scoreResult.avgA ?? '-'}` : `Rata-rata: ${scoreResult.avgB ?? '-'}`}
                      </Badge>
                    </div>

                    <div className="space-y-3">
                      {cat.list.map((crit, subIdx) => {
                        const val = rawScores[crit.id] ?? 80;
                        return (
                          <div
                            key={crit.id}
                            className="p-3.5 rounded-xl border bg-card/60 transition-all hover:border-primary/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                          >
                            <div className="space-y-0.5 flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                                  {subIdx + 1}
                                </span>
                                <h4 className="text-sm font-bold text-foreground leading-snug">{crit.name}</h4>
                              </div>
                              {crit.description && (
                                <p className="text-xs text-muted-foreground leading-relaxed pl-7">
                                  {crit.description}
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-2 pl-7 sm:pl-0 shrink-0">
                              <div className="relative flex items-center">
                                <Input
                                  type="number"
                                  min={0}
                                  max={100}
                                  step="any"
                                  placeholder="0 - 100"
                                  value={rawScores[crit.id] ?? ''}
                                  disabled={isLocked}
                                  onChange={(e) => handleScoreChange(crit.id, e.target.value)}
                                  onBlur={() => handleScoreBlur(crit.id)}
                                  className="w-24 text-center font-bold text-base h-10 font-mono pr-7 bg-background shadow-xs focus-visible:ring-primary"
                                />
                                <span className="absolute right-2 text-[10px] font-semibold text-muted-foreground pointer-events-none select-none">
                                  /100
                                </span>
                              </div>
                              {typeof rawScores[crit.id] === 'number' && !isNaN(Number(rawScores[crit.id])) && (
                                <Badge
                                  variant="outline"
                                  className="text-xs font-mono font-bold w-9 justify-center py-1"
                                >
                                  {determineGradeFromScore(Number(rawScores[crit.id]), 65).grade}
                                </Badge>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ));
              }

              // Fallback Flat List (Seminar Proposal dll.)
              return criteria.map((crit, index) => {
                const val = rawScores[crit.id] ?? 80;
                return (
                  <div
                    key={crit.id}
                    className="p-4 rounded-xl border bg-card/60 transition-all hover:border-primary/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                          {index + 1}
                        </span>
                        <h3 className="text-sm font-bold text-foreground leading-snug">{crit.name}</h3>
                        {crit.weight > 0 && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            Bobot: {crit.weight}%
                          </Badge>
                        )}
                      </div>
                      {crit.description && (
                        <p className="text-xs text-muted-foreground leading-relaxed pl-7 whitespace-pre-line">
                          {crit.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pl-7 sm:pl-0 shrink-0">
                      <div className="relative flex items-center">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          step="any"
                          placeholder="0 - 100"
                          value={rawScores[crit.id] ?? ''}
                          disabled={isLocked}
                          onChange={(e) => handleScoreChange(crit.id, e.target.value)}
                          onBlur={() => handleScoreBlur(crit.id)}
                          className="w-24 text-center font-bold text-base h-10 font-mono pr-7 bg-background shadow-xs focus-visible:ring-primary"
                        />
                        <span className="absolute right-2 text-[10px] font-semibold text-muted-foreground pointer-events-none select-none">
                          /100
                        </span>
                      </div>
                      {typeof rawScores[crit.id] === 'number' && !isNaN(Number(rawScores[crit.id])) && (
                        <Badge
                          variant="outline"
                          className="text-xs font-mono font-bold w-9 justify-center py-1"
                        >
                          {determineGradeFromScore(Number(rawScores[crit.id]), 65).grade}
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              });
            })()}

            {/* Rangkuman Nilai Akhir */}
            <div className="p-4 rounded-xl border bg-muted/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                  Total Nilai Akhir Evaluasi
                </span>
                <p className="text-xs text-muted-foreground">
                  Batas Kelulusan ({rubric.min_passing_score}). Status: <strong>{gradeResult.statusLabel}</strong> ({gradeResult.arabicLabel}).
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-3xl font-extrabold text-foreground">
                  {scoreResult.finalScore}
                </span>
                <Badge className={`text-xs px-3 py-1 font-bold ${gradeResult.badgeClass}`}>
                  Predikat {gradeResult.grade}
                </Badge>
              </div>
            </div>

            {/* Catatan Perbaikan & Masukan */}
            <div className="space-y-2 pt-2">
              <Label className="text-sm font-bold text-foreground block">
                Catatan Perbaikan & Masukan Penguji untuk Mahasiswa
              </Label>
              <Textarea
                rows={4}
                disabled={isLocked}
                placeholder="Tuliskan poin-poin revisi naskah yang harus diperbaiki oleh mahasiswa (misal: perbaikan rumusan masalah, penambahan teori di bab 2, perbaikan analisis data di bab 4)..."
                value={revisionNotes}
                onChange={(e) => setRevisionNotes(e.target.value)}
                className="text-xs sm:text-sm"
              />
              <p className="text-[11px] text-muted-foreground">
                Catatan ini akan otomatis muncul pada lembar Berita Acara dan halaman portal Tugas Akhir mahasiswa yang bersangkutan.
              </p>
            </div>

            {/* Tanda Tangan Penguji */}
            <div className="pt-2">
              <DigitalSignatureBox
                signatureUrl={signatureUrl}
                onSignatureChange={setSignatureUrl}
                title="Tanda Tangan Pengesahan Nilai"
                signerName={examinerData.examiner_name || examinerData.profiles?.full_name || 'Penguji'}
                defaultAccountSignature={userProfile?.signature_url}
                folderPrefix="evaluasi_penguji"
              />
            </div>

            {/* Tombol Simpan & Kirim */}
            <div className="pt-4 border-t flex flex-col sm:flex-row items-center justify-end gap-3">
              {isLocked ? (
                <Badge variant="destructive" className="text-xs py-2 px-3">
                  Sidang telah dikunci oleh Ketua Sidang. Nilai tidak dapat diubah lagi.
                </Badge>
              ) : (
                <Button
                  onClick={() => submitMutation.mutate()}
                  disabled={submitMutation.isPending || !signatureUrl}
                  className="w-full sm:w-auto gap-2 px-6 font-semibold"
                >
                  <Send className="h-4 w-4" />
                  {submitMutation.isPending ? 'Mengirim Nilai...' : isAlreadySigned ? 'Perbarui Nilai & Tanda Tangan' : 'Kirim Nilai & Tanda Tangan'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Modal Cetak Dokumen Lembar Nilai */}
        {seminar && (
          <SeminarDocumentViewerModal
            open={isDocModalOpen}
            onOpenChange={setIsDocModalOpen}
            seminar={{
              ...seminar,
              ta_examiners: (seminar.ta_examiners && seminar.ta_examiners.length > 0)
                ? seminar.ta_examiners.map((ex: any) =>
                    ex.id === examinerData.id
                      ? {
                          ...ex,
                          score: scoreResult.finalScore,
                          scores_detail: scoreResult.details,
                          revision_notes: revisionNotes,
                          signature_url: signatureUrl,
                          signed_at: examinerData.signed_at || new Date().toISOString(),
                        }
                      : ex
                  )
                : [
                    {
                      ...examinerData,
                      score: scoreResult.finalScore,
                      scores_detail: scoreResult.details,
                      revision_notes: revisionNotes,
                      signature_url: signatureUrl,
                      signed_at: examinerData.signed_at || new Date().toISOString(),
                    },
                  ],
            }}
            initialDocType="lembar_nilai"
          />
        )}
      </div>
    </div>
  );
};
export default EvaluasiPengujiPage;
