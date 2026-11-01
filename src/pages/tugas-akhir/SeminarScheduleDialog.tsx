import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Plus,
  Trash2,
  Copy,
  Check,
  Share2,
  Save,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  generateAssessmentToken,
  getAssessmentUrl,
  buildExaminerWhatsAppMessage,
  buildChairpersonWhatsAppMessage,
  determineGradeFromScore,
  useTaRubricsConfig,
} from '@/lib/taAssessmentTypes';

export interface FormExaminerItem {
  id?: string;
  role: string;
  examiner_type: 'internal' | 'external';
  dosen_id?: string | null;
  examiner_name: string;
  examiner_nip: string;
  examiner_institution: string;
  access_token: string;
  score?: number | null;
  scores_detail?: any;
  revision_notes?: string;
  signature_url?: string | null;
  signed_at?: string | null;
}

interface SeminarScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  seminar: any;
  dosenList: Array<{ id: string; full_name: string; nip?: string; email?: string }>;
  onSaved: () => void;
}

export const SeminarScheduleDialog: React.FC<SeminarScheduleDialogProps> = ({
  open,
  onOpenChange,
  seminar,
  dosenList,
  onSaved,
}) => {
  const queryClient = useQueryClient();
  const { getRubric } = useTaRubricsConfig();

  const [dialogTab, setDialogTab] = useState<'jadwal' | 'tautan' | 'rekap'>('jadwal');

  // Form Fields
  const [scheduleDate, setScheduleDate] = useState<string>('');
  const [room, setRoom] = useState<string>('');
  const [status, setStatus] = useState<string>('scheduled');

  // Query Master Dosen Tamu Terdaftar
  const { data: externalExaminersList } = useQuery({
    queryKey: ['ta_external_examiners_list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ta_external_examiners')
        .select('*')
        .order('name');
      if (error) return [];
      return data || [];
    },
  });

  // Chairperson state
  const [chairpersonType, setChairpersonType] = useState<'internal' | 'external'>('internal');
  const [chairpersonId, setChairpersonId] = useState<string>('');
  const [chairpersonName, setChairpersonName] = useState<string>('');
  const [chairpersonNip, setChairpersonNip] = useState<string>('');
  const [chairpersonInstitution, setChairpersonInstitution] = useState<string>('STITMA Yogyakarta');
  const [chairpersonToken, setChairpersonToken] = useState<string>('');
  const [chairpersonSignatureUrl, setChairpersonSignatureUrl] = useState<string | null>(null);

  // Dynamic Examiners state
  const [examiners, setExaminers] = useState<FormExaminerItem[]>([]);

  // Copied token state for feedback
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Initialize form when seminar changes
  useEffect(() => {
    if (!seminar) return;

    setScheduleDate(seminar.schedule_date ? seminar.schedule_date.substring(0, 16) : '');
    setRoom(seminar.room || '');
    setStatus(seminar.status === 'finished' ? 'completed' : seminar.status === 'rejected' ? 'cancelled' : seminar.status || 'scheduled');

    // Chairperson setup
    setChairpersonType(seminar.chairperson_type || (seminar.chairperson_id ? 'internal' : 'internal'));
    setChairpersonId(seminar.chairperson_id || '');
    setChairpersonName(seminar.chairperson_name || '');
    setChairpersonNip(seminar.chairperson_nip || '');
    setChairpersonInstitution(seminar.chairperson_institution || 'STITMA Yogyakarta');
    setChairpersonToken(seminar.chairperson_access_token || generateAssessmentToken('ch'));
    setChairpersonSignatureUrl(seminar.chairperson_signature_url || null);

    // Examiners setup
    if (seminar.ta_examiners && seminar.ta_examiners.length > 0) {
      setExaminers(
        seminar.ta_examiners.map((ex: any, idx: number) => ({
          id: ex.id,
          role: ex.role || `Penguji ${idx + 1}`,
          examiner_type: ex.examiner_type || (ex.dosen_id ? 'internal' : 'external'),
          dosen_id: ex.dosen_id || null,
          examiner_name: ex.examiner_name || ex.profiles?.full_name || '',
          examiner_nip: ex.examiner_nip || ex.profiles?.nip || '',
          examiner_institution: ex.examiner_institution || 'STITMA Yogyakarta',
          access_token: ex.access_token || generateAssessmentToken('ex'),
          score: ex.score,
          scores_detail: ex.scores_detail,
          revision_notes: ex.revision_notes,
          signature_url: ex.signature_url,
          signed_at: ex.signed_at,
        }))
      );
    } else {
      // Default 2 examiners
      setExaminers([
        {
          role: 'Penguji 1 (Ketua Penguji)',
          examiner_type: 'internal',
          dosen_id: '',
          examiner_name: '',
          examiner_nip: '',
          examiner_institution: 'STITMA Yogyakarta',
          access_token: generateAssessmentToken('ex'),
        },
        {
          role: 'Penguji 2 (Penguji Anggota)',
          examiner_type: 'internal',
          dosen_id: '',
          examiner_name: '',
          examiner_nip: '',
          examiner_institution: 'STITMA Yogyakarta',
          access_token: generateAssessmentToken('ex'),
        },
      ]);
    }
  }, [seminar]);

  // Handler: Tambah Penguji Baru
  const handleAddExaminer = () => {
    const nextNumber = examiners.length + 1;
    setExaminers((prev) => [
      ...prev,
      {
        role: `Penguji ${nextNumber}`,
        examiner_type: 'internal',
        dosen_id: '',
        examiner_name: '',
        examiner_nip: '',
        examiner_institution: 'STITMA Yogyakarta',
        access_token: generateAssessmentToken('ex'),
      },
    ]);
  };

  // Handler: Hapus Penguji
  const handleRemoveExaminer = (index: number) => {
    if (examiners.length <= 1) {
      toast.error('Minimal harus ada 1 penguji.');
      return;
    }
    setExaminers((prev) => {
      const next = [...prev];
      next.splice(index, 1);
      return next;
    });
  };

  // Handler: Update Field Penguji
  const handleUpdateExaminer = (index: number, updates: Partial<FormExaminerItem>) => {
    setExaminers((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...updates };
      // If internal dosen selected, auto-fill name & nip
      if (updates.dosen_id) {
        const found = dosenList.find((d) => d.id === updates.dosen_id);
        if (found) {
          next[index].examiner_name = found.full_name;
          next[index].examiner_nip = found.nip || '';
          next[index].examiner_institution = 'STITMA Yogyakarta';
        }
      }
      return next;
    });
  };

  // Handler: Update Chairperson Internal
  const handleSelectChairpersonInternal = (dosenId: string) => {
    setChairpersonId(dosenId);
    const found = dosenList.find((d) => d.id === dosenId);
    if (found) {
      setChairpersonName(found.full_name);
      setChairpersonNip(found.nip || '');
      setChairpersonInstitution('STITMA Yogyakarta');
    }
  };

  // Salin Tautan ke Clipboard
  const handleCopyLink = (url: string, tokenId: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiedToken(tokenId);
      toast.success('Tautan berhasil disalin ke clipboard!');
      setTimeout(() => setCopiedToken(null), 3000);
    } else {
      toast.error('Browser tidak mendukung salin otomatis');
    }
  };

  // Kirim WhatsApp
  const handleOpenWhatsApp = (message: string) => {
    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  // Hitung Nilai Rata-rata dari Penguji
  const validScores = examiners
    .map((e) => (typeof e.score === 'number' && !isNaN(e.score) ? e.score : null))
    .filter((s): s is number => s !== null);

  const averageScore = validScores.length > 0
    ? Math.round((validScores.reduce((a, b) => a + b, 0) / validScores.length) * 100) / 100
    : null;

  const currentRubric = seminar ? getRubric(seminar.type) : null;
  const gradeResult = averageScore !== null
    ? determineGradeFromScore(averageScore, currentRubric?.min_passing_score || 65)
    : null;

  // Mutation Save
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!seminar?.id) throw new Error('Data seminar tidak ditemukan.');

      // Validasi input
      if (chairpersonType === 'internal' && !chairpersonId) {
        throw new Error('Silakan pilih Ketua Sidang (Dosen Internal).');
      }
      if (chairpersonType === 'external' && !chairpersonName.trim()) {
        throw new Error('Nama Ketua Sidang eksternal wajib diisi.');
      }

      for (let i = 0; i < examiners.length; i++) {
        const ex = examiners[i];
        if (ex.examiner_type === 'internal' && !ex.dosen_id) {
          throw new Error(`Silakan pilih Dosen untuk ${ex.role}.`);
        }
        if (ex.examiner_type === 'external' && !ex.examiner_name.trim()) {
          throw new Error(`Nama Dosen Tamu untuk ${ex.role} wajib diisi.`);
        }
      }

      // Pastikan token ketua sidang ada
      const finalChairToken = chairpersonToken || generateAssessmentToken('ch');

      // 1. Update Seminar
      const { error: semError } = await supabase
        .from('ta_seminars')
        .update({
          schedule_date: scheduleDate ? new Date(scheduleDate).toISOString() : null,
          room: room.trim() || null,
          status,
          chairperson_type: chairpersonType,
          chairperson_id: chairpersonType === 'internal' ? chairpersonId : null,
          chairperson_name: chairpersonType === 'internal' ? (dosenList.find((d) => d.id === chairpersonId)?.full_name || chairpersonName) : chairpersonName.trim(),
          chairperson_nip: chairpersonType === 'internal' ? (dosenList.find((d) => d.id === chairpersonId)?.nip || chairpersonNip) : chairpersonNip.trim(),
          chairperson_institution: chairpersonType === 'internal' ? 'STITMA Yogyakarta' : (chairpersonInstitution.trim() || 'STITMA Yogyakarta'),
          chairperson_access_token: finalChairToken,
          chairperson_signature_url: chairpersonSignatureUrl || seminar.chairperson_signature_url || null,
          final_score: averageScore,
          final_grade: gradeResult?.grade || null,
        })
        .eq('id', seminar.id);

      if (semError) throw semError;

      // 2. Sync Examiners
      // Dapatkan id penguji lama yang masih dipertahankan
      const retainedIds = examiners.map((e) => e.id).filter(Boolean);

      // Hapus penguji yang dibuang dari UI
      if (retainedIds.length > 0) {
        await supabase
          .from('ta_examiners')
          .delete()
          .eq('seminar_id', seminar.id)
          .not('id', 'in', `(${retainedIds.join(',')})`);
      } else {
        await supabase.from('ta_examiners').delete().eq('seminar_id', seminar.id);
      }

      // Upsert / Insert tiap baris penguji
      for (let i = 0; i < examiners.length; i++) {
        const ex = examiners[i];
        const token = ex.access_token || generateAssessmentToken('ex');
        const resolvedName = ex.examiner_type === 'internal'
          ? (dosenList.find((d) => d.id === ex.dosen_id)?.full_name || ex.examiner_name)
          : ex.examiner_name.trim();
        const resolvedNip = ex.examiner_type === 'internal'
          ? (dosenList.find((d) => d.id === ex.dosen_id)?.nip || ex.examiner_nip)
          : ex.examiner_nip?.trim();
        const resolvedInst = ex.examiner_type === 'internal'
          ? 'STITMA Yogyakarta'
          : (ex.examiner_institution?.trim() || 'STITMA Yogyakarta');

        const examinerPayload: any = {
          seminar_id: seminar.id,
          role: ex.role.trim() || `Penguji ${i + 1}`,
          examiner_type: ex.examiner_type,
          dosen_id: ex.examiner_type === 'internal' ? ex.dosen_id : null,
          examiner_name: resolvedName,
          examiner_nip: resolvedNip,
          examiner_institution: resolvedInst,
          access_token: token,
          signature_url: ex.signature_url || null,
          order_index: i + 1,
        };

        if (ex.id) {
          // Update existing
          await supabase.from('ta_examiners').update(examinerPayload).eq('id', ex.id);
        } else {
          // Insert new
          await supabase.from('ta_examiners').insert(examinerPayload);
        }
      }

      // Simpan dosen tamu ke master ta_external_examiners jika ada input baru
      try {
        if (chairpersonType === 'external' && chairpersonName.trim()) {
          await supabase.from('ta_external_examiners').upsert({
            name: chairpersonName.trim(),
            nip: chairpersonNip.trim() || null,
            institution: chairpersonInstitution.trim() || 'Luar Kampus',
            signature_url: chairpersonSignatureUrl || null,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'name' });
        }

        for (const ex of examiners) {
          if (ex.examiner_type === 'external' && ex.examiner_name.trim()) {
            await supabase.from('ta_external_examiners').upsert({
              name: ex.examiner_name.trim(),
              nip: ex.examiner_nip.trim() || null,
              institution: ex.examiner_institution.trim() || 'Luar Kampus',
              signature_url: ex.signature_url || null,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'name' });
          }
        }
      } catch (upsertErr) {
        console.warn('Upsert ta_external_examiners notice:', upsertErr);
      }
    },
    onSuccess: () => {
      toast.success('Jadwal, Penguji & Tautan Evaluasi berhasil disimpan!');
      queryClient.invalidateQueries({ queryKey: ['admin_ta_seminars'] });
      queryClient.invalidateQueries({ queryKey: ['ta_external_examiners_list'] });
      onSaved();
      // Pindahkan tab ke 'tautan' agar admin langsung bisa membagikan link
      setDialogTab('tautan');
    },
    onError: (err: any) => {
      toast.error('Gagal menyimpan jadwal: ' + err.message);
    },
  });

  if (!seminar) return null;

  const studentName = seminar.ta_submissions?.profiles?.full_name || 'Mahasiswa';
  const studentNim = seminar.ta_submissions?.profiles?.nim || '-';
  const studentProdi = seminar.ta_submissions?.profiles?.program || 'Pendidikan Bahasa Arab';
  const taTitle = seminar.ta_submissions?.title || 'Judul Tugas Akhir';
  const seminarTypeLabel = seminar.type === 'sempro' ? 'Seminar Proposal' : 'Sidang Munaqasyah';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1.5rem)] sm:w-full max-w-4xl max-h-[92vh] flex flex-col p-4 sm:p-6 overflow-hidden">
        <DialogHeader className="border-b pb-3 text-left">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pr-6">
            <div>
              <DialogTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Penjadwalan & Dewan Penguji {seminarTypeLabel}
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm mt-0.5">
                Atur jadwal pelaksanaan, tunjuk Ketua Sidang & Penguji (Dosen Tetap / Tamu), serta kelola tautan penilaian tanpa login.
              </DialogDescription>
            </div>
            <Badge variant="outline" className="text-xs capitalize font-medium self-start sm:self-center">
              {seminar.type}
            </Badge>
          </div>
        </DialogHeader>

        {/* Ringkasan Mahasiswa */}
        <div className="bg-muted/40 p-3 rounded-lg border text-xs sm:text-sm space-y-1">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <span className="font-bold text-foreground">
              {studentName} ({studentNim})
            </span>
            <span className="text-muted-foreground">{studentProdi}</span>
          </div>
          <p className="text-muted-foreground text-xs line-clamp-2 italic">
            &ldquo;{taTitle}&rdquo;
          </p>
        </div>

        {/* Navigation Tabs */}
        <Tabs value={dialogTab} onValueChange={(val) => setDialogTab(val as any)} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid grid-cols-3 bg-muted/70">
            <TabsTrigger value="jadwal" className="text-xs gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              Jadwal & Komposisi
            </TabsTrigger>
            <TabsTrigger value="tautan" className="text-xs gap-1.5">
              <Share2 className="h-3.5 w-3.5" />
              Tautan Evaluasi ({examiners.length + 1})
            </TabsTrigger>
            <TabsTrigger value="rekap" className="text-xs gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              Rekap Nilai
              {averageScore !== null && (
                <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 h-4">
                  {averageScore}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto pr-1 sm:pr-2 pt-3">
            {/* TAB 1: JADWAL & KOMPOSISI */}
            <TabsContent value="jadwal" className="m-0 space-y-5">
              {/* Waktu, Tempat & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs font-semibold">Tanggal & Jam Ujian</Label>
                  <Input
                    type="datetime-local"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    className="mt-1 text-xs sm:text-sm h-9"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Ruangan / Tempat</Label>
                  <Input
                    type="text"
                    placeholder="Contoh: Ruang Sidang 1 / Google Meet"
                    value={room}
                    onChange={(e) => setRoom(e.target.value)}
                    className="mt-1 text-xs sm:text-sm h-9"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Status Pelaksanaan</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger className="mt-1 text-xs sm:text-sm h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Menunggu Penjadwalan</SelectItem>
                      <SelectItem value="scheduled">Terjadwal (Disetujui)</SelectItem>
                      <SelectItem value="completed">Selesai (Nilai Masuk)</SelectItem>
                      <SelectItem value="cancelled">Ditolak / Batal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* SEKSI: KETUA SIDANG */}
              <div className="p-4 rounded-xl border bg-card/60 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-primary" />
                      <h4 className="text-sm font-bold text-foreground">Ketua Sidang</h4>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Memimpin jalannya sidang, memantau skor penguji, dan mengesahkan Berita Acara (tanpa mengisi skor rubrik).
                    </p>
                  </div>

                  <div className="flex items-center bg-muted rounded-lg p-0.5 self-start">
                    <button
                      type="button"
                      onClick={() => setChairpersonType('internal')}
                      className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all ${chairpersonType === 'internal' ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground'}`}
                    >
                      Dosen Kampus
                    </button>
                    <button
                      type="button"
                      onClick={() => setChairpersonType('external')}
                      className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all ${chairpersonType === 'external' ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground'}`}
                    >
                      Dosen Tamu (Luar)
                    </button>
                  </div>
                </div>

                {chairpersonType === 'internal' ? (
                  <div>
                    <Label className="text-xs">Pilih Dosen Tetap STITMA sebagai Ketua Sidang</Label>
                    <Select value={chairpersonId} onValueChange={handleSelectChairpersonInternal}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Pilih Dosen..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-56">
                        {dosenList.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.full_name} {d.nip ? `(${d.nip})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {externalExaminersList && externalExaminersList.length > 0 && (
                      <div className="bg-muted/40 p-2.5 rounded-lg border space-y-1">
                        <Label className="text-[11px] font-semibold text-primary flex items-center justify-between">
                          <span>⚡ Pilih Cepat dari Dosen Tamu yang Pernah Diundang:</span>
                          {chairpersonSignatureUrl && (
                            <Badge variant="outline" className="text-[10px] text-emerald-700 bg-emerald-50 border-emerald-300 font-medium">
                              ✓ TTD Tersimpan Siap Pakai
                            </Badge>
                          )}
                        </Label>
                        <Select
                          onValueChange={(selectedId) => {
                            const found = externalExaminersList.find((x: any) => x.id === selectedId);
                            if (found) {
                              setChairpersonName(found.name);
                              setChairpersonNip(found.nip || '');
                              setChairpersonInstitution(found.institution || 'STITMA Yogyakarta');
                              if (found.signature_url) {
                                setChairpersonSignatureUrl(found.signature_url);
                              }
                            }
                          }}
                        >
                          <SelectTrigger className="h-8 text-xs bg-background">
                            <SelectValue placeholder="-- Pilih Dosen Tamu Tersimpan --" />
                          </SelectTrigger>
                          <SelectContent>
                            {externalExaminersList.map((ext: any) => (
                              <SelectItem key={ext.id} value={ext.id} className="text-xs">
                                {ext.name} ({ext.institution || 'Luar Kampus'}) {ext.signature_url ? '• ✓ TTD Siap' : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-1">
                        <Label className="text-xs">Nama Lengkap & Gelar</Label>
                        <Input
                          placeholder="Contoh: Dr. H. Ahmad Fauzi, M.Ag."
                          value={chairpersonName}
                          onChange={(e) => setChairpersonName(e.target.value)}
                          className="mt-1 text-xs"
                        />
                      </div>
                    <div>
                      <Label className="text-xs">NIP / NIDN (Opsional)</Label>
                      <Input
                        placeholder="Contoh: 19850101..."
                        value={chairpersonNip}
                        onChange={(e) => setChairpersonNip(e.target.value)}
                        className="mt-1 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Asal Instansi / Universitas</Label>
                      <Input
                        placeholder="Contoh: UIN Sunan Kalijaga"
                        value={chairpersonInstitution}
                        onChange={(e) => setChairpersonInstitution(e.target.value)}
                        className="mt-1 text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}
              </div>

              {/* SEKSI: DEWAN PENGUJI DINAMIS */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary" />
                      <h4 className="text-sm font-bold text-foreground">
                        Dewan Penguji ({examiners.length} Orang)
                      </h4>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Yang menilai rubrik tugas akhir secara individual. Jumlah penguji dapat ditambah atau dikurangi secara dinamis.
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddExaminer}
                    className="text-xs gap-1.5 self-start sm:self-auto"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Tambah Penguji
                  </Button>
                </div>

                <div className="space-y-3">
                  {examiners.map((ex, index) => (
                    <div
                      key={index}
                      className="p-3.5 rounded-xl border bg-card/60 hover:bg-card transition-all space-y-3 relative"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                            {index + 1}
                          </span>
                          <Input
                            value={ex.role}
                            onChange={(e) => handleUpdateExaminer(index, { role: e.target.value })}
                            className="h-7 text-xs font-bold w-44 bg-background"
                            placeholder="Peran Penguji"
                          />
                          {ex.score !== undefined && ex.score !== null && (
                            <Badge variant="secondary" className="text-xs font-semibold text-emerald-700 bg-emerald-50">
                              Skor: {ex.score}
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="flex items-center bg-muted rounded-md p-0.5">
                            <button
                              type="button"
                              onClick={() => handleUpdateExaminer(index, { examiner_type: 'internal' })}
                              className={`px-2 py-0.5 text-[11px] rounded font-medium transition-all ${ex.examiner_type === 'internal' ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground'}`}
                            >
                              Internal
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateExaminer(index, { examiner_type: 'external' })}
                              className={`px-2 py-0.5 text-[11px] rounded font-medium transition-all ${ex.examiner_type === 'external' ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground'}`}
                            >
                              Dosen Tamu
                            </button>
                          </div>

                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveExaminer(index)}
                            disabled={examiners.length <= 1}
                            className="h-7 w-7 text-destructive hover:bg-destructive/10"
                            title="Hapus Penguji"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>

                      {ex.examiner_type === 'internal' ? (
                        <div>
                          <Label className="text-xs">Pilih Dosen Penguji dari Sistem</Label>
                          <Select
                            value={ex.dosen_id || ''}
                            onValueChange={(val) => handleUpdateExaminer(index, { dosen_id: val })}
                          >
                            <SelectTrigger className="mt-1 text-xs">
                              <SelectValue placeholder="Pilih Dosen..." />
                            </SelectTrigger>
                            <SelectContent className="max-h-56">
                              {dosenList.map((d) => (
                                <SelectItem key={d.id} value={d.id}>
                                  {d.full_name} {d.nip ? `(${d.nip})` : ''}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ) : (
                        <div className="space-y-2 pt-1">
                          {externalExaminersList && externalExaminersList.length > 0 && (
                            <div className="bg-muted/40 p-2 rounded-lg border space-y-1">
                              <div className="flex items-center justify-between text-[11px] font-semibold text-primary">
                                <span>⚡ Pilih dari Dosen Tamu Terdaftar:</span>
                                {ex.signature_url && (
                                  <Badge variant="outline" className="text-[10px] text-emerald-700 bg-emerald-50 border-emerald-300 font-medium">
                                    ✓ TTD Tersimpan
                                  </Badge>
                                )}
                              </div>
                              <Select
                                onValueChange={(selectedId) => {
                                  const found = externalExaminersList.find((x: any) => x.id === selectedId);
                                  if (found) {
                                    handleUpdateExaminer(index, {
                                      examiner_name: found.name,
                                      examiner_nip: found.nip || '',
                                      examiner_institution: found.institution || 'STITMA Yogyakarta',
                                      signature_url: found.signature_url || null,
                                    });
                                  }
                                }}
                              >
                                <SelectTrigger className="h-7 text-xs bg-background">
                                  <SelectValue placeholder="-- Pilih Dosen Tamu Tersimpan --" />
                                </SelectTrigger>
                                <SelectContent>
                                  {externalExaminersList.map((ext: any) => (
                                    <SelectItem key={ext.id} value={ext.id} className="text-xs">
                                      {ext.name} ({ext.institution || 'Luar Kampus'}) {ext.signature_url ? '• ✓ TTD Siap' : ''}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <div>
                              <Label className="text-[11px]">Nama Dosen Tamu & Gelar</Label>
                              <Input
                                placeholder="Dr. Contoh Penguji, M.Pd."
                                value={ex.examiner_name}
                                onChange={(e) => handleUpdateExaminer(index, { examiner_name: e.target.value })}
                                className="mt-0.5 text-xs h-8"
                              />
                            </div>
                          <div>
                            <Label className="text-[11px]">NIP / NIDN (Opsional)</Label>
                            <Input
                              placeholder="198002..."
                              value={ex.examiner_nip}
                              onChange={(e) => handleUpdateExaminer(index, { examiner_nip: e.target.value })}
                              className="mt-0.5 text-xs h-8"
                            />
                          </div>
                          <div>
                            <Label className="text-[11px]">Instansi Asal</Label>
                            <Input
                              placeholder="Cth: UNY / UIN"
                              value={ex.examiner_institution}
                              onChange={(e) => handleUpdateExaminer(index, { examiner_institution: e.target.value })}
                              className="mt-0.5 text-xs h-8"
                            />
                          </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* TAB 2: TAUTAN EVALUASI & TOKEN */}
            <TabsContent value="tautan" className="m-0 space-y-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg flex items-start gap-2.5">
                <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                <div className="text-xs text-blue-800 dark:text-blue-300 space-y-1">
                  <p className="font-semibold">Mekanisme Penilaian & Tanda Tangan Mandiri (Tanpa Login)</p>
                  <p>
                    Setiap penguji dan ketua sidang memiliki tautan unik dengan token rahasia. Penerima dapat langsung membuka tautan melalui HP/Laptop, mengisi rubrik skor, menulis catatan revisi, dan membubuhkan tanda tangan (unggah berkas atau gores digital) tanpa harus registrasi atau login akun.
                  </p>
                </div>
              </div>

              {/* Tautan Ketua Sidang */}
              <div className="p-4 rounded-xl border bg-card/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <div>
                      <span className="text-xs font-bold text-foreground">
                        {chairpersonName || 'Ketua Sidang'}
                      </span>
                      <Badge variant="outline" className="ml-2 text-[10px]">
                        Ketua Sidang
                      </Badge>
                    </div>
                  </div>

                  {seminar.chairperson_signed_at ? (
                    <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-300 text-[10px]">
                      <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                      Disahkan & Ditandatangani
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">
                      Menunggu Pengesahan
                    </Badge>
                  )}
                </div>

                {(() => {
                  const url = getAssessmentUrl('ketua-sidang', chairpersonToken);
                  const waMsg = buildChairpersonWhatsAppMessage({
                    chairpersonName: chairpersonName || 'Bapak/Ibu Dosen',
                    studentName,
                    studentNim,
                    studentProdi,
                    taTitle,
                    seminarType: seminar.type,
                    scheduleDate,
                    room,
                    token: chairpersonToken,
                  });

                  return (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Input
                          readOnly
                          value={url}
                          className="text-xs font-mono bg-muted/50 h-8 flex-1"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs gap-1"
                          onClick={() => handleCopyLink(url, chairpersonToken)}
                        >
                          {copiedToken === chairpersonToken ? (
                            <>
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                              Tersalin
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5" />
                              Salin
                            </>
                          )}
                        </Button>
                        <Button
                          type="button"
                          variant="default"
                          size="sm"
                          className="h-8 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={() => handleOpenWhatsApp(waMsg)}
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                          Kirim WA
                        </Button>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Tautan Setiap Penguji */}
              <div className="space-y-3">
                <Label className="text-xs font-bold text-foreground block">
                  Tautan Evaluasi Dewan Penguji:
                </Label>

                {examiners.map((ex, index) => {
                  const url = getAssessmentUrl('penguji', ex.access_token);
                  const waMsg = buildExaminerWhatsAppMessage({
                    examinerName: ex.examiner_name || 'Bapak/Ibu Penguji',
                    examinerRole: ex.role,
                    studentName,
                    studentNim,
                    studentProdi,
                    taTitle,
                    seminarType: seminar.type,
                    scheduleDate,
                    room,
                    token: ex.access_token,
                  });

                  return (
                    <div
                      key={index}
                      className="p-3.5 rounded-xl border bg-card/80 space-y-2.5 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                            {index + 1}
                          </span>
                          <span className="text-xs font-bold text-foreground">
                            {ex.examiner_name || `(Belum memilih dosen ${ex.role})`}
                          </span>
                          <Badge variant="secondary" className="text-[10px]">
                            {ex.role}
                          </Badge>
                          {ex.examiner_institution && (
                            <span className="text-[11px] text-muted-foreground">
                              • {ex.examiner_institution}
                            </span>
                          )}
                        </div>

                        {ex.score !== undefined && ex.score !== null ? (
                          <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-300 text-[10px]">
                            <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                            Skor: {ex.score} (Sudah Dinilai)
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">
                            Menunggu Penilaian
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Input
                          readOnly
                          value={url}
                          className="text-xs font-mono bg-muted/50 h-8 flex-1"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs gap-1"
                          onClick={() => handleCopyLink(url, ex.access_token)}
                        >
                          {copiedToken === ex.access_token ? (
                            <>
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                              Tersalin
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5" />
                              Salin
                            </>
                          )}
                        </Button>
                        <Button
                          type="button"
                          variant="default"
                          size="sm"
                          className="h-8 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={() => handleOpenWhatsApp(waMsg)}
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                          Kirim WA
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            {/* TAB 3: REKAP NILAI & KEPUTUSAN */}
            <TabsContent value="rekap" className="m-0 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Card className="border">
                  <CardContent className="p-4 text-center space-y-1">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                      Nilai Rata-rata Akhir
                    </span>
                    <div className="text-3xl font-extrabold text-foreground">
                      {averageScore !== null ? averageScore : '-'}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Dari {validScores.length} dari {examiners.length} penguji
                    </p>
                  </CardContent>
                </Card>

                <Card className="border">
                  <CardContent className="p-4 text-center space-y-1">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                      Predikat Akademik
                    </span>
                    <div className="text-2xl font-bold text-primary">
                      {gradeResult ? gradeResult.grade : '-'}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {gradeResult ? gradeResult.arabicLabel : 'Menunggu kalkulasi'}
                    </p>
                  </CardContent>
                </Card>

                <Card className="border">
                  <CardContent className="p-4 text-center space-y-1">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                      Status Kelulusan
                    </span>
                    <div>
                      {gradeResult ? (
                        <Badge className={`text-xs px-2.5 py-0.5 ${gradeResult.badgeClass}`}>
                          {gradeResult.statusLabel}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Belum Ada Nilai Masuk</span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Passing grade: {currentRubric?.min_passing_score || 65}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Tabel Penilaian Detail */}
              <div className="rounded-lg border overflow-hidden">
                <div className="bg-muted/40 p-2.5 px-4 font-semibold text-xs border-b">
                  Rincian Penilaian Per Penguji
                </div>
                <div className="divide-y text-xs">
                  {examiners.map((ex, i) => (
                    <div key={i} className="p-3 flex items-center justify-between">
                      <div>
                        <span className="font-semibold">{ex.examiner_name || ex.role}</span>
                        <span className="text-muted-foreground ml-2">({ex.role})</span>
                        {ex.revision_notes && (
                          <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                            Catatan: {ex.revision_notes}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-sm">
                          {ex.score !== undefined && ex.score !== null ? ex.score : '-'}
                        </span>
                        {ex.signature_url ? (
                          <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-300">
                            TTD Terlampir
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">
                            Belum TTD
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter className="border-t pt-3 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto text-xs"
          >
            Tutup
          </Button>
          <Button
            type="button"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="w-full sm:w-auto text-xs gap-1.5 font-semibold"
          >
            <Save className="h-4 w-4" />
            {saveMutation.isPending ? 'Menyimpan...' : 'Simpan Jadwal & Buat Tautan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
export default SeminarScheduleDialog;
