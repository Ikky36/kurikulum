import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Upload, Edit3, Trash2, CheckCircle2, RotateCcw, Download } from 'lucide-react';
import { toast } from 'sonner';
import { downloadFile } from '@/lib/downloadUtils';

interface DigitalSignatureBoxProps {
  signatureUrl: string | null;
  onSignatureChange: (url: string | null) => void;
  title?: string;
  signerName?: string;
  defaultAccountSignature?: string | null;
  folderPrefix?: string;
}

export const DigitalSignatureBox: React.FC<DigitalSignatureBoxProps> = ({
  signatureUrl,
  onSignatureChange,
  title = 'Tanda Tangan Pengesahan',
  signerName = 'Penguji',
  defaultAccountSignature,
  folderPrefix = 'evaluasi_ta',
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [canvasModalOpen, setCanvasModalOpen] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Setup Canvas when modal opens
  useEffect(() => {
    if (canvasModalOpen && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
      setHasDrawn(false);
    }
  }, [canvasModalOpen]);

  // Canvas drawing helpers
  const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX = 0;
    let clientY = 0;

    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('clientX' in e) {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    setHasDrawn(true);
    const { x, y } = getCanvasCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if ('touches' in e) e.preventDefault();
    const { x, y } = getCanvasCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.closePath();
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

  // Upload Drawn Canvas Blob
  const handleSaveCanvas = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawn) return;

    setIsUploading(true);
    setCanvasModalOpen(false);

    canvas.toBlob(async (blob) => {
      if (!blob) {
        setIsUploading(false);
        toast.error('Gagal memproses gambar tanda tangan.');
        return;
      }

      try {
        const timestamp = Date.now();
        const rand = Math.random().toString(36).substring(2, 8);
        const fileName = `${folderPrefix}/ttd_${timestamp}_${rand}.png`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, blob, { contentType: 'image/png', upsert: true });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
        onSignatureChange(urlData.publicUrl);
        toast.success('Tanda tangan digital berhasil dibubuhkan!');
      } catch (err: any) {
        toast.error('Gagal mengunggah tanda tangan: ' + err.message);
      } finally {
        setIsUploading(false);
      }
    }, 'image/png');
  };

  // Upload Berkas PNG / JPG
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Berkas harus berupa gambar (PNG/JPG).');
      return;
    }

    if (file.size > 1.5 * 1024 * 1024) {
      toast.error('Ukuran berkas maksimal 1.5 MB.');
      return;
    }

    setIsUploading(true);
    try {
      const timestamp = Date.now();
      const ext = file.name.split('.').pop() || 'png';
      const rand = Math.random().toString(36).substring(2, 8);
      const fileName = `${folderPrefix}/ttd_upload_${timestamp}_${rand}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { contentType: file.type, upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
      onSignatureChange(urlData.publicUrl);
      toast.success('Berkas tanda tangan berhasil diunggah!');
    } catch (err: any) {
      toast.error('Gagal mengunggah gambar: ' + err.message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Gunakan Tanda Tangan Akun
  const handleUseAccountSignature = () => {
    if (defaultAccountSignature) {
      onSignatureChange(defaultAccountSignature);
      toast.success('Tanda tangan akun berhasil dimuat!');
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-bold text-foreground flex items-center gap-2">
          {title}
          {signatureUrl && (
            <span className="inline-flex items-center gap-1 text-[11px] font-normal text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" /> Siap Digunakan
            </span>
          )}
        </Label>

        {defaultAccountSignature && defaultAccountSignature !== signatureUrl && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleUseAccountSignature}
            className="text-xs text-primary hover:text-primary/90 h-7"
          >
            Gunakan TTD Akun Saya
          </Button>
        )}
      </div>

      <div className="border-2 border-dashed rounded-xl p-4 bg-muted/20 hover:bg-muted/30 transition-all flex flex-col items-center justify-center min-h-[170px]">
        {signatureUrl ? (
          <div className="flex flex-col items-center space-y-3 w-full">
            <div className="relative group p-2 bg-background rounded-lg border shadow-xs max-w-xs w-full flex items-center justify-center min-h-[110px]">
              <img
                src={signatureUrl}
                alt="Tanda Tangan"
                className="max-h-24 max-w-full object-contain filter drop-shadow-xs"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => downloadFile(signatureUrl, `TTD_${signerName.replace(/\s+/g, '_')}.png`)}
                className="absolute top-1 right-1 h-7 w-7 opacity-80 hover:opacity-100 bg-background/90"
                title="Unduh Tanda Tangan"
              >
                <Download className="w-3.5 h-3.5" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCanvasModalOpen(true)}
                disabled={isUploading}
                className="text-xs h-8 gap-1.5"
              >
                <Edit3 className="w-3.5 h-3.5" />
                Gores Ulang
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="text-xs h-8 gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                Ganti Berkas
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onSignatureChange(null)}
                className="text-xs h-8 text-destructive hover:text-destructive/90 hover:bg-destructive/10"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                Hapus
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center space-y-3 py-2">
            <p className="text-xs text-muted-foreground max-w-md">
              Silakan bubuhkan tanda tangan Anda untuk mengesahkan evaluasi ini. Anda dapat mengunggah gambar tanda tangan atau langsung menggores tanda tangan di layar.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="text-xs gap-1.5 font-medium"
              >
                <Upload className="w-4 h-4 text-primary" />
                Unggah Gambar (PNG/JPG)
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCanvasModalOpen(true)}
                disabled={isUploading}
                className="text-xs gap-1.5 font-medium"
              >
                <Edit3 className="w-4 h-4 text-primary" />
                Gores Digital di Layar
              </Button>

              {defaultAccountSignature && (
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={handleUseAccountSignature}
                  className="text-xs gap-1.5 font-medium"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Gunakan TTD Akun
                </Button>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground italic">
              Format disarankan berkas PNG transparan agar rapi pada lembar berita acara.
            </p>
          </div>
        )}
      </div>

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
      />

      {/* MODAL GORES TTD DI KANVAS */}
      <Dialog open={canvasModalOpen} onOpenChange={setCanvasModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Gores Tanda Tangan Digital</DialogTitle>
            <DialogDescription className="text-xs">
              Gunakan jari (pada layar sentuh HP/tablet) atau kursor mouse untuk membubuhkan tanda tangan Anda.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="border-2 rounded-lg bg-background overflow-hidden relative touch-none select-none">
              <canvas
                ref={canvasRef}
                width={420}
                height={180}
                className="w-full h-44 cursor-crosshair bg-slate-50 dark:bg-slate-900"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
              <span className="absolute bottom-1 right-2 text-[10px] text-muted-foreground/60 select-none pointer-events-none">
                Gores di dalam kotak ini
              </span>
            </div>

            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearCanvas}
                className="text-xs h-7 text-muted-foreground hover:text-foreground gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Bersihkan
              </Button>
              <span className="text-[11px] text-muted-foreground">
                {hasDrawn ? 'Tanda tangan terdeteksi' : 'Belum ada goresan'}
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setCanvasModalOpen(false)}>
              Batal
            </Button>
            <Button size="sm" onClick={handleSaveCanvas} disabled={!hasDrawn || isUploading}>
              Gunakan Tanda Tangan Ini
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
export default DigitalSignatureBox;
