import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { PenLine, Upload, Trash2, CheckCircle2, AlertCircle, RefreshCw, Edit3, Eraser, Info } from 'lucide-react';

interface SignatureUploadCardProps {
  className?: string;
}

export function SignatureUploadCard({ className = '' }: SignatureUploadCardProps) {
  const { user, profile, refreshProfile } = useAuth();
  const [uploadingType, setUploadingType] = useState<'signature' | 'paraf' | null>(null);

  // Canvas Modal State
  const [canvasModalOpen, setCanvasModalOpen] = useState(false);
  const [canvasTarget, setCanvasTarget] = useState<'signature' | 'paraf'>('signature');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  // Hidden File Input Refs
  const signatureInputRef = useRef<HTMLInputElement | null>(null);
  const parafInputRef = useRef<HTMLInputElement | null>(null);

  const signatureUrl = profile?.signature_url;
  const parafUrl = profile?.paraf_url;

  // File Upload Handler (Max 1 MB)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'signature' | 'paraf') => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Reset input value so same file can be re-selected if needed
    e.target.value = '';

    // Validasi Ukuran File (Maksimal 1 MB)
    const MAX_SIZE_MB = 1;
    const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
    if (file.size > MAX_SIZE_BYTES) {
      toast.error(`Ukuran file melebihi batas maksimal ${MAX_SIZE_MB} MB. Silakan kompres atau pilih file lain.`);
      return;
    }

    // Validasi Format Gambar
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Format file tidak didukung. Harap unggah gambar berformat PNG, JPG, atau WebP.');
      return;
    }

    setUploadingType(type);
    try {
      const fileExt = file.name.split('.').pop() || 'png';
      const timestamp = Date.now();
      const filePath = `${user.id}/${type}_${timestamp}.${fileExt}`;

      // Upload ke Supabase Storage (bucket avatars)
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true, contentType: file.type });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const publicUrl = urlData.publicUrl;

      // Update kolom di profiles
      const updatePayload = type === 'signature' ? { signature_url: publicUrl } : { paraf_url: publicUrl };
      const { error: dbError } = await supabase
        .from('profiles')
        .update(updatePayload)
        .eq('id', user.id);

      if (dbError) throw dbError;

      toast.success(`${type === 'signature' ? 'Tanda tangan' : 'Paraf'} berhasil diperbarui!`);
      await refreshProfile();
    } catch (err: any) {
      toast.error(`Gagal mengunggah ${type === 'signature' ? 'tanda tangan' : 'paraf'}: ${err.message}`);
    } finally {
      setUploadingType(null);
    }
  };

  // Delete Handler
  const handleDelete = async (type: 'signature' | 'paraf') => {
    if (!user) return;
    setUploadingType(type);
    try {
      const updatePayload = type === 'signature' ? { signature_url: null } : { paraf_url: null };
      const { error: dbError } = await supabase
        .from('profiles')
        .update(updatePayload)
        .eq('id', user.id);

      if (dbError) throw dbError;

      toast.success(`${type === 'signature' ? 'Tanda tangan' : 'Paraf'} berhasil dihapus`);
      await refreshProfile();
    } catch (err: any) {
      toast.error(`Gagal menghapus: ${err.message}`);
    } finally {
      setUploadingType(null);
    }
  };

  // Canvas Drawing Logic
  const openCanvasModal = (target: 'signature' | 'paraf') => {
    setCanvasTarget(target);
    setHasDrawn(false);
    setCanvasModalOpen(true);
  };

  useEffect(() => {
    if (canvasModalOpen && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Clear canvas with transparent background
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#0f172a';
      }
    }
  }, [canvasModalOpen]);

  const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setIsDrawing(true);
    setHasDrawn(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCanvasCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCanvasCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = (e?: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (e) e.preventDefault();
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasDrawn(false);
    }
  };

  const saveCanvasDrawing = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !user || !hasDrawn) return;

    setUploadingType(canvasTarget);
    setCanvasModalOpen(false);

    canvas.toBlob(async (blob) => {
      if (!blob) {
        setUploadingType(null);
        return;
      }

      try {
        const timestamp = Date.now();
        const filePath = `${user.id}/${canvasTarget}_${timestamp}.png`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, blob, { upsert: true, contentType: 'image/png' });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
        const publicUrl = urlData.publicUrl;

        const updatePayload = canvasTarget === 'signature' ? { signature_url: publicUrl } : { paraf_url: publicUrl };
        const { error: dbError } = await supabase
          .from('profiles')
          .update(updatePayload)
          .eq('id', user.id);

        if (dbError) throw dbError;

        toast.success(`${canvasTarget === 'signature' ? 'Tanda tangan' : 'Paraf'} berhasil disimpan!`);
        await refreshProfile();
      } catch (err: any) {
        toast.error(`Gagal menyimpan: ${err.message}`);
      } finally {
        setUploadingType(null);
      }
    }, 'image/png');
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <PenLine className="h-5 w-5 text-primary" />
            Tanda Tangan & Paraf Digital
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            Maks. 1 MB
          </Badge>
        </div>
        <CardDescription>
          Kelola tanda tangan dan paraf Anda untuk dokumen akademik resmi (KRS, Kartu Bimbingan Tugas Akhir, Kartu DPA, dll.)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          {/* 1. SEKSI TANDA TANGAN */}
          <div className="flex flex-col justify-between p-4 rounded-xl border bg-card hover:border-primary/40 transition-all">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm flex items-center gap-1.5">
                  Tanda Tangan Penuh
                  {signatureUrl ? (
                    <Badge variant="default" className="text-[10px] h-5 bg-emerald-600 hover:bg-emerald-600">
                      <CheckCircle2 className="h-3 w-3 mr-1" /> Siap
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px] h-5">
                      Belum Ada
                    </Badge>
                  )}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Digunakan untuk lembar pengesahan, persetujuan KRS, dan kolom pengesahan akhir dokumen.
              </p>

              {/* Box Preview Tanda Tangan */}
              <div className="relative mt-3 h-36 w-full rounded-lg border-2 border-dashed border-border/80 flex items-center justify-center overflow-hidden bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#1f2937_1px,transparent_1px)] [background-size:12px_12px]">
                {signatureUrl ? (
                  <img
                    src={signatureUrl}
                    alt="Tanda Tangan"
                    className="max-h-28 max-w-[90%] object-contain drop-shadow-sm transition-transform hover:scale-105"
                  />
                ) : (
                  <div className="text-center p-4">
                    <PenLine className="h-8 w-8 mx-auto text-muted-foreground/40 mb-1" />
                    <p className="text-xs text-muted-foreground font-medium">Belum ada tanda tangan</p>
                    <p className="text-[11px] text-muted-foreground/70">Upload file PNG transparan atau gores langsung</p>
                  </div>
                )}
              </div>
            </div>

            {/* Tombol Aksi Tanda Tangan */}
            <div className="mt-4 pt-3 border-t flex flex-wrap gap-2">
              <input
                ref={signatureInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                className="hidden"
                onChange={(e) => handleFileChange(e, 'signature')}
              />
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs"
                disabled={uploadingType === 'signature'}
                onClick={() => signatureInputRef.current?.click()}
              >
                <Upload className="h-3.5 w-3.5 mr-1.5" />
                {signatureUrl ? 'Ganti File' : 'Unggah File'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs"
                disabled={uploadingType === 'signature'}
                onClick={() => openCanvasModal('signature')}
              >
                <Edit3 className="h-3.5 w-3.5 mr-1.5" />
                Gores Digital
              </Button>
              {signatureUrl && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                  disabled={uploadingType === 'signature'}
                  onClick={() => handleDelete('signature')}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>

          {/* 2. SEKSI PARAF */}
          <div className="flex flex-col justify-between p-4 rounded-xl border bg-card hover:border-primary/40 transition-all">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm flex items-center gap-1.5">
                  Paraf Singkat
                  {parafUrl ? (
                    <Badge variant="default" className="text-[10px] h-5 bg-emerald-600 hover:bg-emerald-600">
                      <CheckCircle2 className="h-3 w-3 mr-1" /> Siap
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px] h-5">
                      Belum Ada
                    </Badge>
                  )}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Digunakan untuk kolom paraf di setiap baris bimbingan tugas akhir dan absensi pertemuan.
              </p>

              {/* Box Preview Paraf */}
              <div className="relative mt-3 h-36 w-full rounded-lg border-2 border-dashed border-border/80 flex items-center justify-center overflow-hidden bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#1f2937_1px,transparent_1px)] [background-size:12px_12px]">
                {parafUrl ? (
                  <img
                    src={parafUrl}
                    alt="Paraf"
                    className="max-h-24 max-w-[85%] object-contain drop-shadow-sm transition-transform hover:scale-105"
                  />
                ) : (
                  <div className="text-center p-4">
                    <Edit3 className="h-8 w-8 mx-auto text-muted-foreground/40 mb-1" />
                    <p className="text-xs text-muted-foreground font-medium">Belum ada paraf</p>
                    <p className="text-[11px] text-muted-foreground/70">Upload file PNG transparan atau gores langsung</p>
                  </div>
                )}
              </div>
            </div>

            {/* Tombol Aksi Paraf */}
            <div className="mt-4 pt-3 border-t flex flex-wrap gap-2">
              <input
                ref={parafInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                className="hidden"
                onChange={(e) => handleFileChange(e, 'paraf')}
              />
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs"
                disabled={uploadingType === 'paraf'}
                onClick={() => parafInputRef.current?.click()}
              >
                <Upload className="h-3.5 w-3.5 mr-1.5" />
                {parafUrl ? 'Ganti File' : 'Unggah File'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs"
                disabled={uploadingType === 'paraf'}
                onClick={() => openCanvasModal('paraf')}
              >
                <Edit3 className="h-3.5 w-3.5 mr-1.5" />
                Gores Digital
              </Button>
              {parafUrl && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                  disabled={uploadingType === 'paraf'}
                  onClick={() => handleDelete('paraf')}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Informasi Bantuan / Rekomendasi Format */}
        <div className="p-3 bg-muted/60 rounded-lg text-xs text-muted-foreground flex items-start gap-2.5">
          <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-medium text-foreground">Tips Kerapian Dokumen:</p>
            <p>
              Gunakan gambar berlatar belakang transparan (format PNG) agar garis tabel pada kartu bimbingan atau dokumen tidak tertutup warna putih latar.
              Ukuran gambar dibatasi maksimal <strong>1 MB</strong> per berkas.
            </p>
          </div>
        </div>
      </CardContent>

      {/* MODAL CANVAS UNTUK GORES TANDA TANGAN / PARAF LANGSUNG */}
      <Dialog open={canvasModalOpen} onOpenChange={setCanvasModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {canvasTarget === 'signature' ? 'Gores Tanda Tangan Digital' : 'Gores Paraf Digital'}
            </DialogTitle>
            <DialogDescription>
              Tuliskan tanda tangan/paraf Anda langsung di atas kanvas menggunakan jari, stylus pen, atau mouse.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center">
            <div className="w-full border-2 border-primary/30 rounded-lg overflow-hidden bg-white touch-none">
              <canvas
                ref={canvasRef}
                width={400}
                height={200}
                className="w-full h-48 cursor-crosshair"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
            </div>
            <div className="w-full flex justify-between items-center mt-2 px-1">
              <span className="text-[11px] text-muted-foreground italic">
                *Latar belakang otomatis disimpan secara transparan (PNG).
              </span>
              <Button variant="ghost" size="sm" onClick={clearCanvas} className="text-xs h-7 text-muted-foreground">
                <Eraser className="h-3.5 w-3.5 mr-1" /> Hapus Coretan
              </Button>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setCanvasModalOpen(false)}>
              Batal
            </Button>
            <Button size="sm" onClick={saveCanvasDrawing} disabled={!hasDrawn}>
              Simpan {canvasTarget === 'signature' ? 'Tanda Tangan' : 'Paraf'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
