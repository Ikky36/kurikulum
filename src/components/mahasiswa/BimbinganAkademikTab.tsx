import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { MessageSquare, CalendarDays, Clock, Send, Info, FileText } from 'lucide-react';
import { Profile } from '@/lib/types';

export function BimbinganAkademikTab() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  const [topic, setTopic] = useState('');
  const [media, setMedia] = useState('Tatap Muka');
  const [message, setMessage] = useState('');
  const [proposedTime, setProposedTime] = useState('');

  // Fetch student's DPA
  const { data: dpaInfo, isLoading: loadingDpa } = useQuery({
    queryKey: ['my_dpa', profile?.enrollment_year, (profile as any)?.sistem_kuliah_id],
    queryFn: async () => {
      if (!profile?.enrollment_year || !(profile as any)?.sistem_kuliah_id) return null;
      
      const { data, error } = await supabase
        .from('academic_advisors')
        .select('*, dosen:profiles!academic_advisors_dosen_id_fkey(*)')
        .eq('enrollment_year', profile.enrollment_year)
        .eq('sistem_kuliah_id', (profile as any).sistem_kuliah_id)
        .maybeSingle();
        
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.enrollment_year && !!(profile as any)?.sistem_kuliah_id
  });

  // Fetch Bimbingan Logs
  const { data: logs = [], refetch: refetchLogs } = useQuery({
    queryKey: ['my_guidance_logs', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('academic_guidance_logs')
        .select('*, dosen:profiles!academic_guidance_logs_dosen_id_fkey(full_name)')
        .eq('student_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  const requestBimbinganMutation = useMutation({
    mutationFn: async () => {
      if (!dpaInfo?.dosen_id) throw new Error("DPA tidak ditemukan");
      
      const { error } = await supabase.from('academic_guidance_logs').insert({
        student_id: user?.id,
        dosen_id: dpaInfo.dosen_id,
        topic,
        media,
        student_message: message,
        requested_time: proposedTime ? new Date(proposedTime).toISOString() : null,
        status: 'pending'
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Pengajuan bimbingan berhasil dikirim ke DPA');
      setTopic('');
      setMessage('');
      setProposedTime('');
      refetchLogs();
    },
    onError: (err: any) => {
      toast.error('Gagal mengajukan bimbingan: ' + err.message);
    }
  });

  if (loadingDpa) return <div>Memuat informasi DPA...</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-1 space-y-6">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Info className="h-5 w-5" />
              Dosen Pembimbing Akademik
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dpaInfo ? (
              <div className="space-y-4">
                <div className="text-center p-4 bg-background rounded-lg border">
                  <div className="h-16 w-16 bg-primary/10 rounded-full mx-auto flex items-center justify-center mb-3">
                    <span className="text-2xl font-bold text-primary">
                      {dpaInfo.dosen?.full_name?.charAt(0) || 'D'}
                    </span>
                  </div>
                  <h3 className="font-bold">{dpaInfo.dosen?.full_name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{dpaInfo.dosen?.nip || 'NIP/NIDN tidak tersedia'}</p>
                </div>
                <div className="text-sm space-y-2 text-muted-foreground">
                  <p>DPA bertugas untuk memberikan pertimbangan, persetujuan KRS, dan membimbing Anda dalam masalah akademik.</p>
                </div>
              </div>
            ) : (
              <div className="text-center p-6 bg-background rounded-lg border border-dashed">
                <p className="text-sm text-muted-foreground">Admin belum menugaskan DPA untuk angkatan Anda.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {dpaInfo && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ajukan Bimbingan Baru</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-medium">Topik Bimbingan</label>
                <Input value={topic} onChange={e => setTopic(e.target.value)} placeholder="Contoh: Konsultasi Nilai Semester Lalu" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium">Media Pertemuan</label>
                <Select value={media} onValueChange={setMedia}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Tatap Muka">Tatap Muka (Ruang Dosen)</SelectItem>
                    <SelectItem value="Online / Zoom">Online / Zoom</SelectItem>
                    <SelectItem value="Chat System">Pesan Sistem / Chat</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium">Usulan Waktu (Opsional)</label>
                <Input type="datetime-local" value={proposedTime} onChange={e => setProposedTime(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium">Pesan Tambahan</label>
                <Textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Ceritakan singkat apa yang ingin Anda diskusikan..." />
              </div>
              <Button 
                onClick={() => requestBimbinganMutation.mutate()} 
                disabled={!topic || requestBimbinganMutation.isPending} 
                className="w-full"
              >
                <Send className="h-4 w-4 mr-2" /> Ajukan Bimbingan
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="md:col-span-2 space-y-6">
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Riwayat & Catatan Bimbingan Akademik
            </CardTitle>
            <CardDescription>Catatan hasil pertemuan dari DPA Anda akan muncul di sini.</CardDescription>
          </CardHeader>
          <CardContent>
            {logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground border-dashed border-2 rounded-xl bg-muted/10">
                <FileText className="h-12 w-12 mb-4 opacity-20" />
                <h3 className="font-medium text-foreground">Belum ada catatan bimbingan</h3>
                <p className="text-sm mt-1 max-w-sm">Anda belum pernah melakukan bimbingan akademik, atau DPA belum memberikan catatan.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {logs.map((log: any) => (
                  <div key={log.id} className="border rounded-xl p-5 bg-card shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                    {/* Status accent line */}
                    <div className={`absolute left-0 top-0 bottom-0 w-1 \${
                      log.status === 'completed' ? 'bg-success' : 
                      log.status === 'pending' ? 'bg-warning' : 
                      log.status === 'rejected' ? 'bg-destructive' : 'bg-primary'
                    }`} />
                    
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                      <div>
                        <h4 className="font-bold text-lg">{log.topic}</h4>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                          <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3"/> {new Date(log.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3"/> {log.media}</span>
                        </div>
                      </div>
                      <Badge variant={
                        log.status === 'completed' ? 'default' : 
                        log.status === 'pending' ? 'secondary' : 
                        log.status === 'rejected' ? 'destructive' : 'outline'
                      } className="capitalize px-3 py-1">
                        {log.status === 'completed' ? 'Selesai' : 
                         log.status === 'pending' ? 'Menunggu' : 
                         log.status === 'approved' ? 'Disetujui (Terjadwal)' : 'Ditolak'}
                      </Badge>
                    </div>

                    <div className="space-y-4 text-sm mt-4">
                      {log.student_message && (
                        <div className="bg-muted/30 p-3 rounded-lg border">
                          <p className="font-semibold mb-1 text-xs text-muted-foreground">Pesan Anda:</p>
                          <p className="whitespace-pre-wrap">{log.student_message}</p>
                        </div>
                      )}
                      
                      {log.dosen_notes && (
                        <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
                          <p className="font-semibold mb-2 flex items-center gap-2 text-primary">
                            <Info className="h-4 w-4" /> Catatan & Rekomendasi DPA ({log.dosen?.full_name}):
                          </p>
                          <p className="whitespace-pre-wrap text-foreground/90">{log.dosen_notes}</p>
                        </div>
                      )}
                      
                      {!log.dosen_notes && log.status !== 'pending' && (
                        <p className="text-muted-foreground italic text-xs">DPA belum memberikan catatan tertulis untuk sesi ini.</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
