import { toast } from 'sonner';

/**
 * Mengunduh file gambar (PNG, JPG, dll.) langsung ke perangkat pengguna.
 * Menggunakan fetch + blob agar browser tidak hanya membuka gambar di tab baru (akibat cross-origin URL).
 */
export async function downloadFile(url: string, filename: string): Promise<boolean> {
  if (!url) {
    toast.error('URL berkas tidak ditemukan.');
    return false;
  }

  const toastId = toast.loading(`Menyiapkan unduhan ${filename}...`);
  try {
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Bersihkan URL object dari memori browser
    setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
    toast.success(`Berhasil mengunduh ${filename}`, { id: toastId });
    return true;
  } catch (error: any) {
    console.warn('Direct fetch download failed, falling back to direct anchor download:', error);
    try {
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`Mengunduh ${filename}`, { id: toastId });
      return true;
    } catch (err: any) {
      toast.error(`Gagal mengunduh berkas: ${err.message}`, { id: toastId });
      return false;
    }
  }
}
