import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Eye, AlertCircle } from 'lucide-react';
import { parseApprovalsFromComments, getDocApproval } from '@/lib/documentApprovals';
import { KartuBimbinganViewerModal } from '@/components/document/KartuBimbinganViewerModal';
import { CheckCircle2, XCircle } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SeminarRegistrationFormProps {
  phase: 'sempro' | 'sidang';
  submission: any;
  profile: any;
  requirements: any[];
  grades: any[];
  instrumenPenilaian: any[];
  semester: number;
}

export const SeminarRegistrationForm = ({
  phase,
  submission,
  profile,
  requirements,
  grades,
  instrumenPenilaian,
  semester
}: SeminarRegistrationFormProps) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [viewDocCode, setViewDocCode] = useState<string | null>(null);

  // Parse document approval states from submission
  const approvalState = parseApprovalsFromComments(submission?.comments);
  const semproApproval = getDocApproval(approvalState, 'surat_pengesahan_proposal');
  const isSemproApproved = Boolean(semproApproval.signers?.advisor_1?.is_approved);

  const taApproval = getDocApproval(approvalState, 'surat_pengesahan_tugas_akhir');
  const isTaApproved = Boolean(taApproval.signers?.advisor_1?.is_approved);

  const kbApproval = getDocApproval(approvalState, 'kartu_bimbingan_ta');
  const isKbApproved = Boolean(kbApproval.signers?.advisor_1?.is_approved || kbApproval.signers?.kaprodi?.is_approved);

  // Filter requirements specific to this phase and TA type
  const reqsToEval = requirements.filter(req => {
    if (req.phase !== phase) return false;
    if (req.is_general) return true;
    if (submission?.type_id && req.type_id === submission.type_id) return true;
    return false;
  });

  // Derived values for checks
  const totalSKS = grades.reduce((sum, g) => sum + (g.final_score > 50 ? (g.courses?.sks || 0) : 0), 0);
  const predicateCounts: Record<string, number> = {};
  grades.forEach(grade => {
    const instrumen = instrumenPenilaian.find(i => grade.final_score >= i.rentang_min && grade.final_score <= i.rentang_max);
    if (instrumen) predicateCounts[instrumen.id] = (predicateCounts[instrumen.id] || 0) + 1;
  });
  const passedCourseIds = grades.filter(g => g.final_score > 50).map(g => g.courses?.id);

  // Auto-fill resolver
  const getAutoFillValue = (field: string) => {
    switch (field) {
      case 'student_name': return profile?.full_name || '';
      case 'student_nim': return profile?.nim || '';
      case 'student_prodi': return profile?.program || '';
      case 'student_gender': return profile?.gender || '';
      case 'ta_title': return submission?.title || '';
      case 'ta_type': return submission?.ta_types?.name || '';
      case 'ta_advisors': 
        return submission?.ta_advisors?.map((a: any) => a.profiles?.full_name).join(', ') || 'Belum diplot';
      case 'ta_phase': return phase === 'sempro' ? 'Seminar Proposal' : 'Sidang Akhir';
      case 'doc_pengesahan_sempro':
        return isSemproApproved
          ? 'Telah Disahkan Resmi oleh Dosen Pembimbing'
          : semproApproval.requested
          ? 'Menunggu Pengesahan Dosen Pembimbing'
          : 'Belum Diajukan / Belum Disahkan';
      case 'doc_pengesahan_ta':
        return isTaApproved
          ? 'Telah Disahkan Resmi oleh Dosen Pembimbing'
          : taApproval.requested
          ? 'Menunggu Pengesahan Dosen Pembimbing'
          : 'Belum Diajukan / Belum Disahkan';
      case 'doc_kartu_bimbingan':
        return isKbApproved
          ? 'Telah Disahkan Resmi oleh Pembimbing & Kaprodi'
          : kbApproval.requested
          ? 'Menunggu Pengesahan Resmi'
          : 'Belum Diajukan / Belum Disahkan';
      default: return '';
    }
  };

  // Evaluate single requirement status
  const evaluateReq = (req: any) => {
    if (req.req_type === 'min_semester') return semester >= (req.req_value?.min || 1);
    if (req.req_type === 'min_sks') return totalSKS >= (req.req_value?.min || 1);
    if (req.req_type === 'predicate') {
      const maxLimit = req.req_value?.max_count || 0;
      const count = predicateCounts[req.req_value?.predicate_id] || 0;
      return count <= maxLimit;
    }
    if (req.req_type === 'course') {
      const courseIds = req.req_value?.course_ids || [];
      return courseIds.every((id: string) => passedCourseIds.includes(id));
    }
    if (req.req_type === 'auto_fill') {
      const field = req.req_value?.field;
      if (field === 'doc_pengesahan_sempro') return isSemproApproved;
      if (field === 'doc_pengesahan_ta') return isTaApproved;
      if (field === 'doc_kartu_bimbingan') return isKbApproved;
      return true; // Profil & info TA selalu valid
    }
    if (req.req_type === 'document') {
      return !!formData[req.id] && formData[req.id].trim().length > 0;
    }
    return false;
  };

  const isAllRequiredMet = reqsToEval.every(req => !req.is_required || evaluateReq(req));

  const submitRegistrationMutation = useMutation({
    mutationFn: async () => {
      // 1. Create Seminar Record
      const { data: seminar, error: semError } = await supabase.from('ta_seminars').insert({
        submission_id: submission.id,
        type: phase,
        status: 'pending'
      }).select().single();
      
      if (semError) throw semError;

      // Prepare requirement data to save
      const reqDataToSave: Record<string, any> = {};
      reqsToEval.forEach(req => {
        if (req.req_type === 'auto_fill') {
          reqDataToSave[req.name] = getAutoFillValue(req.req_value?.field);
        } else if (req.req_type === 'document') {
          reqDataToSave[req.name] = formData[req.id];
        } else {
          // Automatic checks save their status
          reqDataToSave[req.name] = evaluateReq(req) ? 'Memenuhi Syarat' : 'Tidak Memenuhi Syarat';
        }
      });

      // 2. Create Registration Record
      const { error: regError } = await supabase.from('ta_seminar_registrations').insert({
        seminar_id: seminar.id,
        student_id: profile.id,
        requirements_data: reqDataToSave
      });

      if (regError) throw regError;
    },
    onSuccess: () => {
      toast.success('Pendaftaran seminar berhasil diajukan!');
      queryClient.invalidateQueries({ queryKey: ['my_ta_seminars'] });
    },
    onError: (err) => toast.error('Gagal mendaftar: ' + err.message)
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Form Pendaftaran {phase === 'sempro' ? 'Seminar Proposal' : 'Sidang Akhir'}</CardTitle>
        <CardDescription>Lengkapi semua persyaratan di bawah ini untuk mengajukan jadwal.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {reqsToEval.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Belum ada persyaratan yang diatur oleh Admin.
          </div>
        ) : (
          reqsToEval.map(req => {
            const isMet = evaluateReq(req);
            const isDocField = ['doc_pengesahan_sempro', 'doc_pengesahan_ta', 'doc_kartu_bimbingan'].includes(req.req_value?.field);
            const autoCheck = ['min_semester', 'min_sks', 'predicate', 'course'].includes(req.req_type) || isDocField;
            
            return (
              <div key={req.id} className="p-4 rounded-lg border bg-card text-card-foreground shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Label className="text-base font-medium">
                      {req.name} {req.is_required && <span className="text-destructive">*</span>}
                    </Label>
                    {autoCheck && (
                      isMet 
                        ? <CheckCircle2 className="w-5 h-5 text-green-500" />
                        : <XCircle className="w-5 h-5 text-red-500" />
                    )}
                  </div>
                  {autoCheck && (
                    <span className="text-xs text-muted-foreground">Otomatis (Sistem)</span>
                  )}
                </div>

                {/* Render specific inputs */}
                {req.req_type === 'auto_fill' && (
                  <div className="space-y-2">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <Input 
                        value={getAutoFillValue(req.req_value?.field)} 
                        disabled 
                        className={`bg-muted font-medium flex-1 ${
                          isDocField
                            ? (isMet ? 'text-emerald-700 dark:text-emerald-300 font-semibold' : 'text-amber-700 dark:text-amber-300')
                            : ''
                        }`} 
                      />
                      {isDocField && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const docKey =
                              req.req_value?.field === 'doc_pengesahan_sempro'
                                ? 'surat_pengesahan_proposal'
                                : req.req_value?.field === 'doc_pengesahan_ta'
                                ? 'surat_pengesahan_tugas_akhir'
                                : 'kartu_bimbingan_ta';
                            setViewDocCode(docKey);
                          }}
                          className="shrink-0 h-10 gap-1.5"
                        >
                          <Eye className="w-4 h-4 text-primary" />
                          Pratinjau Dokumen
                        </Button>
                      )}
                    </div>
                    {isDocField && !isMet && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        Dokumen ini wajib disahkan terlebih dahulu oleh Dosen Pembimbing di tab Bimbingan Tugas Akhir sebelum pendaftaran dapat dikirimkan.
                      </p>
                    )}
                  </div>
                )}
                
                {req.req_type === 'document' && (
                  <Input 
                    placeholder="https://..." 
                    value={formData[req.id] || ''} 
                    onChange={(e) => setFormData({ ...formData, [req.id]: e.target.value })}
                  />
                )}

                {/* Subtext for auto checks */}
                {req.req_type === 'min_sks' && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Syarat: Minimal {req.req_value?.min} SKS (Tercapai: {totalSKS} SKS)
                  </p>
                )}
                {req.req_type === 'min_semester' && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Syarat: Minimal Semester {req.req_value?.min} (Saat ini: Semester {semester})
                  </p>
                )}
                {req.req_type === 'predicate' && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Syarat: Maksimal {req.req_value?.max_count} nilai {instrumenPenilaian.find((i:any) => i.id === req.req_value?.predicate_id)?.predikat}
                  </p>
                )}
              </div>
            );
          })
        )}
      </CardContent>
      <CardFooter>
        <Button 
          className="w-full" 
          disabled={!isAllRequiredMet || submitRegistrationMutation.isPending || reqsToEval.length === 0}
          onClick={() => submitRegistrationMutation.mutate()}
        >
          {submitRegistrationMutation.isPending ? 'Memproses...' : 'Kirim Pendaftaran'}
        </Button>
      </CardFooter>

      {/* Modal Pratinjau Dokumen Pengesahan / Kartu Bimbingan */}
      {viewDocCode && submission && (
        <KartuBimbinganViewerModal
          open={!!viewDocCode}
          onOpenChange={(open) => !open && setViewDocCode(null)}
          submission={submission}
          studentProfile={profile}
          templateCode={viewDocCode}
        />
      )}
    </Card>
  );
};
