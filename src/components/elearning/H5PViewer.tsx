import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ExternalLink, AlertCircle } from 'lucide-react';

interface H5PViewerProps {
  embedUrl: string;
  title?: string;
}

export function H5PViewer({ embedUrl, title }: H5PViewerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Clean and validate the embed URL
  const getCleanEmbedUrl = (url: string): string => {
    // Handle h5p.org embed URLs
    if (url.includes('h5p.org')) {
      // Convert share URLs to embed URLs
      if (url.includes('/content/')) {
        const contentId = url.match(/\/content\/(\d+)/)?.[1];
        if (contentId) {
          return `https://h5p.org/h5p/embed/${contentId}`;
        }
      }
      // Already an embed URL
      if (url.includes('/h5p/embed/')) {
        return url;
      }
    }
    
    // Handle Lumi URLs
    if (url.includes('lumi.education')) {
      return url;
    }

    // Handle other H5P hosting services
    return url;
  };

  const embedSrc = getCleanEmbedUrl(embedUrl);

  useEffect(() => {
    // Validate the URL is a proper H5P embed
    if (!embedUrl) {
      setError('URL embed H5P tidak tersedia');
      return;
    }
    setError(null);
  }, [embedUrl]);

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="relative bg-muted">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted z-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          )}
          <iframe
            src={embedSrc}
            title={title || 'H5P Content'}
            className="w-full min-h-[500px] border-0"
            allowFullScreen
            allow="geolocation *; microphone *; camera *; autoplay *"
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false);
              setError('Gagal memuat konten H5P');
            }}
          />
        </div>
        <div className="p-3 border-t bg-muted/30 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Konten H5P Interaktif
          </p>
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2"
            onClick={() => window.open(embedUrl, '_blank')}
          >
            <ExternalLink className="h-4 w-4" />
            Buka di Tab Baru
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
