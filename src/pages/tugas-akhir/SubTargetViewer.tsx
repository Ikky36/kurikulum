import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, Calendar } from 'lucide-react';
import { TAMilestone } from '@/lib/types';

interface SubTargetViewerProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  submissionId: string;
  studentName: string;
}

export function SubTargetViewer({ isOpen, setIsOpen, submissionId, studentName }: SubTargetViewerProps) {
  const { data: milestones, isLoading } = useQuery({
    queryKey: ['admin_ta_milestones', submissionId],
    queryFn: async () => {
      if (!submissionId) return [];
      const { data, error } = await supabase
        .from('ta_milestones')
        .select(`
          *,
          phase:ta_master_phases(name)
        `)
        .eq('submission_id', submissionId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: isOpen && !!submissionId
  });

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Riwayat Sub-Target (To-Do List)</DialogTitle>
          <DialogDescription>
            Memantau riwayat target bimbingan untuk mahasiswa <strong>{studentName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Memuat data target...</div>
          ) : !milestones || milestones.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground bg-muted/30 rounded-lg border border-dashed">
              Belum ada sub-target yang diberikan pada mahasiswa ini.
            </div>
          ) : (
            <div className="space-y-3">
              {milestones.map((milestone) => (
                <div key={milestone.id} className="p-4 border rounded-lg bg-card shadow-sm flex items-start gap-4">
                  <div className="mt-1">
                    {milestone.status === 'completed' ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    ) : (
                      <Clock className="w-5 h-5 text-amber-500" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <h4 className={`font-medium ${milestone.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                        {milestone.title}
                      </h4>
                      <Badge variant={milestone.status === 'completed' ? 'outline' : 'secondary'} className={milestone.status === 'completed' ? 'text-green-600 border-green-200 bg-green-50' : ''}>
                        {milestone.status === 'completed' ? 'Selesai' : 'Belum Selesai'}
                      </Badge>
                    </div>
                    
                    <div className="flex flex-wrap gap-x-4 gap-y-2 mt-2 text-xs text-muted-foreground">
                      {milestone.phase && (
                        <div className="flex items-center">
                          <Badge variant="outline" className="text-[10px] h-5 px-1.5">{milestone.phase.name}</Badge>
                        </div>
                      )}
                      
                      {milestone.target_date && (
                        <div className="flex items-center text-red-500 font-medium">
                          <Calendar className="w-3 h-3 mr-1" />
                          Target: {new Date(milestone.target_date).toLocaleDateString('id-ID')}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
