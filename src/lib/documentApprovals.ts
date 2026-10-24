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

export interface SingleDocApproval {
  requested: boolean;
  requested_at?: string | null;
  signers: Record<string, ApprovalSigner>;
}

export interface DocumentApprovalState {
  // Legacy / root fields (dipertahankan untuk kompatibilitas kartu_bimbingan_ta)
  requested: boolean;
  requested_at?: string | null;
  signers: Record<string, ApprovalSigner>;
  // Pengesahan per dokumen spesifik: kartu_bimbingan_ta, surat_pengesahan_proposal, surat_pengesahan_laporan
  documents?: Record<string, SingleDocApproval>;
}

export const APPROVALS_MARKER_REGEX = /<!--\s*DOC_APPROVALS:\s*([\s\S]*?)\s*-->/;

/**
 * Normalisasi kode dokumen ke key kanonikal dokumen tugas akhir.
 */
export function normalizeDocKey(docCode?: string | null): string {
  if (!docCode) return 'kartu_bimbingan_ta';
  const lower = docCode.toLowerCase();
  if (lower.includes('proposal')) return 'surat_pengesahan_proposal';
  if (lower.includes('laporan')) return 'surat_pengesahan_laporan';
  if (lower.includes('kartu') || lower.includes('bimbingan')) return 'kartu_bimbingan_ta';
  return lower;
}

/**
 * Mengambil status pengesahan untuk dokumen tertentu dari DocumentApprovalState.
 * Jika dokumen belum memiliki entri spesifik:
 * - Untuk 'kartu_bimbingan_ta', membaca fallback ke root state (backward compatibility).
 * - Untuk dokumen lain (misal: 'surat_pengesahan_proposal'), menghasilkan state default kosong (belum diajukan / belum disahkan).
 */
export function getDocApproval(
  state: DocumentApprovalState | null | undefined,
  docCode?: string | null
): SingleDocApproval {
  const empty: SingleDocApproval = { requested: false, requested_at: null, signers: {} };
  if (!state) return empty;

  const key = normalizeDocKey(docCode);
  if (state.documents && state.documents[key]) {
    return state.documents[key];
  }

  // Fallback untuk kartu_bimbingan_ta: gunakan root state jika belum ada di state.documents
  if (key === 'kartu_bimbingan_ta') {
    return {
      requested: Boolean(state.requested),
      requested_at: state.requested_at || null,
      signers: state.signers || {},
    };
  }

  return empty;
}

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
    return { requested: false, signers: {}, documents: {} };
  }
  const match = comments.match(APPROVALS_MARKER_REGEX);
  if (!match || !match[1]) {
    return { requested: false, signers: {}, documents: {} };
  }
  try {
    const parsed = JSON.parse(match[1]);
    return {
      requested: Boolean(parsed.requested),
      requested_at: parsed.requested_at || null,
      signers: parsed.signers || {},
      documents: parsed.documents || {},
    };
  } catch (e) {
    console.error('Failed to parse doc approvals from comments:', e);
    return { requested: false, signers: {}, documents: {} };
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

export type RequestApprovalArgs =
  | string
  | {
      submissionId: string;
      docCode?: string;
      docTitle?: string;
    };

export type CancelRequestApprovalArgs =
  | string
  | {
      submissionId: string;
      docCode?: string;
    };

export interface ApproveAdvisorArgs {
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
  docCode?: string;
}

export interface RevokeAdvisorArgs {
  submissionId: string;
  roleKey: 'advisor_1' | 'advisor_2';
  docCode?: string;
}

export interface ApproveKaprodiArgs {
  submissionId: string;
  signer: {
    id?: string;
    name: string;
    nidn?: string;
    signature_url?: string | null;
  };
  docCode?: string;
}

export type RevokeKaprodiArgs =
  | string
  | {
      submissionId: string;
      docCode?: string;
    };

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
    mutationFn: async (args: RequestApprovalArgs) => {
      const submissionId = typeof args === 'string' ? args : args.submissionId;
      const docCode = typeof args === 'string' ? 'kartu_bimbingan_ta' : (args.docCode || 'kartu_bimbingan_ta');
      const key = normalizeDocKey(docCode);

      return mutateSubmissionApprovals(submissionId, (current) => {
        const currentDoc = getDocApproval(current, key);
        const updatedDoc: SingleDocApproval = {
          ...currentDoc,
          requested: true,
          requested_at: new Date().toISOString(),
        };
        const nextDocuments = {
          ...(current.documents || {}),
          [key]: updatedDoc,
        };
        return {
          ...current,
          requested: key === 'kartu_bimbingan_ta' ? true : current.requested,
          requested_at: key === 'kartu_bimbingan_ta' ? updatedDoc.requested_at : current.requested_at,
          documents: nextDocuments,
        };
      });
    },
    onSuccess: (_data, variables) => {
      const docCode = typeof variables === 'string' ? 'kartu_bimbingan_ta' : (variables.docCode || 'kartu_bimbingan_ta');
      const isProposal = docCode.includes('proposal');
      const isLaporan = docCode.includes('laporan');
      const label = isProposal ? 'surat pengesahan proposal' : isLaporan ? 'surat pengesahan laporan' : 'kartu bimbingan';
      toast.success(`Permohonan pengesahan ${label} berhasil diajukan`);
      invalidateAll();
    },
    onError: (err: any) => {
      toast.error('Gagal mengajukan pengesahan: ' + err.message);
    },
  });

  // 1b. Mahasiswa menarik/membatalkan permohonan pengesahan (jika belum disahkan)
  const cancelRequestApproval = useMutation({
    mutationFn: async (args: CancelRequestApprovalArgs) => {
      const submissionId = typeof args === 'string' ? args : args.submissionId;
      const docCode = typeof args === 'string' ? 'kartu_bimbingan_ta' : (args.docCode || 'kartu_bimbingan_ta');
      const key = normalizeDocKey(docCode);

      return mutateSubmissionApprovals(submissionId, (current) => {
        const currentDoc = getDocApproval(current, key);
        const anyApproved = Object.values(currentDoc.signers || {}).some((s) => s.is_approved);
        if (anyApproved) {
          throw new Error('Tidak dapat menarik permohonan karena dokumen telah disahkan');
        }
        const updatedDoc: SingleDocApproval = {
          ...currentDoc,
          requested: false,
          requested_at: null,
        };
        const nextDocuments = {
          ...(current.documents || {}),
          [key]: updatedDoc,
        };
        return {
          ...current,
          requested: key === 'kartu_bimbingan_ta' ? false : current.requested,
          requested_at: key === 'kartu_bimbingan_ta' ? null : current.requested_at,
          documents: nextDocuments,
        };
      });
    },
    onSuccess: (_data, variables) => {
      const docCode = typeof variables === 'string' ? 'kartu_bimbingan_ta' : (variables.docCode || 'kartu_bimbingan_ta');
      const isProposal = docCode.includes('proposal');
      const isLaporan = docCode.includes('laporan');
      const label = isProposal ? 'surat pengesahan proposal' : isLaporan ? 'surat pengesahan laporan' : 'kartu bimbingan';
      toast.info(`Permohonan pengesahan ${label} berhasil ditarik`);
      invalidateAll();
    },
    onError: (err: any) => {
      toast.error('Gagal menarik permohonan: ' + err.message);
    },
  });

  // 2. Pembimbing memberikan pengesahan
  const approveByAdvisor = useMutation({
    mutationFn: async ({
      submissionId,
      roleKey, // 'advisor_1' | 'advisor_2'
      roleLabel,
      signer,
      docCode = 'kartu_bimbingan_ta',
    }: ApproveAdvisorArgs) => {
      const key = normalizeDocKey(docCode);
      return mutateSubmissionApprovals(submissionId, (current) => {
        const currentDoc = getDocApproval(current, key);
        const updatedDoc: SingleDocApproval = {
          ...currentDoc,
          requested: true,
          signers: {
            ...currentDoc.signers,
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
        };
        const nextDocuments = {
          ...(current.documents || {}),
          [key]: updatedDoc,
        };
        return {
          ...current,
          ...(key === 'kartu_bimbingan_ta' ? {
            requested: true,
            signers: updatedDoc.signers,
          } : {}),
          documents: nextDocuments,
        };
      });
    },
    onSuccess: (_data, variables) => {
      const docCode = variables.docCode || 'kartu_bimbingan_ta';
      const isProposal = docCode.includes('proposal');
      const isLaporan = docCode.includes('laporan');
      const label = isProposal ? 'Surat pengesahan proposal' : isLaporan ? 'Surat pengesahan laporan' : 'Kartu bimbingan';
      toast.success(`${label} berhasil disahkan oleh Pembimbing`);
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
      docCode = 'kartu_bimbingan_ta',
    }: RevokeAdvisorArgs) => {
      const key = normalizeDocKey(docCode);
      return mutateSubmissionApprovals(submissionId, (current) => {
        const currentDoc = getDocApproval(current, key);
        const nextSigners = { ...currentDoc.signers };
        if (nextSigners[roleKey]) {
          nextSigners[roleKey] = {
            ...nextSigners[roleKey],
            is_approved: false,
            approved_at: null,
          };
        }
        const updatedDoc: SingleDocApproval = {
          ...currentDoc,
          signers: nextSigners,
        };
        const nextDocuments = {
          ...(current.documents || {}),
          [key]: updatedDoc,
        };
        return {
          ...current,
          ...(key === 'kartu_bimbingan_ta' ? { signers: nextSigners } : {}),
          documents: nextDocuments,
        };
      });
    },
    onSuccess: (_data, variables) => {
      const docCode = variables.docCode || 'kartu_bimbingan_ta';
      const isProposal = docCode.includes('proposal');
      const isLaporan = docCode.includes('laporan');
      const label = isProposal ? 'surat pengesahan proposal' : isLaporan ? 'surat pengesahan laporan' : 'kartu bimbingan';
      toast.info(`Pengesahan Pembimbing pada ${label} telah dibatalkan`);
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
      docCode = 'kartu_bimbingan_ta',
    }: ApproveKaprodiArgs) => {
      const key = normalizeDocKey(docCode);
      return mutateSubmissionApprovals(submissionId, (current) => {
        const currentDoc = getDocApproval(current, key);
        const updatedDoc: SingleDocApproval = {
          ...currentDoc,
          requested: true,
          signers: {
            ...currentDoc.signers,
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
        };
        const nextDocuments = {
          ...(current.documents || {}),
          [key]: updatedDoc,
        };
        return {
          ...current,
          ...(key === 'kartu_bimbingan_ta' ? {
            requested: true,
            signers: updatedDoc.signers,
          } : {}),
          documents: nextDocuments,
        };
      });
    },
    onSuccess: (_data, variables) => {
      const docCode = variables.docCode || 'kartu_bimbingan_ta';
      const isProposal = docCode.includes('proposal');
      const isLaporan = docCode.includes('laporan');
      const label = isProposal ? 'Surat pengesahan proposal' : isLaporan ? 'Surat pengesahan laporan' : 'Dokumen';
      toast.success(`${label} berhasil disahkan oleh Ketua Program Studi`);
      invalidateAll();
    },
    onError: (err: any) => {
      toast.error('Gagal mengesahkan dokumen: ' + err.message);
    },
  });

  // 5. Kaprodi membatalkan pengesahan
  const revokeKaprodiApproval = useMutation({
    mutationFn: async (args: RevokeKaprodiArgs) => {
      const submissionId = typeof args === 'string' ? args : args.submissionId;
      const docCode = typeof args === 'string' ? 'kartu_bimbingan_ta' : (args.docCode || 'kartu_bimbingan_ta');
      const key = normalizeDocKey(docCode);

      return mutateSubmissionApprovals(submissionId, (current) => {
        const currentDoc = getDocApproval(current, key);
        const nextSigners = { ...currentDoc.signers };
        if (nextSigners.kaprodi) {
          nextSigners.kaprodi = {
            ...nextSigners.kaprodi,
            is_approved: false,
            approved_at: null,
          };
        }
        const updatedDoc: SingleDocApproval = {
          ...currentDoc,
          signers: nextSigners,
        };
        const nextDocuments = {
          ...(current.documents || {}),
          [key]: updatedDoc,
        };
        return {
          ...current,
          ...(key === 'kartu_bimbingan_ta' ? { signers: nextSigners } : {}),
          documents: nextDocuments,
        };
      });
    },
    onSuccess: (_data, variables) => {
      const docCode = typeof variables === 'string' ? 'kartu_bimbingan_ta' : (variables.docCode || 'kartu_bimbingan_ta');
      const isProposal = docCode.includes('proposal');
      const isLaporan = docCode.includes('laporan');
      const label = isProposal ? 'surat pengesahan proposal' : isLaporan ? 'surat pengesahan laporan' : 'dokumen';
      toast.info(`Pengesahan Ketua Program Studi pada ${label} telah dibatalkan`);
      invalidateAll();
    },
    onError: (err: any) => {
      toast.error('Gagal membatalkan pengesahan: ' + err.message);
    },
  });

  return {
    requestApproval,
    cancelRequestApproval,
    approveByAdvisor,
    revokeAdvisorApproval,
    approveByKaprodi,
    revokeKaprodiApproval,
  };
}
