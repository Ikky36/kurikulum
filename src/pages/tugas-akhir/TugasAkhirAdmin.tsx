import React, { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, CheckCircle2, XCircle, Users, ExternalLink } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function TugasAkhirAdmin() {
  const [activeTab, setActiveTab] = useState('pengajuan');
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const { data: submissions, isLoading } = useQuery({
    queryKey: ['admin_ta_submissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ta_submissions')
        .select(`
          *,
          profiles:student_id(full_name, nim),
          ta_types(name),
          ta_advisors(profiles(full_name))
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
                    
                    <div className="pt-4 border-t border-border mt-4 flex items-center justify-between">
                      <div>
                        <Label className="text-muted-foreground text-xs">Status Saat Ini</Label>
                        <div className="mt-1">
                          <Badge variant={
                            selectedSubmission.status === 'approved' ? 'default' :
                            selectedSubmission.status === 'rejected' ? 'destructive' :
                            selectedSubmission.status === 'revision' ? 'secondary' : 'outline'
                          }>
                            {selectedSubmission.status === 'approved' ? 'Diterima' :
                             selectedSubmission.status === 'rejected' ? 'Ditolak' :
                             selectedSubmission.status === 'revision' ? 'Revisi' : 'Menunggu Review'}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="text-right">
                         <span className="text-xs text-muted-foreground italic block mb-1">
                           Fitur persetujuan & plotting dosen masih dalam pengembangan.
                         </span>
                      </div>
                    </div>
                  </div>
                )}
                
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDetailOpen(false)}>Tutup</Button>
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
