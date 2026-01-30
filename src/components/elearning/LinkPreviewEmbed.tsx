import { useState, useMemo } from 'react';
import { ExternalLink, FileText, Video, Music, Presentation, Eye, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface LinkPreviewEmbedProps {
  url: string;
  title?: string;
  className?: string;
  showPreviewButton?: boolean;
}

type LinkType = 'google-doc' | 'google-sheet' | 'google-slide' | 'google-drive' | 'youtube' | 'pdf' | 'video' | 'audio' | 'iframe-embed' | 'external';

interface LinkInfo {
  type: LinkType;
  embedUrl: string | null;
  icon: React.ReactNode;
  label: string;
  canEmbed: boolean;
}

// Parse and transform URLs for embedding
function parseLinkInfo(url: string): LinkInfo {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    const pathname = urlObj.pathname;

    // Google Docs
    if (hostname.includes('docs.google.com') && pathname.includes('/document/')) {
      const docId = pathname.match(/\/d\/([a-zA-Z0-9_-]+)/)?.[1];
      return {
        type: 'google-doc',
        embedUrl: docId ? `https://docs.google.com/document/d/${docId}/preview` : null,
        icon: <FileText className="h-4 w-4" />,
        label: 'Google Docs',
        canEmbed: !!docId,
      };
    }

    // Google Sheets
    if (hostname.includes('docs.google.com') && pathname.includes('/spreadsheets/')) {
      const sheetId = pathname.match(/\/d\/([a-zA-Z0-9_-]+)/)?.[1];
      return {
        type: 'google-sheet',
        embedUrl: sheetId ? `https://docs.google.com/spreadsheets/d/${sheetId}/preview` : null,
        icon: <FileText className="h-4 w-4" />,
        label: 'Google Sheets',
        canEmbed: !!sheetId,
      };
    }

    // Google Slides
    if (hostname.includes('docs.google.com') && pathname.includes('/presentation/')) {
      const slideId = pathname.match(/\/d\/([a-zA-Z0-9_-]+)/)?.[1];
      return {
        type: 'google-slide',
        embedUrl: slideId ? `https://docs.google.com/presentation/d/${slideId}/embed?start=false&loop=false&delayms=3000` : null,
        icon: <Presentation className="h-4 w-4" />,
        label: 'Google Slides',
        canEmbed: !!slideId,
      };
    }

    // Google Drive (generic file)
    if (hostname.includes('drive.google.com')) {
      const fileId = pathname.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)?.[1] 
        || urlObj.searchParams.get('id')
        || pathname.match(/\/d\/([a-zA-Z0-9_-]+)/)?.[1];
      return {
        type: 'google-drive',
        embedUrl: fileId ? `https://drive.google.com/file/d/${fileId}/preview` : null,
        icon: <FileText className="h-4 w-4" />,
        label: 'Google Drive',
        canEmbed: !!fileId,
      };
    }

    // YouTube
    if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
      let videoId: string | null = null;
      if (hostname.includes('youtu.be')) {
        videoId = pathname.slice(1).split('?')[0];
      } else {
        videoId = urlObj.searchParams.get('v');
      }
      return {
        type: 'youtube',
        embedUrl: videoId ? `https://www.youtube.com/embed/${videoId}` : null,
        icon: <Video className="h-4 w-4" />,
        label: 'YouTube',
        canEmbed: !!videoId,
      };
    }

    // Direct PDF link
    if (pathname.toLowerCase().endsWith('.pdf')) {
      return {
        type: 'pdf',
        embedUrl: url,
        icon: <FileText className="h-4 w-4" />,
        label: 'PDF',
        canEmbed: true,
      };
    }

    // Direct video links
    if (/\.(mp4|webm|ogg)$/i.test(pathname)) {
      return {
        type: 'video',
        embedUrl: url,
        icon: <Video className="h-4 w-4" />,
        label: 'Video',
        canEmbed: true,
      };
    }

    // Direct audio links
    if (/\.(mp3|wav|ogg|m4a)$/i.test(pathname)) {
      return {
        type: 'audio',
        embedUrl: url,
        icon: <Music className="h-4 w-4" />,
        label: 'Audio',
        canEmbed: true,
      };
    }

    // Vimeo
    if (hostname.includes('vimeo.com')) {
      const vimeoId = pathname.match(/\/(\d+)/)?.[1];
      return {
        type: 'iframe-embed',
        embedUrl: vimeoId ? `https://player.vimeo.com/video/${vimeoId}` : null,
        icon: <Video className="h-4 w-4" />,
        label: 'Vimeo',
        canEmbed: !!vimeoId,
      };
    }

    // Canva
    if (hostname.includes('canva.com')) {
      return {
        type: 'iframe-embed',
        embedUrl: url.replace('/view', '/embed'),
        icon: <Presentation className="h-4 w-4" />,
        label: 'Canva',
        canEmbed: true,
      };
    }

    // Default: external link
    return {
      type: 'external',
      embedUrl: null,
      icon: <ExternalLink className="h-4 w-4" />,
      label: 'Link Eksternal',
      canEmbed: false,
    };
  } catch {
    return {
      type: 'external',
      embedUrl: null,
      icon: <AlertCircle className="h-4 w-4" />,
      label: 'Link Invalid',
      canEmbed: false,
    };
  }
}

export function LinkPreviewEmbed({ url, title, className, showPreviewButton = true }: LinkPreviewEmbedProps) {
  const [showDialog, setShowDialog] = useState(false);
  const linkInfo = useMemo(() => parseLinkInfo(url), [url]);

  const renderEmbed = () => {
    if (!linkInfo.embedUrl) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <AlertCircle className="h-12 w-12 mb-4" />
          <p className="text-center">Preview tidak tersedia untuk link ini</p>
          <Button variant="outline" className="mt-4 gap-2" asChild>
            <a href={url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
              Buka di Tab Baru
            </a>
          </Button>
        </div>
      );
    }

    switch (linkInfo.type) {
      case 'video':
        return (
          <video controls className="w-full max-h-[70vh] rounded-lg">
            <source src={linkInfo.embedUrl} />
            Browser Anda tidak mendukung video tag.
          </video>
        );
      case 'audio':
        return (
          <div className="flex flex-col items-center py-8">
            <Music className="h-16 w-16 text-primary mb-4" />
            <audio controls className="w-full max-w-md">
              <source src={linkInfo.embedUrl} />
              Browser Anda tidak mendukung audio tag.
            </audio>
          </div>
        );
      case 'pdf':
      case 'google-doc':
      case 'google-sheet':
      case 'google-slide':
      case 'google-drive':
      case 'youtube':
      case 'iframe-embed':
      default:
        return (
          <iframe
            src={linkInfo.embedUrl}
            className="w-full h-[70vh] border-0 rounded-lg"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        );
    }
  };

  return (
    <div className={className}>
      <Card className="overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                {linkInfo.icon}
              </div>
              <div className="min-w-0 flex-1">
                {title && <p className="font-medium truncate">{title}</p>}
                <p className="text-sm text-muted-foreground truncate">{url}</p>
              </div>
              <Badge variant="secondary" className="shrink-0">{linkInfo.label}</Badge>
            </div>
            
            <div className="flex items-center gap-2 shrink-0">
              {showPreviewButton && linkInfo.canEmbed && (
                <Dialog open={showDialog} onOpenChange={setShowDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1.5">
                      <Eye className="h-4 w-4" />
                      Preview
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-5xl w-[95vw] max-h-[90vh]">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        {linkInfo.icon}
                        {title || 'Preview Dokumen'}
                      </DialogTitle>
                    </DialogHeader>
                    {renderEmbed()}
                  </DialogContent>
                </Dialog>
              )}
              <Button variant="ghost" size="sm" className="gap-1.5" asChild>
                <a href={url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Inline preview component (for grading view)
export function LinkPreviewInline({ url }: { url: string }) {
  const linkInfo = useMemo(() => parseLinkInfo(url), [url]);

  if (!linkInfo.canEmbed || !linkInfo.embedUrl) {
    return (
      <div className="border rounded-lg p-8 bg-muted/30">
        <div className="flex flex-col items-center justify-center text-muted-foreground">
          <AlertCircle className="h-12 w-12 mb-4" />
          <p className="text-center mb-4">Preview tidak tersedia. Buka link secara manual.</p>
          <Button variant="outline" className="gap-2" asChild>
            <a href={url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
              Buka Link
            </a>
          </Button>
        </div>
      </div>
    );
  }

  switch (linkInfo.type) {
    case 'video':
      return (
        <video controls className="w-full rounded-lg border">
          <source src={linkInfo.embedUrl} />
        </video>
      );
    case 'audio':
      return (
        <div className="border rounded-lg p-6 bg-muted/30">
          <div className="flex items-center gap-4">
            <Music className="h-10 w-10 text-primary" />
            <audio controls className="flex-1">
              <source src={linkInfo.embedUrl} />
            </audio>
          </div>
        </div>
      );
    default:
      return (
        <iframe
          src={linkInfo.embedUrl}
          className="w-full h-[500px] border rounded-lg"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      );
  }
}
