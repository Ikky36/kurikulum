import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ApprovalSigner {
  role_key: string;       // e.g. 'advisor_1', 'advisor_2', 'kaprodi', 'dekan'
  role_label: string;     // e.g. 'Dosen Pembimbing 1', 'Ketua Program Studi'
  signer_id?: string;     // Profile UUID
  signer_name: string;    // Nama Lengkap Beserta Gelar
  signer_nidn?: string;   // NIP / NIDN
  signature_url?: string | null;
  paraf_url?: string | null;
  is_approved: boolean;
  approved_at?: string | null; // Timestamp ISO
  notes?: string;
}

export interface DocumentApprovalState {
  requested: boolean;
  requested_at?: string | null;
  signers: Record<string, ApprovalSigner>;
}

export const APPROVALS_MARKER_REGEX = /<!--\s*DOC_APPROVALS:\s*([\s\S]*?)\s*-->/;

/**
 * Membersihkan komentar dari marker internal pengesahan agar teks yang ditampilkan ke pengguna rapi.
 */
export function cleanCommentsForDisplay(comments: string | null | undefined): string {
  if (!comments) return '';
  return comments.replace(APPROVALS_MARKER_REGEX, '').trim();
}

/**
 * Membaca data status pengesahan dari field comments.
 */
export function parseApprovalsFromComments(comments: string | null | undefined): DocumentApprovalState {
  if (!comments) {
    return { requested: false, signers: {} };
  }
  const match = comments.match(APPROVALS_MARKER_REGEX);
  if (!match || !match[1]) {
    return { requested: false, signers: {} };
  }
  try {
    const parsed = JSON.parse(match[1]);
    return {
      requested: Boolean(parsed.requested),
      requested_at: parsed.requested_at || null,
      signers: parsed.signers || {},
    };
  } catch (e) {
    console.error('Failed to parse doc approvals from comments:', e);
    return { requested: false, signers: {} };
  }
}

/**
 * Menggabungkan teks komentar biasa dengan marker pengesahan terenkapsulasi.
 */
export function serializeApprovalsToComments(
  existingComments: string | null | undefined,
  approvals: DocumentApprovalState
): string {
  const clean = cleanCommentsForDisplay(existingComments);
  const payload = JSON.stringify(approvals);
  const block = `<!-- DOC_APPROVALS: ${payload} -->`;
  return clean ? `${clean}\n\n${block}` : block;
}

/**
 * Helper untuk memperbarui status pengesahan di ta_submissions.
 */
export async function mutateSubmissionApprovals(
  submissionId: string,
  updater: (current: DocumentApprovalState) => DocumentApprovalState
): Promise<DocumentApprovalState> {
  // 1. Ambil data comments saat ini
  const { data: sub, error: fetchErr } = await supabase
    .from('ta_submissions')
    .select('comments')
    .eq('id', submissionId)
    .single();

  if (fetchErr) throw fetchErr;

  const currentApproval = parseApprovalsFromComments(sub?.comments);
  const updatedApproval = updater(currentApproval);
  const newComments = serializeApprovalsToComments(sub?.comments, updatedApproval);

  // 2. Simpan kembali ke Supabase
  const { error: updateErr } = await supabase
    .from('ta_submissions')
    .update({
      comments: newComments,
      updated_at: new Date().toISOString(),
    })
    .eq('id', submissionId);

  if (updateErr) throw updateErr;

  return updatedApproval;
}

/**
 * Hook untuk aksi pengesahan dokumen tugas akhir (Pembimbing & Kaprodi & Mahasiswa).
 */
export function useTaApprovalActions() {
  const queryClient = useQueryClient();

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['dosen_ta_students'] });
    queryClient.invalidateQueries({ queryKey: ['my_ta_submission'] });
    queryClient.invalidateQueries({ queryKey: ['my_ta_submissions'] });
    queryClient.invalidateQueries({ queryKey: ['ta_submission'] });
    queryClient.invalidateQueries({ queryKey: ['ta_submissions'] });
    queryClient.invalidateQueries({ queryKey: ['kaprodi_ta_approvals'] });
  };

  // 1. Mahasiswa mengajukan pengesahan
  const requestApproval = useMutation({
    mutationFn: async (submissionId: string) => {
      return mutateSubmissionApprovals(submissionId, (current) => ({
        ...current,
        requested: true,
        requested_at: new Date().toISOString(),
      }));
    },
    onSuccess: () => {
      toast.success('Permohonan pengesahan kartu bimbingan berhasil diajukan');
      invalidateAll();
    },
    onError: (err: any) => {
      toast.error('Gagal mengajukan pengesahan: ' + err.message);
    },
  });

  // 2. Pembimbing memberikan pengesahan
  const approveByAdvisor = useMutation({
    mutationFn: async ({
      submissionId,
      roleKey, // 'advisor_1' | 'advisor_2'
      roleLabel,
      signer,
    }: {
      submissionId: string;
      roleKey: 'advisor_1' | 'advisor_2';
      roleLabel?: string;
      signer: {
        id?: string;
        name: string;
        nidn?: string;
        signature_url?: string | null;
        paraf_url?: string | null;
      };
    }) => {
      return mutateSubmissionApprovals(submissionId, (current) => ({
        ...current,
        signers: {
          ...current.signers,
          [roleKey]: {
            role_key: roleKey,
            role_label: roleLabel || (roleKey === 'advisor_2' ? 'Dosen Pembimbing 2' : 'Dosen Pembimbing 1'),
            signer_id: signer.id,
            signer_name: signer.name,
            signer_nidn: signer.nidn,
            signature_url: signer.signature_url,
            paraf_url: signer.paraf_url,
            is_approved: true,
            approved_at: new Date().toISOString(),
          },
        },
      }));
    },
    onSuccess: () => {
      toast.success('Kartu bimbingan berhasil disahkan oleh Pembimbing');
      invalidateAll();
    },
    onError: (err: any) => {
      toast.error('Gagal mengesahkan: ' + err.message);
    },
  });

  // 3. Batalkan pengesahan Pembimbing
  const revokeAdvisorApproval = useMutation({
    mutationFn: async ({
      submissionId,
      roleKey,
    }: {
      submissionId: string;
      roleKey: 'advisor_1' | 'advisor_2';
    }) => {
      return mutateSubmissionApprovals(submissionId, (current) => {
        const nextSigners = { ...current.signers };
        if (nextSigners[roleKey]) {
          nextSigners[roleKey] = {
            ...nextSigners[roleKey],
            is_approved: false,
            approved_at: null,
          };
        }
        return {
          ...current,
          signers: nextSigners,
        };
      });
    },
    onSuccess: () => {
      toast.info('Pengesahan Pembimbing telah dibatalkan');
      invalidateAll();
    },
    onError: (err: any) => {
      toast.error('Gagal membatalkan pengesahan: ' + err.message);
    },
  });

  // 4. Kaprodi memberikan pengesahan dokumen
  const approveByKaprodi = useMutation({
    mutationFn: async ({
      submissionId,
      signer,
    }: {
      submissionId: string;
      signer: {
        id?: string;
        name: string;
        nidn?: string;
        signature_url?: string | null;
      };
    }) => {
      return mutateSubmissionApprovals(submissionId, (current) => ({
        ...current,
        signers: {
          ...current.signers,
          kaprodi: {
            role_key: 'kaprodi',
            role_label: 'Ketua Program Studi',
            signer_id: signer.id,
            signer_name: signer.name,
            signer_nidn: signer.nidn,
            signature_url: signer.signature_url,
            is_approved: true,
            approved_at: new Date().toISOString(),
          },
        },
      }));
    },
    onSuccess: () => {
      toast.success('Dokumen berhasil disahkan oleh Ketua Program Studi');
      invalidateAll();
    },
    onError: (err: any) => {
      toast.error('Gagal mengesahkan dokumen: ' + err.message);
    },
  });

  // 5. Kaprodi membatalkan pengesahan
  const revokeKaprodiApproval = useMutation({
    mutationFn: async (submissionId: string) => {
      return mutateSubmissionApprovals(submissionId, (current) => {
        const nextSigners = { ...current.signers };
        if (nextSigners.kaprodi) {
          nextSigners.kaprodi = {
            ...nextSigners.kaprodi,
            is_approved: false,
            approved_at: null,
          };
        }
        return {
          ...current,
          signers: nextSigners,
        };
      });
    },
    onSuccess: () => {
      toast.info('Pengesahan Ketua Program Studi telah dibatalkan');
      invalidateAll();
    },
    onError: (err: any) => {
      toast.error('Gagal membatalkan pengesahan: ' + err.message);
    },
  });

  return {
    requestApproval,
    approveByAdvisor,
    revokeAdvisorApproval,
    approveByKaprodi,
    revokeKaprodiApproval,
  };
}
