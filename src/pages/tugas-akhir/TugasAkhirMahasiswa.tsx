import React, { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { FileText, Clock, CheckCircle2, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function TugasAkhirMahasiswa() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [selectedType, setSelectedType] = useState('');
  const [title, setTitle] = useState('');
  const [documentLink, setDocumentLink] = useState('');
  const [comments, setComments] = useState('');

  const { data: mySubmission, isLoading: subLoading } = useQuery({
    queryKey: ['my_ta_submission', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ta_submissions')
        .select('*, ta_types(name), ta_advisors(profiles(full_name))')
        .eq('student_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  const { data: taTypes, isLoading: typesLoading } = useQuery({
    queryKey: ['ta_types_student'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ta_types').select('*').order('name');
      if (error) throw error;
      return data;
    }
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not logged in');
      
      const { data, error } = await supabase.from('ta_submissions').insert({
        student_id: user.id,
        type_id: selectedType,
        title,
        document_link: documentLink,
        comments
      }).select().single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my_ta_submission', user?.id] });
      toast.success('Berhasil mengajukan Tugas Akhir');
    },
    onError: (error: any) => {
      toast.error('Gagal mengajukan: ' + error.message);
    }
  });

  if (subLoading || typesLoading) return <Layout><div className="container py-8 text-center">Memuat data...</div></Layout>;

  return (
    <Layout>
      <div className="container py-8 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Tugas Akhir</h1>
        
        {mySubmission ? (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-2xl">{mySubmission.title}</CardTitle>
                    <CardDescription className="text-base mt-1">Jenis: {mySubmission.ta_types?.name}</CardDescription>
                  </div>
                  <Badge className="text-sm px-3 py-1" variant={
                    mySubmission.status === 'approved' ? 'default' :
                    mySubmission.status === 'rejected' ? 'destructive' :
                    mySubmission.status === 'revision' ? 'secondary' : 'outline'
                  }>
                    {mySubmission.status === 'approved' && <CheckCircle2 className="w-4 h-4 mr-2 inline" />}
                    {mySubmission.status === 'rejected' && <XCircle className="w-4 h-4 mr-2 inline" />}
                    {mySubmission.status === 'revision' && <RefreshCw className="w-4 h-4 mr-2 inline" />}
                    {mySubmission.status === 'pending' && <Clock className="w-4 h-4 mr-2 inline" />}
                    {mySubmission.status === 'approved' ? 'Disetujui' :
                     mySubmission.status === 'rejected' ? 'Ditolak' :
                     mySubmission.status === 'revision' ? 'Revisi' : 'Menunggu Review'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {mySubmission.status === 'rejected' && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Pengajuan Ditolak</AlertTitle>
                    <AlertDescription>
                      Mohon maaf, pengajuan judul Anda ditolak. Silakan ajukan judul baru dengan menghubungi Kaprodi.
                    </AlertDescription>
                  </Alert>
                )}
                
                {mySubmission.ta_advisors?.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Dosen Pembimbing</h3>
                    <ul className="list-disc list-inside">
                      {mySubmission.ta_advisors.map((adv: any, i: number) => (
                        <li key={i}>{adv.profiles?.full_name}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                <div>
                  <h3 className="font-semibold mb-1">Dokumen Pengajuan</h3>
                  <a href={mySubmission.document_link} target="_blank" rel="noreferrer" className="text-primary hover:underline flex items-center">
                    <FileText className="w-4 h-4 mr-2" /> Buka Dokumen
                  </a>
                </div>
              </CardContent>
              {mySubmission.status === 'approved' && (
                <CardFooter>
                  <Button className="w-full sm:w-auto">Buka Log Bimbingan</Button>
                </CardFooter>
              )}
            </Card>
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Pengajuan Judul Tugas Akhir</CardTitle>
              <CardDescription>Pilih jenis tugas akhir dan masukkan judul yang akan diajukan.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Jenis Tugas Akhir</Label>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Jenis..." />
                  </SelectTrigger>
                  <SelectContent>
                    {taTypes?.map((type: any) => (
                      <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Topik / Judul</Label>
                <Textarea 
                  placeholder="Ketikkan judul tugas akhir Anda..." 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)}
                  className="min-h-[80px]"
                />
              </div>
              <div className="space-y-2">
                <Label>Link Dokumen Proposal (Google Drive, dll)</Label>
                <Input 
                  placeholder="https://..." 
                  value={documentLink} 
                  onChange={(e) => setDocumentLink(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Pastikan link dapat diakses oleh publik atau Dosen/Admin.</p>
              </div>
              <div className="space-y-2">
                <Label>Catatan Tambahan (Opsional)</Label>
                <Textarea 
                  placeholder="Pesan untuk Kaprodi..." 
                  value={comments} 
                  onChange={(e) => setComments(e.target.value)}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={() => submitMutation.mutate()} 
                disabled={!selectedType || !title || !documentLink || submitMutation.isPending}
                className="w-full"
              >
                Kirim Pengajuan
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>
    </Layout>
  );
}
