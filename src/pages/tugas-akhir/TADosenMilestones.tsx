import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { TATimeline } from './TATimeline';
import { CheckCircle2, Check, Plus, Save, X } from 'lucide-react';
import { toast } from 'sonner';

interface TADosenMilestonesProps {
  submissionId: string;
  typeId: string;
  dosenId: string;
}

export function TADosenMilestones({ submissionId, typeId, dosenId }: TADosenMilestonesProps) {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState('');

  // Get current submission to know current_phase_id
  const { data: submission } = useQuery({
    queryKey: ['ta_submission', submissionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ta_submissions')
        .select('current_phase_id')
        .eq('id', submissionId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!submissionId
  });

  // Get all master phases for this type
  const { data: phases } = useQuery({
    queryKey: ['ta_phases', typeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ta_master_phases')
        .select('*')
        .eq('ta_type_id', typeId)
        .eq('is_active', true)
        .order('order_num');
      if (error) throw error;
      return data;
    },
    enabled: !!typeId
  });

  // Get milestones
  const { data: milestones, isLoading: loadingMilestones } = useQuery({
    queryKey: ['ta_milestones', submissionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ta_milestones')
        .select('*, phase:ta_master_phases(name)')
        .eq('submission_id', submissionId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!submissionId
  });

  // Check Phase Approvals
  const { data: approvals } = useQuery({
    queryKey: ['ta_phase_approvals', submissionId, submission?.current_phase_id],
    queryFn: async () => {
      if (!submission?.current_phase_id) return [];
      const { data, error } = await supabase
        .from('ta_phase_approvals')
        .select('dosen_id')
        .eq('submission_id', submissionId)
        .eq('phase_id', submission.current_phase_id);
      if (error) throw error;
      return data;
    },
    enabled: !!submission?.current_phase_id
  });

  // Check how many advisors the student has
  const { data: advisors } = useQuery({
    queryKey: ['ta_advisors_count', submissionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ta_advisors')
        .select('dosen_id')
        .eq('submission_id', submissionId);
      if (error) throw error;
      return data;
    },
    enabled: !!submissionId
  });

  const addMilestone = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('ta_milestones')
        .insert({
          submission_id: submissionId,
          phase_id: submission?.current_phase_id || null,
          title: newTitle,
          target_date: newDate || null,
          status: 'pending',
          created_by: dosenId
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Sub-target berhasil ditambahkan');
      queryClient.invalidateQueries({ queryKey: ['ta_milestones', submissionId] });
      setNewTitle('');
      setNewDate('');
      setIsAdding(false);
    },
    onError: (e: any) => toast.error('Gagal menambah target: ' + e.message)
  });

  const approvePhase = useMutation({
    mutationFn: async () => {
      if (!submission?.current_phase_id) throw new Error("Tidak ada fase saat ini");

      // 1. Insert approval for THIS DOSEN
      const { error: approveErr } = await supabase
        .from('ta_phase_approvals')
        .insert({
          submission_id: submissionId,
          phase_id: submission.current_phase_id,
          dosen_id: dosenId
        });
      if (approveErr) throw approveErr;

      // 2. Check if all advisors have approved
      const totalAdvisors = advisors?.length || 1;
      const currentApprovals = (approvals?.length || 0) + 1; // +1 because we just inserted

      if (currentApprovals >= totalAdvisors && phases) {
        // Move to next phase
        const currentIndex = phases.findIndex(p => p.id === submission.current_phase_id);
        if (currentIndex !== -1 && currentIndex < phases.length - 1) {
          const nextPhaseId = phases[currentIndex + 1].id;
          const { error: updateErr } = await supabase
            .from('ta_submissions')
            .update({ current_phase_id: nextPhaseId })
            .eq('id', submissionId);
          if (updateErr) throw updateErr;
        } else if (currentIndex === phases.length - 1) {
          // Already at last phase
          toast.success("Mahasiswa telah menyelesaikan semua fase!");
        }
      }
    },
    onSuccess: () => {
      toast.success('Fase berhasil disetujui');
      queryClient.invalidateQueries({ queryKey: ['ta_submission', submissionId] });
      queryClient.invalidateQueries({ queryKey: ['ta_phase_approvals', submissionId] });
    },
    onError: (e: any) => toast.error('Gagal menyetujui fase: ' + e.message)
  });

  const iHaveApproved = approvals?.some(a => a.dosen_id === dosenId);
  const currentPhaseName = phases?.find(p => p.id === submission?.current_phase_id)?.name || 'Belum diatur';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Progres & Target Fase</CardTitle>
          <CardDescription>Pantau perjalanan tugas akhir mahasiswa dan berikan target mingguan/bulanan.</CardDescription>
        </CardHeader>
        <CardContent>
          <TATimeline phases={phases || []} currentPhaseId={submission?.current_phase_id} />
          
          <div className="mt-6 p-4 bg-primary/5 border border-primary/20 rounded-lg flex flex-col sm:flex-row justify-between items-center gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Fase Saat Ini</p>
              <h4 className="text-lg font-semibold text-primary">{currentPhaseName}</h4>
              {advisors && advisors.length > 1 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Persetujuan: {approvals?.length || 0} / {advisors.length} Dosen
                </p>
              )}
            </div>
            
            {submission?.current_phase_id && (
              <Button 
                onClick={() => approvePhase.mutate()} 
                disabled={iHaveApproved || approvePhase.isPending}
                variant={iHaveApproved ? "secondary" : "default"}
              >
                {iHaveApproved ? (
                  <><Check className="w-4 h-4 mr-2" /> Anda Sudah Menyetujui</>
                ) : (
                  <><CheckCircle2 className="w-4 h-4 mr-2" /> Setujui Lanjut Fase</>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Sub-Target Bimbingan</CardTitle>
            <CardDescription>Berikan target spesifik untuk mahasiswa kerjakan.</CardDescription>
          </div>
          {!isAdding && (
            <Button size="sm" onClick={() => setIsAdding(true)}>
              <Plus className="w-4 h-4 mr-2" /> Tambah Target
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {isAdding && (
            <div className="p-4 border rounded-md mb-4 bg-muted/30 space-y-4">
              <div>
                <Label>Deskripsi Sub-Target</Label>
                <Input 
                  placeholder="Contoh: Selesaikan revisi Bab 1" 
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Tenggat Waktu (Target Date)</Label>
                <Input 
                  type="date"
                  value={newDate}
                  onChange={e => setNewDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => setIsAdding(false)}>Batal</Button>
                <Button size="sm" onClick={() => addMilestone.mutate()} disabled={!newTitle.trim() || addMilestone.isPending}>
                  Simpan Target
                </Button>
              </div>
            </div>
          )}

          {loadingMilestones ? (
            <div className="text-center py-4 text-muted-foreground">Memuat sub-target...</div>
          ) : !milestones || milestones.length === 0 ? (
            <div className="text-center py-6 border border-dashed rounded-lg text-muted-foreground">
              Belum ada sub-target yang diberikan.
            </div>
          ) : (
            <div className="space-y-3">
              {milestones.map((m: any) => (
                <div key={m.id} className="p-4 border rounded-lg bg-card flex items-start gap-3">
                  <div className="mt-0.5">
                    {m.status === 'completed' ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    ) : (
                      <Clock className="w-5 h-5 text-amber-500" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <h4 className={`font-medium ${m.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                        {m.title}
                      </h4>
                      <Badge variant={m.status === 'completed' ? 'outline' : 'secondary'}>
                        {m.status === 'completed' ? 'Selesai' : 'Belum'}
                      </Badge>
                    </div>
                    <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                      {m.phase && (
                        <span>Fase: {m.phase.name}</span>
                      )}
                      {m.target_date && (
                        <span className="flex items-center text-red-500 font-medium">
                          <Calendar className="w-3 h-3 mr-1" /> {new Date(m.target_date).toLocaleDateString('id-ID')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
