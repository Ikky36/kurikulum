import React, { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, CheckCircle2, XCircle, Users, ExternalLink, Plus, Trash2, Save } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function TugasAkhirAdmin() {
  const [activeTab, setActiveTab] = useState('pengajuan');
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const queryClient = useQueryClient();
  const [formStatus, setFormStatus] = useState<string>('approved');
  const [formComments, setFormComments] = useState<string>('');
  const [formAdvisors, setFormAdvisors] = useState<Array<{ id: string, role: string }>>([{ id: '', role: 'Pembimbing 1' }]);

  const { data: dosenList } = useQuery({
    queryKey: ['admin_dosen_list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, nim')
        .eq('role', 'dosen')
        .order('full_name');
      if (error) throw error;
      return data;
    }
  });

  const processMutation = useMutation({
    mutationFn: async () => {
      let finalComments = selectedSubmission.comments || '';
      if (formComments) {
        finalComments = `[Catatan Admin]: ${formComments}\n\n[Catatan Mahasiswa]: ${selectedSubmission.comments || '-'}`;
      }

      const { error: updateError } = await supabase
        .from('ta_submissions')
        .update({ 
          status: formStatus,
          comments: finalComments
        })
        .eq('id', selectedSubmission.id);
      
      if (updateError) throw updateError;

      if (formStatus === 'approved') {
        await supabase.from('ta_advisors').delete().eq('submission_id', selectedSubmission.id);
        const validAdvisors = formAdvisors.filter(a => a.id !== '');
        if (validAdvisors.length > 0) {
          const insertData = validAdvisors.map(adv => ({
            submission_id: selectedSubmission.id,
            dosen_id: adv.id,
            role: adv.role
          }));
          const { error: advisorError } = await supabase.from('ta_advisors').insert(insertData);
          if (advisorError) throw advisorError;
        }
      }
    },
    onSuccess: () => {
      toast.success('Pengajuan berhasil diproses');
      queryClient.invalidateQueries({ queryKey: ['admin_ta_submissions'] });
      setIsDetailOpen(false);
    },
    onError: (error: any) => {
      toast.error('Gagal memproses pengajuan: ' + error.message);
    }
  });

  const { data: submissions, isLoading } = useQuery({
    queryKey: ['admin_ta_submissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ta_submissions')
        .select(`
          *,
          profiles:student_id(full_name, nim),
          ta_types(name),
          ta_advisors(role, dosen_id, profiles(full_name))
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  return (
    <Layout>
      <div className="container py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Kelola Tugas Akhir</h1>
            <p className="text-muted-foreground mt-1">
              Review pengajuan, plotting dosen, dan jadwal sidang mahasiswa.
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="pengajuan" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Pengajuan Judul
            </TabsTrigger>
            <TabsTrigger value="seminar" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Pendaftaran Seminar & Sidang
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pengajuan" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle>Daftar Pengajuan Tugas Akhir</CardTitle>
                <CardDescription>Persetujuan judul dan penugasan dosen pembimbing.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mahasiswa</TableHead>
                        <TableHead>Jenis & Judul</TableHead>
                        <TableHead>Dosen Pembimbing</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-10">Memuat data...</TableCell>
                        </TableRow>
                      ) : submissions?.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                            Belum ada data pengajuan
                          </TableCell>
                        </TableRow>
                      ) : (
                        submissions?.map((sub: any) => (
                          <TableRow key={sub.id}>
                            <TableCell>
                              <div className="font-medium">{sub.profiles?.full_name}</div>
                              <div className="text-xs text-muted-foreground">{sub.profiles?.nim}</div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="mb-1">{sub.ta_types?.name}</Badge>
                              <div className="font-medium line-clamp-2" title={sub.title}>{sub.title}</div>
                            </TableCell>
                            <TableCell>
                              {sub.ta_advisors?.length > 0 ? (
                                <ul className="text-sm">
                                  {sub.ta_advisors.map((adv: any, i: number) => (
                                    <li key={i}>- {adv.profiles?.full_name}</li>
                                  ))}
                                </ul>
                              ) : (
                                <span className="text-sm text-muted-foreground italic">Belum diplot</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant={
                                sub.status === 'approved' ? 'default' :
                                sub.status === 'rejected' ? 'destructive' :
                                sub.status === 'revision' ? 'secondary' : 'outline'
                              }>
                                {sub.status === 'approved' ? 'Diterima' :
                                 sub.status === 'rejected' ? 'Ditolak' :
                                 sub.status === 'revision' ? 'Revisi' : 'Menunggu'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="outline" size="sm" onClick={() => {
                                setSelectedSubmission(sub);
                                setFormStatus(sub.status === 'pending' ? 'approved' : sub.status);
                                setFormComments('');
                                if (sub.ta_advisors && sub.ta_advisors.length > 0) {
                                  setFormAdvisors(sub.ta_advisors.map((a: any) => ({ id: a.dosen_id || '', role: a.role })));
                                } else {
                                  setFormAdvisors([{ id: '', role: 'Pembimbing 1' }]);
                                }
                                setIsDetailOpen(true);
                              }}>
                                <Eye className="w-4 h-4 mr-2" /> Detail
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Detail Pengajuan Tugas Akhir</DialogTitle>
                  <DialogDescription>
                    Informasi lengkap mengenai pengajuan mahasiswa.
                  </DialogDescription>
                </DialogHeader>
                
                {selectedSubmission && (
                  <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-muted-foreground text-xs">Nama Mahasiswa</Label>
                        <p className="font-medium">{selectedSubmission.profiles?.full_name}</p>
                        <p className="text-sm text-muted-foreground">{selectedSubmission.profiles?.nim}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground text-xs">Jenis Tugas Akhir</Label>
                        <p className="font-medium"><Badge variant="outline">{selectedSubmission.ta_types?.name}</Badge></p>
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-muted-foreground text-xs">Topik / Judul</Label>
                      <p className="font-medium mt-1 p-3 bg-muted rounded-md">{selectedSubmission.title}</p>
                    </div>

                    <div>
                      <Label className="text-muted-foreground text-xs">Link Dokumen</Label>
                      {selectedSubmission.document_link ? (
                        <div className="mt-1">
                          <a 
                            href={selectedSubmission.document_link.startsWith('http') ? selectedSubmission.document_link : `https://${selectedSubmission.document_link}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-primary hover:underline text-sm font-medium"
                          >
                            <ExternalLink className="w-4 h-4 mr-1" /> Buka Dokumen Pengajuan
                          </a>
                        </div>
                      ) : (
                        <p className="text-sm italic mt-1">Tidak ada dokumen yang dilampirkan.</p>
                      )}
                    </div>

                    <div>
                      <Label className="text-muted-foreground text-xs">Catatan Mahasiswa</Label>
                      <p className="text-sm mt-1 whitespace-pre-wrap">{selectedSubmission.comments || '-'}</p>
                    </div>
                    
                    <div className="pt-4 border-t border-border mt-4">
                      <h4 className="text-sm font-semibold mb-3">Tindakan Admin</h4>
                      
                      <div className="space-y-4">
                        <div>
                          <Label>Status Pengajuan</Label>
                          <Select value={formStatus} onValueChange={setFormStatus}>
                            <SelectTrigger className="w-full mt-1">
                              <SelectValue placeholder="Pilih status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="approved">Setujui (Diterima)</SelectItem>
                              <SelectItem value="revision">Revisi</SelectItem>
                              <SelectItem value="rejected">Tolak</SelectItem>
                              <SelectItem value="pending">Kembalikan ke Menunggu</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {formStatus === 'approved' && (
                          <div className="p-4 bg-muted/30 border rounded-md space-y-3">
                            <div className="flex justify-between items-center">
                              <Label>Plotting Dosen Pembimbing</Label>
                              <Button 
                                type="button" 
                                variant="outline" 
                                size="sm" 
                                onClick={() => setFormAdvisors([...formAdvisors, { id: '', role: `Pembimbing ${formAdvisors.length + 1}` }])}
                              >
                                <Plus className="w-3 h-3 mr-1" /> Tambah Pembimbing
                              </Button>
                            </div>
                            
                            {formAdvisors.map((adv, index) => (
                              <div key={index} className="flex gap-2 items-end">
                                <div className="flex-1">
                                  <Label className="text-xs text-muted-foreground">{adv.role}</Label>
                                  <Select 
                                    value={adv.id} 
                                    onValueChange={(val) => {
                                      const newAdvisors = [...formAdvisors];
                                      newAdvisors[index].id = val;
                                      setFormAdvisors(newAdvisors);
                                    }}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Pilih dosen pembimbing" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {dosenList?.map((dosen) => (
                                        <SelectItem key={dosen.id} value={dosen.id}>
                                          {dosen.full_name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <Button 
                                  type="button" 
                                  variant="ghost" 
                                  size="icon" 
                                  className="text-destructive"
                                  onClick={() => {
                                    const newAdvisors = [...formAdvisors];
                                    newAdvisors.splice(index, 1);
                                    setFormAdvisors(newAdvisors);
                                  }}
                                  disabled={formAdvisors.length === 1}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}

                        <div>
                          <Label>Catatan Admin {formStatus !== 'approved' && <span className="text-destructive">*</span>}</Label>
                          <Textarea 
                            className="mt-1" 
                            placeholder={formStatus === 'approved' ? "Catatan opsional..." : "Berikan alasan mengapa direvisi atau ditolak..."}
                            value={formComments}
                            onChange={(e) => setFormComments(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                <DialogFooter className="mt-4">
                  <Button variant="outline" onClick={() => setIsDetailOpen(false)}>Batal</Button>
                  <Button 
                    onClick={() => processMutation.mutate()} 
                    disabled={processMutation.isPending || (formStatus !== 'approved' && !formComments.trim())}
                  >
                    {processMutation.isPending ? 'Menyimpan...' : (
                      <>
                        <Save className="w-4 h-4 mr-2" /> Simpan Perubahan
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>

          <TabsContent value="seminar" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle>Jadwal Ujian & Seminar</CardTitle>
                <CardDescription>Kelola pendaftaran seminar proposal dan sidang akhir.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center py-10">Dalam pengembangan...</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
