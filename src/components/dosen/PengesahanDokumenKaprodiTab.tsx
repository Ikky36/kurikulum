import React, { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useDocumentSettings } from '@/lib/documentSettings';
import { parseApprovalsFromComments, useTaApprovalActions } from '@/lib/documentApprovals';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  FileCheck,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Printer,
  ShieldCheck,
  Undo2,
  AlertCircle,
  FileText,
  UserCheck,
  GraduationCap,
} from 'lucide-react';
import { KartuBimbinganViewerModal } from '@/components/document/KartuBimbinganViewerModal';
import { toast } from 'sonner';

export function PengesahanDokumenKaprodiTab() {
  const { user, profile } = useAuth();
  const { settings: docSettings } = useDocumentSettings();
  const { approveByKaprodi, revokeKaprodiApproval } = useTaApprovalActions();

  const [searchQuery, setSearchQuery] = useState('');
  const [docTypeFilter, setDocTypeFilter] = useState<'all' | 'bimbingan_ta' | 'krs'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'not_requested'>('pending');

  // Modal Cetak / Preview
  const [selectedSubForPreview, setSelectedSubForPreview] = useState<any>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Dedicated query untuk mengambil log bimbingan lengkap dengan profil dosen saat modal dibuka
  const { data: previewConsultationLogs } = useQuery({
    queryKey: ['kaprodi_preview_logs', selectedSubForPreview?.id],
    queryFn: async () => {
      if (!selectedSubForPreview?.id) return [];
      const { data, error } = await supabase
        .from('ta_consultation_logs')
        .select('*, profiles:dosen_id (id, full_name, nip, signature_url, paraf_url)')
        .eq('submission_id', selectedSubForPreview.id)
        .order('date', { ascending: true });
      if (error) {
        console.error('Error fetching preview logs:', error);
        return selectedSubForPreview.ta_consultation_logs || [];
      }
      return data || [];
    },
    enabled: Boolean(selectedSubForPreview?.id && isPreviewOpen),
  });

  // 1. Fetch seluruh pengajuan Tugas Akhir & Bimbingan
  const { data: rawSubmissions = [], isLoading: loadingTA } = useQuery({
    queryKey: ['kaprodi_ta_approvals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ta_submissions')
        .select(`
          id, title, type_id, status, comments, created_at, updated_at,
          ta_types (id, name),
          profiles:student_id (id, full_name, nim, program),
          ta_advisors (id, role, dosen_id, profiles (id, full_name, nip, signature_url, paraf_url)),
          ta_consultation_logs (id, date, problem, solution, status, dosen_id, profiles:dosen_id (id, full_name, nip, signature_url, paraf_url))
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  // 2. Fetch KRS untuk kelengkapan pengesahan dokumen prodi
  const { data: rawKrs = [], isLoading: loadingKrs } = useQuery({
    queryKey: ['kaprodi_krs_approvals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('krs')
        .select(`
          id, status, created_at, updated_at,
          profiles:student_id (id, full_name, nim, program),
          academic_years (id, year),
          semesters (id, name),
          krs_items (id, status, courses (id, name, code, sks))
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  // Proses data TA dengan status pengesahan
  const processedTAItems = useMemo(() => {
    return rawSubmissions.map((sub: any) => {
      const approvalState = parseApprovalsFromComments(sub.comments);
      const adv1 = sub.ta_advisors?.find((a: any) => a.role === 'Pembimbing 1' || a.role?.includes('1'));
      const adv2 = sub.ta_advisors?.find((a: any) => a.role === 'Pembimbing 2' || a.role?.includes('2'));

      const adv1Approval = approvalState.signers.advisor_1;
      const adv2Approval = approvalState.signers.advisor_2;
      const kaprodiApproval = approvalState.signers.kaprodi;

      const isKaprodiApproved = Boolean(kaprodiApproval?.is_approved);
      const isAdv1Approved = Boolean(adv1Approval?.is_approved);
      const isAdv2Approved = Boolean(adv2Approval?.is_approved);

      const totalLogs = sub.ta_consultation_logs?.length || 0;
      const approvedLogs = sub.ta_consultation_logs?.filter((l: any) => l.status === 'approved').length || 0;

      return {
        id: sub.id,
        itemType: 'bimbingan_ta' as const,
        docTitle: 'Kartu Bimbingan Tugas Akhir',
        subType: sub.ta_types?.name || 'Skripsi',
        student: sub.profiles,
        title: sub.title,
        advisor1: {
          profile: adv1?.profiles,
          isApproved: isAdv1Approved,
          approvedAt: adv1Approval?.approved_at,
        },
        advisor2: adv2 ? {
          profile: adv2?.profiles,
          isApproved: isAdv2Approved,
          approvedAt: adv2Approval?.approved_at,
        } : null,
        totalLogs,
        approvedLogs,
        isKaprodiApproved,
        kaprodiApprovedAt: kaprodiApproval?.approved_at,
        kaprodiSignerName: kaprodiApproval?.signer_name,
        requested: approvalState.requested,
        requestedAt: approvalState.requested_at || sub.created_at,
        rawSubmission: sub,
      };
    });
  }, [rawSubmissions]);

  // Statistik Counter
  const stats = useMemo(() => {
    // Permohonan masuk: HANYA yang telah resmi diajukan mahasiswa dan belum disahkan Kaprodi
    const pendingTA = processedTAItems.filter((item) => Boolean(item.requested && !item.isKaprodiApproved)).length;
    // Telah disahkan oleh Kaprodi
    const approvedTA = processedTAItems.filter((item) => Boolean(item.isKaprodiApproved)).length;
    // Belum mengajukan pengesahan
    const notRequestedTA = processedTAItems.filter((item) => Boolean(!item.requested && !item.isKaprodiApproved)).length;

    return {
      pendingTA,
      approvedTA,
      notRequestedTA,
      totalTA: processedTAItems.length,
    };
  }, [processedTAItems]);

  // Filter Data TA
  const filteredTAItems = useMemo(() => {
    // Prioritaskan dokumen yang telah diajukan mahasiswa dan belum disahkan agar berada di atas
    const sorted = [...processedTAItems].sort((a, b) => {
      if (a.requested && !a.isKaprodiApproved && (!b.requested || b.isKaprodiApproved)) return -1;
      if (b.requested && !b.isKaprodiApproved && (!a.requested || a.isKaprodiApproved)) return 1;
      return new Date(b.requestedAt || 0).getTime() - new Date(a.requestedAt || 0).getTime();
    });

    return sorted.filter((item) => {
      // Filter Status
      if (statusFilter === 'pending') {
        // HANYA yang telah diajukan mahasiswa dan belum disahkan
        if (!item.requested || item.isKaprodiApproved) return false;
      } else if (statusFilter === 'approved') {
        if (!item.isKaprodiApproved) return false;
      } else if (statusFilter === 'not_requested') {
        if (item.requested || item.isKaprodiApproved) return false;
      }

      // Filter Pencarian (Nama, NIM, Judul)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const mhsName = item.student?.full_name?.toLowerCase() || '';
        const mhsNim = item.student?.nim?.toLowerCase() || '';
        const title = item.title?.toLowerCase() || '';
        return mhsName.includes(q) || mhsNim.includes(q) || title.includes(q);
      }
      return true;
    });
  }, [processedTAItems, statusFilter, searchQuery]);

  // Handle Sahkan Dokumen TA
  const handleApproveTA = (item: any) => {
    const signerName = docSettings.kaprodi_name || profile?.full_name || 'Ketua Program Studi';
    const signerNidn = docSettings.kaprodi_nidn || profile?.nip || '';
    const signatureUrl = docSettings.kaprodi_signature_url || profile?.signature_url || null;

    if (!signatureUrl) {
      toast.warning('Tanda tangan digital Kaprodi belum diunggah di Pengaturan Dokumen atau Profil Anda. Tanda tangan tetap akan disahkan sebagai stempel digital administratif.');
    }

    if (window.confirm(`Sahkan Kartu Bimbingan Mahasiswa ${item.student?.full_name} (${item.student?.nim})? Dokumen akan resmi dibubuhi stempel tanda tangan Kaprodi.`)) {
      approveByKaprodi.mutate({
        submissionId: item.id,
        signer: {
          id: user?.id,
          name: signerName,
          nidn: signerNidn,
          signature_url: signatureUrl,
        },
      });
    }
  };

  // Handle Batalkan Pengesahan TA
  const handleRevokeTA = (item: any) => {
    if (window.confirm(`Batalkan pengesahan Kaprodi untuk mahasiswa ${item.student?.full_name}? Tanda tangan digital Kaprodi akan dicabut dari dokumen cetak.`)) {
      revokeKaprodiApproval.mutate(item.id);
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER DAN STATISTIK */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-amber-500 shadow-sm bg-card">
          <CardHeader className="py-3 px-4">
            <CardDescription className="text-xs flex items-center justify-between">
              <span>Permohonan Masuk (Menunggu)</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-amber-600">
              {stats.pendingTA}
            </CardTitle>
          </CardHeader>
          <CardContent className="py-0 px-4 pb-3 text-[11px] text-muted-foreground">
            Mahasiswa yang telah resmi mengajukan pengesahan
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500 shadow-sm bg-card">
          <CardHeader className="py-3 px-4">
            <CardDescription className="text-xs flex items-center justify-between">
              <span>Telah Disahkan Kaprodi</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-emerald-600">
              {stats.approvedTA}
            </CardTitle>
          </CardHeader>
          <CardContent className="py-0 px-4 pb-3 text-[11px] text-muted-foreground">
            Dokumen yang telah resmi Anda bubuhi tanda tangan
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-primary shadow-sm bg-card">
          <CardHeader className="py-3 px-4">
            <CardDescription className="text-xs flex items-center justify-between">
              <span>Total Mahasiswa Tugas Akhir</span>
              <GraduationCap className="w-4 h-4 text-primary" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold">
              {stats.totalTA}
            </CardTitle>
          </CardHeader>
          <CardContent className="py-0 px-4 pb-3 text-[11px] text-muted-foreground">
            {stats.notRequestedTA} mahasiswa belum mengajukan pengesahan
          </CardContent>
        </Card>
      </div>

      {/* FILTER DAN PENCARIAN */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-primary" />
                Daftar Permohonan Pengesahan Dokumen
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Kelola persetujuan resmi dan tanda tangan digital Ketua Program Studi untuk berbagai dokumen akademik.
              </CardDescription>
            </div>

            {/* Selector Jenis Dokumen */}
            <div className="flex items-center gap-2">
              <Select value={docTypeFilter} onValueChange={(v: any) => setDocTypeFilter(v)}>
                <SelectTrigger className="w-[180px] h-9 text-xs">
                  <SelectValue placeholder="Jenis Dokumen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Jenis Dokumen</SelectItem>
                  <SelectItem value="bimbingan_ta">Kartu Bimbingan TA</SelectItem>
                  <SelectItem value="krs">KRS Mahasiswa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-4 space-y-4">
          {/* Bar Filter Status & Input Cari */}
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <Tabs
              value={statusFilter}
              onValueChange={(v: any) => setStatusFilter(v)}
              className="w-full sm:w-auto"
            >
              <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full sm:w-auto h-auto">
                <TabsTrigger value="pending" className="text-xs py-1.5 font-medium data-[state=active]:font-bold">
                  Menunggu ({stats.pendingTA})
                </TabsTrigger>
                <TabsTrigger value="approved" className="text-xs py-1.5">
                  Telah Disahkan ({stats.approvedTA})
                </TabsTrigger>
                <TabsTrigger value="not_requested" className="text-xs py-1.5">
                  Belum Diajukan ({stats.notRequestedTA})
                </TabsTrigger>
                <TabsTrigger value="all" className="text-xs py-1.5">
                  Semua ({stats.totalTA})
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Cari mahasiswa, NIM, judul..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9 text-xs"
              />
            </div>
          </div>

          {/* TABEL DOKUMEN BIMBINGAN TUGAS AKHIR */}
          {(docTypeFilter === 'all' || docTypeFilter === 'bimbingan_ta') && (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="w-12 text-center">No</TableHead>
                    <TableHead>Mahasiswa</TableHead>
                    <TableHead>Topik & Jenis Dokumen</TableHead>
                    <TableHead className="text-center">Sesi Bimbingan</TableHead>
                    <TableHead>Status Pembimbing</TableHead>
                    <TableHead>Status Kaprodi</TableHead>
                    <TableHead className="text-right">Aksi Pengesahan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingTA ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Memuat data pengesahan dokumen...
                      </TableCell>
                    </TableRow>
                  ) : filteredTAItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Tidak ada dokumen bimbingan tugas akhir dengan filter ini.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTAItems.map((item, idx) => (
                      <TableRow key={item.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="text-center text-xs font-mono text-muted-foreground">
                          {idx + 1}
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold text-sm text-foreground">
                            {item.student?.full_name}
                          </div>
                          <div className="text-xs text-muted-foreground font-mono">
                            NIM: {item.student?.nim}
                          </div>
                          {item.student?.program && (
                            <span className="text-[10px] text-muted-foreground block">
                              {item.student?.program}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-[280px]">
                          <Badge variant="outline" className="mb-1 text-[10px] font-normal">
                            {item.docTitle} ({item.subType})
                          </Badge>
                          <p className="text-xs text-foreground font-medium line-clamp-2" title={item.title}>
                            {item.title}
                          </p>
                        </TableCell>
                        <TableCell className="text-center whitespace-nowrap">
                          <span className="font-bold text-xs text-foreground">
                            {item.approvedLogs}
                          </span>
                          <span className="text-[11px] text-muted-foreground"> / {item.totalLogs} Sesi</span>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs">
                          <div className="space-y-1">
                            {/* Pembimbing 1 */}
                            <div className="flex items-center gap-1.5">
                              {item.advisor1.isApproved ? (
                                <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] px-1.5 py-0 border-emerald-300">
                                  P1 Disahkan ✓
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-slate-500 text-[10px] px-1.5 py-0">
                                  P1 Belum
                                </Badge>
                              )}
                              <span className="text-[11px] text-muted-foreground truncate max-w-[120px]" title={item.advisor1.profile?.full_name}>
                                {item.advisor1.profile?.full_name?.split(',')[0] || 'Pembimbing 1'}
                              </span>
                            </div>

                            {/* Pembimbing 2 jika ada */}
                            {item.advisor2 && (
                              <div className="flex items-center gap-1.5">
                                {item.advisor2.isApproved ? (
                                  <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] px-1.5 py-0 border-emerald-300">
                                    P2 Disahkan ✓
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-slate-500 text-[10px] px-1.5 py-0">
                                    P2 Belum
                                  </Badge>
                                )}
                                <span className="text-[11px] text-muted-foreground truncate max-w-[120px]" title={item.advisor2.profile?.full_name}>
                                  {item.advisor2.profile?.full_name?.split(',')[0] || 'Pembimbing 2'}
                                </span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {item.isKaprodiApproved ? (
                            <div>
                              <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 text-[11px]">
                                <ShieldCheck className="w-3.5 h-3.5" /> Disahkan Kaprodi
                              </Badge>
                              {item.kaprodiApprovedAt && (
                                <span className="text-[10px] text-muted-foreground block mt-0.5">
                                  {new Date(item.kaprodiApprovedAt).toLocaleDateString('id-ID', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                  })}
                                </span>
                              )}
                            </div>
                          ) : item.requested ? (
                            <Badge variant="secondary" className="gap-1 text-[11px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border-amber-200">
                              <Clock className="w-3.5 h-3.5 text-amber-600" /> Menunggu Pengesahan
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] text-muted-foreground border-dashed">
                              Belum Diajukan Mhs
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Tombol Lihat / Cetak Dokumen */}
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-2.5 text-xs gap-1"
                              onClick={() => {
                                setSelectedSubForPreview(item.rawSubmission);
                                setIsPreviewOpen(true);
                              }}
                            >
                              <Printer className="w-3.5 h-3.5" /> Lihat
                            </Button>

                            {/* Tombol Sahkan / Batalkan */}
                            {item.isKaprodiApproved ? (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 px-2.5 text-xs text-muted-foreground hover:text-destructive gap-1"
                                disabled={revokeKaprodiApproval.isPending}
                                onClick={() => handleRevokeTA(item)}
                              >
                                <Undo2 className="w-3.5 h-3.5" /> Batalkan
                              </Button>
                            ) : (
                              <Button
                                variant="default"
                                size="sm"
                                className="h-8 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1 shadow-sm"
                                disabled={approveByKaprodi.isPending}
                                onClick={() => handleApproveTA(item)}
                              >
                                <ShieldCheck className="w-3.5 h-3.5" /> Sahkan
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* MODAL PREVIEW DOKUMEN OLEH KAPRODI */}
      {selectedSubForPreview && (
        <KartuBimbinganViewerModal
          open={isPreviewOpen}
          onOpenChange={(isOpen) => {
            setIsPreviewOpen(isOpen);
            if (!isOpen) {
              setSelectedSubForPreview(null);
            }
          }}
          submission={selectedSubForPreview}
          consultationLogs={previewConsultationLogs || selectedSubForPreview.ta_consultation_logs || []}
          studentProfile={selectedSubForPreview.profiles}
        />
      )}
    </div>
  );
}
