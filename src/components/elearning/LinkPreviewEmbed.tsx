import { useState, useMemo } from 'react';
import { ExternalLink, FileText, Video, Music, Presentation, Eye, AlertCircle, Play, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface LinkPreviewEmbedProps {
  url: string;
  title?: string;
  className?: string;
  showPreviewButton?: boolean;
  showInlinePreview?: boolean;
}

type LinkType = 
  | 'google-doc' 
  | 'google-sheet' 
  | 'google-slide' 
  | 'google-drive' 
  | 'google-form'
  | 'youtube' 
  | 'vimeo'
  | 'dailymotion'
  | 'spotify'
  | 'soundcloud'
  | 'pdf' 
  | 'video' 
  | 'audio' 
  | 'image'
  | 'iframe-embed' 
  | 'external';

interface LinkInfo {
  type: LinkType;
  embedUrl: string | null;
  icon: React.ReactNode;
  label: string;
  category: 'document' | 'video' | 'audio' | 'image' | 'external';
  canEmbed: boolean;
}

// Parse and transform URLs for embedding
function parseLinkInfo(url: string): LinkInfo {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    const pathname = urlObj.pathname.toLowerCase();
    const originalPathname = urlObj.pathname;

    // Google Docs
    if (hostname.includes('docs.google.com') && pathname.includes('/document/')) {
      const docId = originalPathname.match(/\/d\/([a-zA-Z0-9_-]+)/)?.[1];
      return {
        type: 'google-doc',
        embedUrl: docId ? `https://docs.google.com/document/d/${docId}/preview` : null,
        icon: <FileText className="h-4 w-4" />,
        label: 'Google Docs',
        category: 'document',
        canEmbed: !!docId,
      };
    }

    // Google Sheets
    if (hostname.includes('docs.google.com') && pathname.includes('/spreadsheets/')) {
      const sheetId = originalPathname.match(/\/d\/([a-zA-Z0-9_-]+)/)?.[1];
      return {
        type: 'google-sheet',
        embedUrl: sheetId ? `https://docs.google.com/spreadsheets/d/${sheetId}/preview` : null,
        icon: <FileText className="h-4 w-4" />,
        label: 'Google Sheets',
        category: 'document',
        canEmbed: !!sheetId,
      };
    }

    // Google Slides
    if (hostname.includes('docs.google.com') && pathname.includes('/presentation/')) {
      const slideId = originalPathname.match(/\/d\/([a-zA-Z0-9_-]+)/)?.[1];
      return {
        type: 'google-slide',
        embedUrl: slideId ? `https://docs.google.com/presentation/d/${slideId}/embed?start=false&loop=false&delayms=3000` : null,
        icon: <Presentation className="h-4 w-4" />,
        label: 'Google Slides',
        category: 'document',
        canEmbed: !!slideId,
      };
    }

    // Google Forms
    if (hostname.includes('docs.google.com') && pathname.includes('/forms/')) {
      const formId = originalPathname.match(/\/d\/([a-zA-Z0-9_-]+)/)?.[1] || 
                     originalPathname.match(/\/e\/([a-zA-Z0-9_-]+)/)?.[1];
      return {
        type: 'google-form',
        embedUrl: formId ? `https://docs.google.com/forms/d/e/${formId}/viewform?embedded=true` : url,
        icon: <FileText className="h-4 w-4" />,
        label: 'Google Forms',
        category: 'document',
        canEmbed: true,
      };
    }

    // Google Drive (generic file)
    if (hostname.includes('drive.google.com')) {
      const fileId = originalPathname.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)?.[1] 
        || urlObj.searchParams.get('id')
        || originalPathname.match(/\/d\/([a-zA-Z0-9_-]+)/)?.[1];
      return {
        type: 'google-drive',
        embedUrl: fileId ? `https://drive.google.com/file/d/${fileId}/preview` : null,
        icon: <FileText className="h-4 w-4" />,
        label: 'Google Drive',
        category: 'document',
        canEmbed: !!fileId,
      };
    }

    // YouTube
    if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
      let videoId: string | null = null;
      if (hostname.includes('youtu.be')) {
        videoId = originalPathname.slice(1).split('?')[0];
      } else if (pathname.includes('/shorts/')) {
        videoId = originalPathname.match(/\/shorts\/([a-zA-Z0-9_-]+)/)?.[1] || null;
      } else {
        videoId = urlObj.searchParams.get('v');
      }
      return {
        type: 'youtube',
        embedUrl: videoId ? `https://www.youtube.com/embed/${videoId}` : null,
        icon: <Video className="h-4 w-4" />,
        label: 'YouTube',
        category: 'video',
        canEmbed: !!videoId,
      };
    }

    // Vimeo
    if (hostname.includes('vimeo.com')) {
      const vimeoId = originalPathname.match(/\/(\d+)/)?.[1];
      return {
        type: 'vimeo',
        embedUrl: vimeoId ? `https://player.vimeo.com/video/${vimeoId}` : null,
        icon: <Video className="h-4 w-4" />,
        label: 'Vimeo',
        category: 'video',
        canEmbed: !!vimeoId,
      };
    }

    // Dailymotion
    if (hostname.includes('dailymotion.com') || hostname.includes('dai.ly')) {
      let dmId: string | null = null;
      if (hostname.includes('dai.ly')) {
        dmId = originalPathname.slice(1);
      } else {
        dmId = originalPathname.match(/\/video\/([a-zA-Z0-9]+)/)?.[1];
      }
      return {
        type: 'dailymotion',
        embedUrl: dmId ? `https://www.dailymotion.com/embed/video/${dmId}` : null,
        icon: <Video className="h-4 w-4" />,
        label: 'Dailymotion',
        category: 'video',
        canEmbed: !!dmId,
      };
    }

    // Spotify
    if (hostname.includes('spotify.com')) {
      const spotifyPath = originalPathname.replace(/^\//, '');
      return {
        type: 'spotify',
        embedUrl: `https://open.spotify.com/embed/${spotifyPath}`,
        icon: <Music className="h-4 w-4" />,
        label: 'Spotify',
        category: 'audio',
        canEmbed: true,
      };
    }

    // SoundCloud
    if (hostname.includes('soundcloud.com')) {
      return {
        type: 'soundcloud',
        embedUrl: `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true`,
        icon: <Music className="h-4 w-4" />,
        label: 'SoundCloud',
        category: 'audio',
        canEmbed: true,
      };
    }

    // Direct PDF link
    if (pathname.endsWith('.pdf')) {
      return {
        type: 'pdf',
        embedUrl: url,
        icon: <FileText className="h-4 w-4" />,
        label: 'PDF',
        category: 'document',
        canEmbed: true,
      };
    }

    // Direct video links
    if (/\.(mp4|webm|ogg|mov|avi|mkv)$/i.test(pathname)) {
      return {
        type: 'video',
        embedUrl: url,
        icon: <Video className="h-4 w-4" />,
        label: 'Video',
        category: 'video',
        canEmbed: true,
      };
    }

    // Direct audio links
    if (/\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(pathname)) {
      return {
        type: 'audio',
        embedUrl: url,
        icon: <Music className="h-4 w-4" />,
        label: 'Audio',
        category: 'audio',
        canEmbed: true,
      };
    }

    // Direct image links
    if (/\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(pathname)) {
      return {
        type: 'image',
        embedUrl: url,
        icon: <ImageIcon className="h-4 w-4" />,
        label: 'Gambar',
        category: 'image',
        canEmbed: true,
      };
    }

    // Canva
    if (hostname.includes('canva.com')) {
      return {
        type: 'iframe-embed',
        embedUrl: url.replace('/view', '/embed'),
        icon: <Presentation className="h-4 w-4" />,
        label: 'Canva',
        category: 'document',
        canEmbed: true,
      };
    }

    // Figma
    if (hostname.includes('figma.com')) {
      return {
        type: 'iframe-embed',
        embedUrl: `https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(url)}`,
        icon: <Presentation className="h-4 w-4" />,
        label: 'Figma',
        category: 'document',
        canEmbed: true,
      };
    }

    // Loom
    if (hostname.includes('loom.com')) {
      const loomId = originalPathname.match(/\/share\/([a-zA-Z0-9]+)/)?.[1];
      return {
        type: 'iframe-embed',
        embedUrl: loomId ? `https://www.loom.com/embed/${loomId}` : null,
        icon: <Video className="h-4 w-4" />,
        label: 'Loom',
        category: 'video',
        canEmbed: !!loomId,
      };
    }

    // Default: external link
    return {
      type: 'external',
      embedUrl: null,
      icon: <ExternalLink className="h-4 w-4" />,
      label: 'Link Eksternal',
      category: 'external',
      canEmbed: false,
    };
  } catch {
    return {
      type: 'external',
      embedUrl: null,
      icon: <AlertCircle className="h-4 w-4" />,
      label: 'Link Invalid',
      category: 'external',
      canEmbed: false,
    };
  }
}

// Get category color for badge
function getCategoryColor(category: LinkInfo['category']): "default" | "secondary" | "destructive" | "outline" {
  switch (category) {
    case 'document': return 'default';
    case 'video': return 'destructive';
    case 'audio': return 'secondary';
    case 'image': return 'outline';
    default: return 'secondary';
  }
}

// Render the embed content based on link type
function renderEmbedContent(linkInfo: LinkInfo, url: string, height: string = '70vh') {
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

  switch (linkInfo.category) {
    case 'video':
      if (linkInfo.type === 'video') {
        // Direct video file
        return (
          <video controls className={`w-full max-h-[${height}] rounded-lg bg-black`}>
            <source src={linkInfo.embedUrl} />
            Browser Anda tidak mendukung video tag.
          </video>
        );
      }
      // Embedded video (YouTube, Vimeo, etc.)
      return (
        <div className="relative w-full pt-[56.25%] bg-black rounded-lg overflow-hidden">
          <iframe
            src={linkInfo.embedUrl}
            className="absolute inset-0 w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      );

    case 'audio':
      if (linkInfo.type === 'audio') {
        // Direct audio file
        return (
          <div className="flex flex-col items-center py-8 px-4 bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg">
            <div className="relative mb-6">
              <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center">
                <Music className="h-12 w-12 text-primary" />
              </div>
              <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                <Play className="h-4 w-4 text-primary-foreground" />
              </div>
            </div>
            <audio controls className="w-full max-w-md">
              <source src={linkInfo.embedUrl} />
              Browser Anda tidak mendukung audio tag.
            </audio>
          </div>
        );
      }
      // Embedded audio (Spotify, SoundCloud)
      return (
        <iframe
          src={linkInfo.embedUrl}
          className="w-full h-[152px] border-0 rounded-lg"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        />
      );

    case 'image':
      return (
        <div className="flex justify-center p-4 bg-muted/30 rounded-lg">
          <img 
            src={linkInfo.embedUrl} 
            alt="Preview" 
            className={`max-w-full max-h-[${height}] object-contain rounded-lg`}
          />
        </div>
      );

    case 'document':
    default:
      return (
        <iframe
          src={linkInfo.embedUrl}
          className={`w-full h-[${height}] border-0 rounded-lg`}
          style={{ height }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      );
  }
}

export function LinkPreviewEmbed({ 
  url, 
  title, 
  className, 
  showPreviewButton = true,
  showInlinePreview = false 
}: LinkPreviewEmbedProps) {
  const [showDialog, setShowDialog] = useState(false);
  const linkInfo = useMemo(() => parseLinkInfo(url), [url]);

  return (
    <div className={className}>
      <Card className="overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className={`p-2 rounded-lg shrink-0 ${
                linkInfo.category === 'video' ? 'bg-red-500/10 text-red-500' :
                linkInfo.category === 'audio' ? 'bg-green-500/10 text-green-500' :
                linkInfo.category === 'image' ? 'bg-blue-500/10 text-blue-500' :
                'bg-primary/10 text-primary'
              }`}>
                {linkInfo.icon}
              </div>
              <div className="min-w-0 flex-1">
                {title && <p className="font-medium truncate">{title}</p>}
                <p className="text-sm text-muted-foreground truncate">{url}</p>
              </div>
              <Badge variant={getCategoryColor(linkInfo.category)} className="shrink-0">
                {linkInfo.label}
              </Badge>
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
                        {title || `Preview ${linkInfo.label}`}
                      </DialogTitle>
                    </DialogHeader>
                    {renderEmbedContent(linkInfo, url, '70vh')}
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

          {/* Inline preview */}
          {showInlinePreview && linkInfo.canEmbed && (
            <div className="mt-4 border-t pt-4">
              {renderEmbedContent(linkInfo, url, '400px')}
            </div>
          )}
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

  return (
    <div className="rounded-lg overflow-hidden border">
      {renderEmbedContent(linkInfo, url, '500px')}
    </div>
  );
}

// Export utility for external use
export { parseLinkInfo, type LinkInfo, type LinkType };
