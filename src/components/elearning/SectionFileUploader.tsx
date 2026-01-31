import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Upload, X, FileText, Image, File, Loader2, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SectionFile {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
}

interface SectionFileUploaderProps {
  files: SectionFile[];
  onChange: (files: SectionFile[]) => void;
  sectionId: string;
}

export function SectionFileUploader({ files, onChange, sectionId }: SectionFileUploaderProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="h-4 w-4 text-blue-500" />;
    if (type.includes('pdf')) return <FileText className="h-4 w-4 text-red-500" />;
    return <File className="h-4 w-4 text-muted-foreground" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    setUploading(true);
    setUploadProgress(0);

    const newFiles: SectionFile[] = [];
    const totalFiles = selectedFiles.length;

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${sectionId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { data, error } = await supabase.storage
          .from('material-files')
          .upload(fileName, file);

        if (error) throw error;

        const { data: urlData } = supabase.storage
          .from('material-files')
          .getPublicUrl(fileName);

        newFiles.push({
          id: `file_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          name: file.name,
          url: urlData.publicUrl,
          type: file.type,
          size: file.size,
        });

        setUploadProgress(((i + 1) / totalFiles) * 100);
      }

      onChange([...files, ...newFiles]);
      toast({ title: 'Sukses', description: `${newFiles.length} file berhasil diupload` });
    } catch (error: any) {
      toast({ 
        title: 'Error', 
        description: error.message || 'Gagal mengupload file', 
        variant: 'destructive' 
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeFile = async (fileId: string) => {
    const fileToRemove = files.find(f => f.id === fileId);
    if (fileToRemove) {
      // Extract path from URL for deletion
      try {
        const urlParts = fileToRemove.url.split('/material-files/');
        if (urlParts[1]) {
          await supabase.storage.from('material-files').remove([urlParts[1]]);
        }
      } catch (error) {
        console.error('Failed to delete file from storage:', error);
      }
    }
    onChange(files.filter(f => f.id !== fileId));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          accept="*/*"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="gap-2"
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          Upload File Sumber
        </Button>
        {files.length > 0 && (
          <Badge variant="secondary">{files.length} file</Badge>
        )}
      </div>

      {uploading && (
        <div className="space-y-1">
          <Progress value={uploadProgress} className="h-2" />
          <p className="text-xs text-muted-foreground">
            Mengupload... {Math.round(uploadProgress)}%
          </p>
        </div>
      )}

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file) => (
            <Card key={file.id} className="p-3">
              <div className="flex items-center gap-3">
                {getFileIcon(file.type)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(file.size)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => window.open(file.url, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => removeFile(file.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
